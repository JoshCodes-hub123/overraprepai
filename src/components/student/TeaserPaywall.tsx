import { ReactNode, useState } from "react";
import { Lock, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePremium } from "@/hooks/usePremium";
import { SoftPaywallSheet } from "@/components/student/SoftPaywallSheet";
import { cn } from "@/lib/utils";

interface TeaserPaywallProps {
  /** Preview content rendered behind the frosted overlay (e.g. first paragraph, first question). */
  children: ReactNode;
  /** Short verb-led label, e.g. "the full AI summary". */
  unlocks: string;
  /** Optional sub-line, e.g. "8 more sections" or "12-minute audio". */
  hint?: string;
  /** Visual height for the teaser preview region (default: auto). */
  className?: string;
  /** Skip the wall entirely (e.g. Pro user) and render children fully. */
  forceUnlocked?: boolean;
}

/**
 * Teaser preview with a frosted "🔒 Upgrade to Pro" overlay over the bottom.
 * Free users see the start of the content but can't access the full thing.
 * Pro/trial users see the content directly with no overlay.
 */
export function TeaserPaywall({ children, unlocks, hint, className, forceUnlocked }: TeaserPaywallProps) {
  const { isPro } = usePremium();
  const [open, setOpen] = useState(false);

  if (forceUnlocked || isPro) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-amber-100", className)}>
      <div className="pointer-events-none select-none">{children}</div>

      {/* Frosted gradient mask */}
      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-b from-white/0 via-white/80 to-white backdrop-blur-[2px]" />

      <div className="absolute inset-x-0 bottom-0 px-5 py-6 text-center">
        <div className="mx-auto h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-inner">
          <Lock className="h-5 w-5 text-amber-700" />
        </div>
        <p className="mt-3 font-display text-sm font-bold text-foreground">
          Pro unlocks {unlocks}
        </p>
        {hint && <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>}
        <Button
          size="sm"
          onClick={() => setOpen(true)}
          className="mt-3 h-9 px-4 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[13px] font-semibold"
        >
          <Crown className="h-3.5 w-3.5 mr-1" />
          Upgrade — ₦2,000/mo
          <Sparkles className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>

      <SoftPaywallSheet
        open={open}
        onOpenChange={setOpen}
        action={unlocks}
        reason={`Pro unlocks ${unlocks}. ${hint ?? ""}`.trim()}
      />
    </div>
  );
}

export default TeaserPaywall;
