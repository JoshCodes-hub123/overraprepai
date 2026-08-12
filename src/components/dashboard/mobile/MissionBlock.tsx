import { useNavigate } from "react-router-dom";
import { Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Mission {
  label: string;
  done: boolean;
  link?: string;
}

export function MissionBlock({
  title,
  subtitle,
  missions,
  completed,
  total,
  className,
}: {
  title: string;
  subtitle: string;
  missions: Mission[];
  completed: number;
  total: number;
  className?: string;
}) {
  const navigate = useNavigate();

  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={() => {
        const firstPending = missions.find((m) => !m.done && m.link);
        if (firstPending?.link) navigate(firstPending.link);
      }}
      className={cn(
        "relative flex w-full flex-col rounded-3xl border border-brand-line bg-brand-surface p-5 text-left transition-all hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env",
        className,
      )}
      aria-label={`${title}: ${completed} of ${total} completed`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold-soft text-env">
          <Target className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-tight text-brand-ink">{title}</h3>
          <p className="text-[12px] leading-snug text-brand-ink-soft">{subtitle}</p>
        </div>
      </div>

      <div className="mt-auto">
        <div className="mb-2 flex items-center justify-between text-[12px] font-medium">
          <span className="text-brand-ink-soft">{completed} of {total} done</span>
          <span className="text-env">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-soft">
          <div
            className="h-full rounded-full bg-env transition-all"
            style={{ width: `${percent}%` }}
            aria-hidden
          />
        </div>
      </div>
    </button>
  );
}

export function MissionItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <CheckCircle2
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          done ? "text-env" : "text-brand-line",
        )}
        aria-hidden
      />
      <span className={cn("text-[12px] leading-snug", done ? "text-brand-ink-soft line-through" : "text-brand-ink")}>
        {label}
      </span>
    </div>
  );
}

export default MissionBlock;
