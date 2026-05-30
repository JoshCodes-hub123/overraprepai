import { AnimatePresence, motion } from "framer-motion";
import { Wallet, X, Zap, Loader2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SoftPaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plain-English reason ("Your wallet is empty…"). */
  reason?: string;
  /** Optional verb-led label ("Unlock AI summary"). */
  action?: string;
}

const TOP_UPS = [
  { naira: 250, tokens: 5, badge: "Starter" },
  { naira: 500, tokens: 10 },
  { naira: 1000, tokens: 20, badge: "Popular" },
  { naira: 2000, tokens: 40 },
  { naira: 5000, tokens: 100, badge: "Best value" },
];

function useResetCountdown() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Africa/Lagos = UTC+1, no DST. Build "now in Lagos" as a UTC-shifted clone.
      const lagos = new Date(now.getTime() + (60 - now.getTimezoneOffset()) * 60_000);
      const tomorrow = new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate() + 1));
      const ms = tomorrow.getTime() - lagos.getTime();
      const h = Math.max(0, Math.floor(ms / 3_600_000));
      const m = Math.max(0, Math.floor((ms % 3_600_000) / 60_000));
      setLabel(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

/**
 * Wallet top-up paywall. Shown when:
 *  - A student's wallet hits 0 mid-action, or
 *  - A premium feature requires a token spend.
 *
 * Pure prepaid: pick an amount, get tokens credited via Flutterwave webhook.
 */
export function SoftPaywallSheet({ open, onOpenChange, reason, action }: SoftPaywallSheetProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<number | "custom" | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const resetIn = useResetCountdown();

  const heading = action ? `Spend 1 token to unlock ${action}` : "Out of free actions";
  const body = reason || "You've used today's 3 free AI actions and your wallet is empty. Top up to keep going, or come back tomorrow when free actions reset.";

  const startTopUp = async (amountNaira: number) => {
    if (amountNaira < 250) {
      toast.error("Minimum top-up is ₦250 (5 tokens)");
      return;
    }
    setBusy(amountNaira === Number(customAmount) ? "custom" : amountNaira);
    try {
      const { data, error } = await supabase.functions.invoke("flutterwave-init", {
        body: {
          amount_naira: amountNaira,
          redirect_url: `${window.location.origin}/wallet`,
        },
      });
      if (error) throw error;
      const url = (data as any)?.checkout_url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not start checkout. Try again.");
      setBusy(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          role="dialog" aria-modal="true" aria-label="Top up wallet"
        >
          <motion.div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-100 overflow-hidden max-h-[90vh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />

            <button
              type="button" onClick={() => onOpenChange(false)} aria-label="Close"
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/80 border border-amber-100 hover:bg-amber-50 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-amber-700" />
            </button>

            <div className="px-6 pt-7 pb-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
                <Wallet className="h-7 w-7 text-amber-700" strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-tight text-foreground text-center">
                {heading}
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-snug text-center">{body}</p>

              <p className="mt-5 text-[11px] uppercase tracking-wide font-semibold text-amber-700">
                Top up your wallet
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {TOP_UPS.map((t) => (
                  <button
                    key={t.naira}
                    onClick={() => startTopUp(t.naira)}
                    disabled={busy !== null}
                    className="relative text-left rounded-2xl border border-amber-100 hover:border-amber-300 bg-amber-50/40 hover:bg-amber-50 p-3 transition-colors disabled:opacity-60"
                  >
                    {t.badge && (
                      <span className="absolute -top-2 right-2 text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white px-1.5 py-0.5 rounded">
                        {t.badge}
                      </span>
                    )}
                    <p className="font-display text-base font-extrabold text-amber-900">
                      ₦{t.naira.toLocaleString()}
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {t.tokens} tokens
                    </p>
                    {busy === t.naira && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700 absolute bottom-2 right-2" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={250}
                  placeholder="Custom amount (₦250+)"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="h-10 text-sm"
                />
                <Button
                  onClick={() => startTopUp(Number(customAmount))}
                  disabled={busy !== null || !customAmount || Number(customAmount) < 250}
                  className="h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {busy === "custom" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Top up"}
                </Button>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground text-center">
                1 token = ₦50 = 1 AI action · 3 free actions reset every day.
              </p>

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-4 w-full h-11 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-[13px] font-semibold text-amber-800 inline-flex items-center justify-center gap-2 transition"
              >
                <Clock className="h-4 w-4" />
                Come back tomorrow · resets in {resetIn}
              </button>

              <button
                type="button"
                onClick={() => { onOpenChange(false); navigate("/wallet"); }}
                className="mt-2 w-full h-9 text-[12px] text-amber-700 hover:text-amber-900 font-semibold"
              >
                Open full wallet →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SoftPaywallSheet;
