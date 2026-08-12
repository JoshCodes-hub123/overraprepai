import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextStepHeroProps {
  eyebrow?: string;
  kicker?: string;
  title: string;
  context?: string;
  cta: string;
  to: string;
  className?: string;
}

/**
 * The hero card that answers "what should I study next?".
 *
 * Rendered as a premium dark-zinc card with a gold accent line, keeping the
 * white + gold brand but adding the depth and hierarchy expected in a bento
 * dashboard.
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
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-3xl bg-brand-ink p-6 text-left text-brand-surface shadow-brand-lifted transition-all hover:shadow-brand-heavy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
        className,
      )}
      aria-label={`${eyebrow}: ${title}`}
    >
      {/* Gold accent line at the top */}
      <div className="absolute left-0 right-0 top-0 h-1 bg-env" aria-hidden />

      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-surface/80">
          <Sparkles className="h-3 w-3 text-env" aria-hidden />
          {eyebrow}
        </span>
        {kicker && (
          <span className="rounded-full border border-brand-surface/15 bg-brand-surface/5 px-3 py-1 text-[11px] font-bold text-env">
            {kicker}
          </span>
        )}
      </div>

      <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-tight text-brand-surface">
        {title}
      </h2>

      {context && (
        <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-brand-surface/70">
          {context}
        </p>
      )}

      <div className="mt-6 flex items-center gap-2 text-[14px] font-bold text-env transition-transform group-hover:translate-x-1">
        {cta}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </div>
    </button>
  );
}

export default NextStepHero;
