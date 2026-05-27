import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuyTokensDialog } from "@/components/student/BuyTokensDialog";
import { useTokenBalance } from "@/hooks/useTokenBalance";

interface SoftPaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tokens this action costs. */
  required: number;
  /** Short verb-led label e.g. "Generate AI summary" or "Unlock pack". */
  action: string;
  /** Optional one-line note about why this costs tokens. */
  reason?: string;
}

/**
 * Calm, gold-toned paywall sheet. Shown only when a user attempts an action
 * they can't currently afford. Never blocks free actions.
 *
 * UX: slides up from bottom on mobile, centers on desktop. Single primary
 * CTA opens BuyTokensDialog. Dismiss is always available.
 */
export function SoftPaywallSheet({
  open,
  onOpenChange,
  required,
  action,
  reason,
}: SoftPaywallSheetProps) {
  const { balance } = useTokenBalance();
  const [buyOpen, setBuyOpen] = useState(false);
  const short = Math.max(0, required - balance);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Tokens needed"
          >
            <motion.div
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gold accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/80 border border-amber-100 hover:bg-amber-50 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-amber-700" />
              </button>

              <div className="px-6 pt-7 pb-6 text-center">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
                  <Coins className="h-7 w-7 text-amber-700" strokeWidth={2.2} />
                </div>
                <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-tight text-foreground">
                  {action} needs <span className="text-amber-700">{required.toLocaleString()}</span> {required === 1 ? "token" : "tokens"}
                </h2>
                {reason && (
                  <p className="mt-1.5 text-[13px] text-muted-foreground leading-snug">{reason}</p>
                )}

                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-[11px] uppercase tracking-wide text-amber-700/80 font-semibold">Your balance</p>
                    <p className="font-display text-lg font-extrabold text-amber-900">{balance.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-amber-700/80 font-semibold">Still need</p>
                    <p className="font-display text-lg font-extrabold text-amber-900">{short.toLocaleString()}</p>
                  </div>
                </div>

                <Button
                  onClick={() => setBuyOpen(true)}
                  className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-[0_8px_24px_-8px_rgba(180,140,40,0.55)]"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Top up tokens
                </Button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="mt-2 w-full h-10 text-[13px] text-muted-foreground hover:text-foreground"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BuyTokensDialog
        open={buyOpen}
        onOpenChange={(v) => {
          setBuyOpen(v);
          if (!v) onOpenChange(false);
        }}
      />
    </>
  );
}

export default SoftPaywallSheet;