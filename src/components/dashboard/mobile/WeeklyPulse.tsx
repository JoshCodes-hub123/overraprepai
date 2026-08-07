import { cn } from "@/lib/utils";

interface WeeklyPulseProps {
  quizzes: number;
  accuracyPct?: number | null;
  className?: string;
}

/**
 * A single quiet line of real weekly activity. Rendered only when the student
 * actually practised this week — never a fabricated or zeroed progress widget.
 */
export function WeeklyPulse({ quizzes, accuracyPct, className }: WeeklyPulseProps) {
  if (!quizzes || quizzes < 1) return null;

  const parts = [
    `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}`,
    typeof accuracyPct === "number" && accuracyPct > 0 ? `${Math.round(accuracyPct)}% average` : null,
  ].filter(Boolean) as string[];

  return (
    <p className={cn("text-[13.5px] text-brand-ink-soft", className)}>
      {parts.map((p, i) => (
        <span key={p}>
          {i > 0 && <span aria-hidden className="px-2 text-brand-ink-soft/50">·</span>}
          <span className="font-semibold text-brand-ink">{p}</span>
        </span>
      ))}
    </p>
  );
}

export default WeeklyPulse;
