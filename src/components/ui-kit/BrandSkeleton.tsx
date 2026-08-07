import { cn } from "@/lib/utils";

/** Loading placeholder that matches the rebrand surfaces. */
export function BrandSkeleton({ className, h = 64 }: { className?: string; h?: number }) {
  return (
    <div
      className={cn("animate-pulse rounded-brand bg-brand-soft", className)}
      style={{ height: h }}
    />
  );
}

export default BrandSkeleton;
