import { useMemo } from "react";
import { TrendingUp, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WeeklyPulseProps {
  quizzesCompleted: number;
  accuracy: number;
  className?: string;
}

/**
 * A compact pulse card rendered as a bento tile with a mini bar chart.
 */
export function WeeklyPulse({ quizzesCompleted, accuracy, className }: WeeklyPulseProps) {
  const bars = useMemo(() => {
    // Generate a small bar chart pattern based on the accuracy value.
    const base = Math.max(1, Math.min(10, Math.round(accuracy / 10)));
    return Array.from({ length: 7 }).map((_, i) => {
      const h = Math.max(20, Math.min(100, ((base + i) % 10) * 10 + 20));
      return { height: h, active: h >= 60 };
    });
  }, [accuracy]);

  const pulseLabel = quizzesCompleted > 0
    ? `${accuracy}% accuracy this week`
    : "Start a quiz to build your pulse";

  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-3xl border border-brand-line bg-brand-surface p-5",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold-soft text-env">
          <Zap className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-tight text-brand-ink">Weekly Pulse</h3>
          <p className="text-[12px] leading-snug text-brand-ink-soft">{pulseLabel}</p>
        </div>
      </div>

      <div className="mt-auto flex h-16 items-end justify-between gap-1.5">
        {bars.map((bar, i) => (
          <div
            key={i}
            className={cn(
              "w-full rounded-t-lg transition-all",
              bar.active ? "bg-env" : "bg-brand-gold-soft",
            )}
            style={{ height: `${bar.height}%`, minHeight: 20 }}
            aria-hidden
          />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-env">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden />
        <span>{quizzesCompleted} quiz{quizzesCompleted === 1 ? "" : "zes"} completed</span>
      </div>
    </div>
  );
}

export default WeeklyPulse;
