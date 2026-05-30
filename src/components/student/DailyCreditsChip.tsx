import { Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { cn } from "@/lib/utils";

/**
 * Tiny header chip showing either:
 *  - Pro badge (paid Pro), or
 *  - "Trial: N day(s) left" (in trial window), or
 *  - "⚡ N/5 today" (free users)
 *
 * Tapping always navigates to /subscription.
 */
export function DailyCreditsChip({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { isPro, isTrial, hasPaidPro, trialDaysLeft, creditsUsed, dailyLimit } = usePremium();

  const onClick = () => navigate("/subscription");

  if (hasPaidPro) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold",
          "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 border border-amber-300/60",
          className,
        )}
        aria-label="Pro subscription"
      >
        <Crown className="h-3 w-3" />
        Pro
      </button>
    );
  }

  if (isTrial) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold",
          "bg-amber-50 text-amber-800 border border-amber-200",
          className,
        )}
        aria-label={`Trial: ${trialDaysLeft} day(s) left`}
      >
        <Crown className="h-3 w-3" />
        Trial · {trialDaysLeft}d
      </button>
    );
  }

  const used = Math.min(creditsUsed, dailyLimit);
  const low = used >= dailyLimit;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold border transition-colors",
        low
          ? "bg-rose-50 text-rose-700 border-rose-200"
          : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
        className,
      )}
      aria-label={`${used} of ${dailyLimit} daily AI credits used`}
    >
      <Zap className="h-3 w-3" />
      {used}/{dailyLimit}
      {!isPro && <span className="hidden sm:inline ml-1 opacity-70">today</span>}
    </button>
  );
}

export default DailyCreditsChip;
