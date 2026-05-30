import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Crown, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface SoftPaywallSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Plain-English reason ("You've used today's 5 free credits…" or "Mock exams are Pro-only"). */
  reason?: string;
  /** Optional short verb-led label ("Unlock AI summary"). */
  action?: string;
}

/**
 * Single Pro upgrade paywall. Shown when:
 *  - A free user exhausts their 5 daily credits, or
 *  - A free user tries to start a Pro-only feature.
 *
 * One price (₦2,000/mo), one CTA → /subscription. No token packs.
 */
export function SoftPaywallSheet({ open, onOpenChange, reason, action }: SoftPaywallSheetProps) {
  const navigate = useNavigate();

  const heading = action ? `Pro unlocks ${action}` : "You've hit today's free limit";
  const body =
    reason ||
    "Free students get 5 AI credits per day. Pro gives you unlimited access — quizzes, AI tutor, summaries, audio, mock exams.";

  const goUpgrade = () => {
    onOpenChange(false);
    navigate("/subscription");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          role="dialog" aria-modal="true" aria-label="Upgrade to Pro"
        >
          <motion.div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
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

            <div className="px-6 pt-7 pb-6 text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
                <Crown className="h-7 w-7 text-amber-700" strokeWidth={2.2} />
              </div>
              <h2 className="mt-4 font-display text-[20px] font-extrabold tracking-tight text-foreground">
                {heading}
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground leading-snug">{body}</p>

              <ul className="mt-5 text-left space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                {[
                  "Unlimited AI explanations, summaries & quizzes",
                  "Unlimited audio lessons (Noiz TTS)",
                  "All mock exams + AI remediation",
                  "Priority AI tutor chat + Pro badge",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-amber-900">
                    <Check className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex items-center justify-center gap-2">
                <span className="font-display text-3xl font-extrabold text-amber-900">₦2,000</span>
                <span className="text-[13px] text-muted-foreground">/ month</span>
              </div>

              <Button
                onClick={goUpgrade}
                className="mt-5 w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-[0_8px_24px_-8px_rgba(180,140,40,0.55)]"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Upgrade to Pro
              </Button>
              <button
                type="button" onClick={() => onOpenChange(false)}
                className="mt-2 w-full h-10 text-[13px] text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SoftPaywallSheet;
