import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, TrendingUp, ChevronRight, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useSuccessScore,
  useTodayMission,
  useReadinessAll,
} from "@/hooks/useIntelligence";

const tierStyles: Record<string, string> = {
  Legend: "text-amber-600",
  Champion: "text-amber-600",
  Achiever: "text-amber-700",
  Scholar: "text-foreground",
  Beginner: "text-muted-foreground",
};

/**
 * Compact dashboard widget summarising the Student Intelligence Layer.
 * Apple-calm. White card, gold accent ring, single CTA into /intelligence.
 */
export default function IntelligenceWidget() {
  const { data: score, isLoading: scoreLoading } = useSuccessScore();
  const { data: mission } = useTodayMission();
  const { data: readiness } = useReadinessAll();

  const topCourses = useMemo(() => (readiness ?? []).slice(0, 2), [readiness]);
  const ring = score?.score ?? 0;
  const tier = score?.tier ?? "Scholar";

  return (
    <Link to="/intelligence" className="block group">
      <Card className="relative overflow-hidden border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          {/* Score ring */}
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <motion.circle
                cx="40" cy="40" r="34" fill="none"
                stroke="hsl(45, 90%, 50%)" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 34}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 34 * (1 - ring / 100),
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {scoreLoading ? (
                <Skeleton className="h-6 w-10" />
              ) : (
                <>
                  <span className="text-xl font-semibold leading-none">{ring}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/100</span>
                </>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700">
                Success Center
              </p>
            </div>
            <h3 className={cn("mt-1 text-lg font-semibold", tierStyles[tier])}>
              {tier}
            </h3>

            {score && score.trend_pct !== 0 && (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className={cn("h-3 w-3", score.trend_pct >= 0 ? "text-emerald-600" : "text-rose-600 rotate-180")} />
                <span>{score.trend_pct >= 0 ? "+" : ""}{score.trend_pct}% vs last month</span>
              </div>
            )}

            {topCourses.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {topCourses.map((c) => (
                  <div key={c.course_id} className="flex items-center justify-between text-xs">
                    <span className="truncate font-medium text-foreground/80">
                      {c.course_code ?? c.course_name ?? "Course"}
                    </span>
                    <span className={cn(
                      "tabular-nums",
                      c.readiness >= 75 ? "text-emerald-700" :
                      c.readiness >= 55 ? "text-amber-700" : "text-rose-600",
                    )}>
                      {c.readiness}% · {c.predicted_grade}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {mission?.tasks && mission.tasks.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2 text-xs">
            <Flame className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-muted-foreground">Today's mission</span>
            <span className="ml-auto font-medium text-foreground">
              {mission.tasks.length} tasks
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
