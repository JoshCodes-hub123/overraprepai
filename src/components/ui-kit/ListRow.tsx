import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListRowProps {
  title: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
}

/**
 * The default way to present anything in a list — courses, subjects, topics,
 * settings. Rows over cards keeps mobile screens quiet and scannable.
 */
export function ListRow({ title, meta, icon, to, onClick, trailing, className }: ListRowProps) {
  const body = (
    <>
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brand-sm bg-env-soft text-env">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-brand-ink">{title}</span>
        {meta && (
          <span className="mt-0.5 block truncate text-[13px] text-brand-ink-soft">{meta}</span>
        )}
      </span>
      {trailing ?? <ChevronRight className="h-4 w-4 shrink-0 text-brand-ink-soft/60" />}
    </>
  );

  const classes = cn(
    "flex w-full items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 text-left transition-colors hover:bg-brand-soft",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  );
}

export default ListRow;
