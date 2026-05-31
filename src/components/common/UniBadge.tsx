import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniBadgeProps {
  code?: string | null;
  name?: string | null;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Small gold pill showing a university short code (e.g. "FUTA").
 * Used on course/quiz/opportunity/tutor cards so cross-school content
 * is instantly readable.
 */
export function UniBadge({ code, name, size = "sm", className }: UniBadgeProps) {
  if (!code && !name) return null;
  const label = code ?? name!;
  return (
    <span
      title={name ?? undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800 font-semibold uppercase tracking-wide",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className,
      )}
    >
      <GraduationCap className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {label}
    </span>
  );
}

export default UniBadge;
