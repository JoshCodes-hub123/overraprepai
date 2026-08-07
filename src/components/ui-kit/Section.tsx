import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SectionProps {
  title?: ReactNode;
  /** Optional "See all" style link. */
  to?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A titled block of content. Spacing, not boxes, creates the hierarchy.
 */
export function Section({ title, to, linkLabel = "See all", children, className }: SectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      {(title || to) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-brand-ink-soft">
              {title}
            </h2>
          )}
          {to && (
            <Link
              to={to}
              className="text-[13px] font-semibold text-env underline-offset-4 hover:underline"
            >
              {linkLabel}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export default Section;
