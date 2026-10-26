import { cn } from "@/lib/utils";

/** Loading placeholder that matches the luxury gold and navy rebrand surfaces with smooth shimmer. */
export function BrandSkeleton({
  className,
  h = 64,
  rounded = "rounded-2xl",
}: {
  className?: string;
  h?: number | string;
  rounded?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-amber-500/10 bg-amber-500/5 dark:bg-neutral-900/60",
        rounded,
        className
      )}
      style={{ height: typeof h === "number" ? `${h}px` : h }}
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-amber-400/15 dark:via-amber-400/10 to-transparent pointer-events-none" />
    </div>
  );
}

export default BrandSkeleton;

