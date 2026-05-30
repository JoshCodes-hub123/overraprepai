import { ReactNode, useState } from "react";
import { Lock, Wallet, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { SoftPaywallSheet } from "@/components/student/SoftPaywallSheet";
import { cn } from "@/lib/utils";

interface TeaserPaywallProps {
  /** Preview content rendered behind the frosted overlay (e.g. first paragraph). */
  children: ReactNode;
  /** Short verb-led label, e.g. "the full AI summary". */
  unlocks: string;
  /** Optional sub-line, e.g. "8 more sections" or "12-minute audio". */
  hint?: string;
  /** Visual height for the teaser preview region. */
  className?: string;
  /** Skip the wall entirely (e.g. for a freebie quiz) and render children fully. */
  forceUnlocked?: boolean;
}

/**
 * Teaser preview with a frosted "Spend 1 token to unlock" overlay. The whole
 * children block is shown blurred behind the lock so students can see what
 * they'd be unlocking.
 */
export function TeaserPaywall({ children, unlocks, hint, className, forceUnlocked }: TeaserPaywallProps) {
  const { balance } = usePremium();
  const [open, setOpen] = useState(false);

  if (forceUnlocked) return <>{children}</>;

  const cta =
    balance > 0
      ? `Spend 1 token to unlock`
      : `Top up your wallet to unlock`;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-amber-100", className)}>
      <div className="pointer-events-none select-none blur-[2px]">{children}</div>

      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-b from-white/0 via-white/85 to-white" />

      <div className="absolute inset-x-0 bottom-0 px-5 py-6 text-center">
        <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
          <Lock className="h-5 w-5 text-amber-700" />
        </div>
        <p className="mt-3 font-display text-sm font-bold text-foreground">
          {cta} {unlocks}
        </p>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
        <p className="mt-1 text-[11px] text-amber-700 font-semibold flex items-center justify-center gap-1">
          <Zap className="h-3 w-3" />
          Wallet: {balance} tokens
        </p>
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="mt-3 h-9 px-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[13px] font-semibold"
        >
          <Wallet className="h-3.5 w-3.5 mr-1" />
          {balance > 0 ? `Continue (₦25 / token)` : `Top up wallet`}
        </Button>
      </div>

      <SoftPaywallSheet
        open={open}
        onOpenChange={setOpen}
        action={unlocks}
        reason={`${cta} ${unlocks}. ${hint ?? ""}`.trim()}
      />
    </div>
  );
}

export default TeaserPaywall;
