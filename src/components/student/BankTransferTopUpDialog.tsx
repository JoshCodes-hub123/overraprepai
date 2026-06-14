import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, Upload, Banknote, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const NAIRA_PER_TOKEN = 50;
const MIN_NAIRA = 250;

const BANK = {
  name: "Opay",
  account: "9012345678",
  holder: "OverraPrep AI",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted?: () => void;
}

/**
 * Bank-transfer top-up — zero card fees, works reliably on bad networks
 * (no hosted checkout page to load). Creates a `payment_requests` row
 * with `plan_id = 'wallet_topup'` for admin to credit manually.
 */
export function BankTransferTopUpDialog({ open, onOpenChange, onSubmitted }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>("500");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const naira = Math.max(0, Math.floor(Number(amount) / NAIRA_PER_TOKEN) * NAIRA_PER_TOKEN);
  const tokens = naira / NAIRA_PER_TOKEN;
  const valid = naira >= MIN_NAIRA;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy — long-press to copy manually");
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error("Please sign in first");
      return;
    }
    if (!valid) {
      toast.error(`Minimum top-up is ₦${MIN_NAIRA}`);
      return;
    }
    if (!reference.trim() && !file) {
      toast.error("Add the transfer reference OR upload your receipt");
      return;
    }
    setBusy(true);
    try {
      let proofPath: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Receipt must be under 5MB");
        const ext = (file.name.split(".").pop() || "bin").toLowerCase();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        proofPath = path;
      }
      const { error } = await (supabase as any).from("payment_requests").insert({
        user_id: user.id,
        plan_id: "wallet_topup",
        amount_cents: naira * 100,
        currency: "NGN",
        reference: reference.trim() || null,
        proof_path: proofPath,
        admin_note: `Wallet top-up · ${tokens} tokens · ₦${naira}`,
      });
      if (error) throw new Error(error.message);
      toast.success("Submitted — we'll credit your wallet within 24h ✓", { duration: 4500 });
      onSubmitted?.();
      onOpenChange(false);
      setReference(""); setFile(null); setAmount("500");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Pay by bank transfer
          </DialogTitle>
          <DialogDescription>
            Cheaper, faster on slow networks. Transfer to the account below, then submit the reference.
          </DialogDescription>
        </DialogHeader>

        {/* Bank details */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800">Send to</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-900">Bank</span>
            <span className="font-bold text-emerald-900">{BANK.name}</span>
          </div>
          <button
            type="button"
            onClick={() => copy(BANK.account, "Account number")}
            className="w-full flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-emerald-200 hover:border-emerald-400 transition"
          >
            <span className="text-xs text-emerald-700">Account #</span>
            <span className="font-mono font-extrabold text-emerald-900 flex items-center gap-2">
              {BANK.account}
              <Copy className="h-3.5 w-3.5" />
            </span>
          </button>
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-900">Account name</span>
            <span className="font-bold text-emerald-900">{BANK.holder}</span>
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">How much did you send? (₦)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_NAIRA}
              step={NAIRA_PER_TOKEN}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {valid ? (
                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> You'll get {tokens} tokens
                </span>
              ) : (
                <>Minimum ₦{MIN_NAIRA} · rounded down to nearest ₦{NAIRA_PER_TOKEN}</>
              )}
            </p>
          </div>

          <div>
            <Label className="text-xs">Transfer reference / narration</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. last 6 digits of your account, or 'OVR-Jude'"
              maxLength={120}
            />
          </div>

          <div>
            <Label className="text-xs">Receipt screenshot (recommended)</Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">Speeds up review · max 5MB</p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={busy || !valid || (!reference.trim() && !file)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</> : <><Upload className="h-4 w-4 mr-1.5" /> Submit transfer</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BankTransferTopUpDialog;
