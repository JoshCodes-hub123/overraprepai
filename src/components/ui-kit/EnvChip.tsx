import { cn } from "@/lib/utils";

/**
 * The small "which academic world am I in" marker. Appears once per screen,
 * directly under the OverraPrep AI brand line.
 */
export function EnvChip({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-env-line bg-env-soft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-env",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-env" />
      {label}
    </span>
  );
}

export default EnvChip;
