import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  hint?: string;
  to?: string;
  ctaLabel?: string;
  children?: ReactNode;
}

/**
 * Quiet, premium section header used to chunk the dashboard into
 * scannable parts. Mobile-first; collapses gracefully on small screens.
 */
export function SectionLabel({ eyebrow, title, hint, to, ctaLabel = "See all" }: Props) {
  return (
    <header className="flex items-end justify-between gap-3 px-0.5 pt-1">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-amber-700/90">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-[15px] sm:text-[17px] font-extrabold tracking-tight text-foreground leading-tight">
          {title}
        </h2>
        {hint && (
          <p className="text-[11.5px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {hint}
          </p>
        )}
      </div>
      {to && (
        <Link
          to={to}
          className="shrink-0 inline-flex items-center gap-1 text-[12px] sm:text-[13px] font-semibold text-amber-700 hover:text-amber-800 transition"
        >
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </header>
  );
}

export default SectionLabel;
