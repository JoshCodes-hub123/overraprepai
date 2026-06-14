import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onVerified?: () => void;
}

/**
 * Self-serve "I paid but didn't get my tokens" recovery.
 * Re-runs `flutterwave-verify` with whatever reference the student has
 * from their Flutterwave email/SMS, so a missed webhook still credits.
 */
export function VerifyPaymentDialog({ open, onOpenChange, onVerified }: Props) {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);

  const handleVerify = async () => {
    const v = ref.trim();
    if (!v) {
      toast.error("Enter the reference or transaction ID from your payment receipt.");
      return;
    }
    setBusy(true);
    try {
      // Numeric → Flutterwave transaction_id, anything else → our tx_ref
      const isNumeric = /^\d+$/.test(v);
      const body = isNumeric ? { transaction_id: v } : { tx_ref: v };
      const { data, error } = await supabase.functions.invoke("flutterwave-verify", { body });
      if (error) throw error;
      const d = data as any;
      if (d?.ok) {
        if (d.idempotent) toast.success("Payment already credited ✓");
        else toast.success(`Top-up successful · +${d.tokens} tokens`);
        onVerified?.();
        onOpenChange(false);
        setRef("");
      } else if (d?.status === "pending") {
        toast.message("Payment still processing — try again in a minute.");
      } else {
        toast.error(d?.message || "We couldn't verify that reference. Double-check and try again.");
      }
    } catch (e: any) {
      console.error("verify error", e);
      toast.error("Verification failed. If money was deducted, email support@overraprepai.com with your receipt.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
            Verify a payment
          </DialogTitle>
          <DialogDescription>
            Paid but tokens didn't land yet? Paste the reference from your Flutterwave email/SMS — usually
            starts with <code className="font-mono text-[11px]">wallet_</code> — or the numeric transaction ID.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div>
            <Label className="text-xs">Reference or transaction ID</Label>
            <Input
              autoFocus
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="e.g. wallet_a1b2c3d4_17... or 8123456"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !busy) handleVerify();
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            We only credit your wallet once per reference — safe to retry.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button
            onClick={handleVerify}
            disabled={busy || !ref.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Verifying…</> : "Verify payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default VerifyPaymentDialog;
