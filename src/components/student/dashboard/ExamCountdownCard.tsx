import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CalendarClock } from "lucide-react";
import { useActiveExamGoal, useWeaknessSignals } from "@/hooks/useReadiness";

function daysUntil(date: string) {
  const t = new Date(date + "T00:00:00").getTime();
  const now = Date.now();
  return Math.ceil((t - now) / 86400000);
}

export function ExamCountdownCard() {
  const { data: goal } = useActiveExamGoal();
  const { data: weak = [] } = useWeaknessSignals(3);
  if (!goal?.target_date) return null;
  const days = daysUntil(goal.target_date);
  const tone =
    days <= 3 ? "from-rose-50 to-rose-100/60 border-rose-200 text-rose-800" :
    days <= 14 ? "from-amber-50 to-amber-100/60 border-amber-200 text-amber-800" :
    "from-emerald-50 to-emerald-100/60 border-emerald-200 text-emerald-800";

  return (
    <Card className={`p-4 my-4 bg-gradient-to-br ${tone} border`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide opacity-80 inline-flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" /> Exam countdown
          </div>
          <div className="font-display text-[20px] font-extrabold leading-tight mt-0.5">
            {days <= 0 ? "It's exam day" : `${days} day${days === 1 ? "" : "s"} to go`}
          </div>
          {goal.exam_label && (
            <div className="text-[12px] opacity-80 truncate">{goal.exam_label}</div>
          )}
        </div>
        <div className="text-right shrink-0 text-[11px] opacity-80">
          Target: <span className="font-bold">{goal.target_score}%</span>
        </div>
      </div>
      {weak.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {weak.map((w: any) => (
            <span key={`${w.topic}-${w.course_id}`} className="text-[11px] px-2 py-0.5 rounded-full bg-white/70 border border-current/20">
              Focus: {w.topic}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 text-right">
        <Link to="/exams" className="text-[12px] font-semibold underline-offset-2 hover:underline">Open mock exams →</Link>
      </div>
    </Card>
  );
}