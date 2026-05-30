import { Wallet, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { cn } from "@/lib/utils";

/**
 * Tiny header chip showing the wallet balance + today's free quota.
 * Tapping opens /wallet.
 */
export function DailyCreditsChip({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { balance, freeLeft, isLowBalance } = usePremium();

  const empty = balance <= 0 && freeLeft <= 0;
  const tone = empty
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isLowBalance
      ? "bg-amber-50 text-amber-800 border-amber-300"
      : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50";

  return (
    <button
      type="button"
      onClick={() => navigate("/wallet")}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold border transition-colors",
        tone,
        className,
      )}
      aria-label={`Wallet: ${balance} tokens, ${freeLeft} free today`}
    >
      {empty ? <Wallet className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
      {balance}
      <span className="opacity-70">·{freeLeft}/5</span>
    </button>
  );
}

// Re-export under a clearer name for new code.
export const WalletChip = DailyCreditsChip;

export default DailyCreditsChip;
