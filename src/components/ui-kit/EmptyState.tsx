import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Calm empty state — used everywhere JAMB content is not seeded yet. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-brand border border-dashed border-brand-line bg-brand-soft/60 px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-surface text-env">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-brand-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-brand-ink-soft">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export default EmptyState;
