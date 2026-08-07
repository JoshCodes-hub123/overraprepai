import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface CourseRowProps {
  to: string;
  code: string;
  name: string;
  /** Real action hint, e.g. "Continue where you stopped" / "Ready to practice". */
  action: string;
  badge?: string;
}

/**
 * Quiet, scannable course row: code, full name, and the one useful thing the
 * student can do next. No fabricated percentages or progress bars.
 */
export function CourseRow({ to, code, name, action, badge }: CourseRowProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold tracking-tight text-brand-ink">
            {code}
          </span>
          {badge && (
            <span className="shrink-0 rounded-full bg-env-soft px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-env">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-[13.5px] text-brand-ink-soft">{name}</span>
        <span className="mt-1.5 block truncate text-[12.5px] font-semibold text-env">{action}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-brand-ink-soft/50" aria-hidden />
    </Link>
  );
}

export default CourseRow;
