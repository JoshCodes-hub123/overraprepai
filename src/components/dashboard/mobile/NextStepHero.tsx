import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface NextStepHeroProps {
  /** Small caps label, e.g. "Your next step". */
  eyebrow?: string;
  /** Short code / kicker line, e.g. "CHE 102". */
  kicker?: string;
  title: ReactNode;
  /** Contextual line, e.g. "Continue where you stopped". */
  context?: ReactNode;
  cta: string;
  to: string;
  className?: string;
}

/**
 * The single strongest element of the home screen.
 *
 * One quiet surface, one gold action. No statistics, no decoration — the
 * hierarchy comes from type scale and space, which is what keeps the screen
 * readable in about three seconds.
 */
export function NextStepHero({
  eyebrow = "Your next step",
  kicker,
  title,
  context,
  cta,
  to,
  className,
}: NextStepHeroProps) {
  const navigate = useNavigate();

  return (
    <section
      aria-label={eyebrow}
      className={cn(
        "rounded-brand-lg border border-env-line bg-env-soft/70 p-5",
        className,
      )}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-env">{eyebrow}</p>

      {kicker && (
        <p className="mt-3.5 text-[13px] font-bold uppercase tracking-[0.1em] text-brand-ink-soft">
          {kicker}
        </p>
      )}
      <h2 className="mt-1 text-[23px] font-bold leading-[1.15] tracking-tight text-brand-ink">
        {title}
      </h2>
      {context && (
        <p className="mt-2 text-[13.5px] leading-relaxed text-brand-ink-soft">{context}</p>
      )}

      <button
        type="button"
        onClick={() => navigate(to)}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-env text-[15px] font-semibold text-env-foreground shadow-brand transition-all active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env focus-visible:ring-offset-2"
      >
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
}

export default NextStepHero;
