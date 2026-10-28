import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, CheckCircle2, Circle, ArrowRight, Sparkles, BookOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Mission {
  label: string;
  done: boolean;
  link?: string;
  courseId?: string;
}

/**
 * Normalizes any link into guaranteed valid route to avoid 404 errors
 */
function resolveSafeTargetLink(link?: string, courseId?: string): string {
  if (!link) return courseId ? `/practice?course=${courseId}` : "/practice";
  const l = link.toLowerCase();

  if (l.includes("cbt") || l.includes("practice") || l.includes("quiz")) {
    return courseId ? `/practice?course=${courseId}` : "/practice";
  }
  if (l.includes("note") || l.includes("lecture") || l.includes("material")) {
    return courseId ? `/courses/${courseId}?tab=materials` : "/courses";
  }
  if (l.includes("topic") || l.includes("syllabus") || l.includes("courses")) {
    return courseId ? `/courses/${courseId}` : "/courses";
  }
  if (l.includes("weak") || l.includes("mastery")) {
    return "/student/mastery";
  }
  if (l.includes("readiness")) {
    return "/student/readiness";
  }
  if (l.includes("analytic") || l.includes("pulse") || l.includes("streak")) {
    return "/student/analytics";
  }
  if (link.startsWith("/")) return link;
  return courseId ? `/practice?course=${courseId}` : "/practice";
}

export function MissionBlock({
  title,
  subtitle,
  missions = [],
  completed: initialCompleted,
  total,
  currentCourseId,
  className,
}: {
  title: string;
  subtitle: string;
  missions: Mission[];
  completed: number;
  total: number;
  currentCourseId?: string;
  className?: string;
}) {
  const navigate = useNavigate();

  // Local optimistic state for checked tasks so user can interactively mark targets complete
  const [localMissions, setLocalMissions] = useState<Mission[]>(missions);

  // Sync if missions change externally
  React.useEffect(() => {
    setLocalMissions(missions);
  }, [missions]);

  const toggleMission = (index: number) => {
    setLocalMissions((prev) =>
      prev.map((m, i) => (i === index ? { ...m, done: !m.done } : m))
    );
  };

  const completedCount = localMissions.filter((m) => m.done).length;
  const effectiveTotal = localMissions.length || total || 1;
  const percent = Math.round((completedCount / effectiveTotal) * 100);

  return (
    <div
      className={cn(
        "relative flex w-full flex-col rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-2xs space-y-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Target className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-tight text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-[12px] leading-snug text-neutral-500 dark:text-neutral-400 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-neutral-600 dark:text-neutral-400">
            {completedCount} of {effectiveTotal} done
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
            style={{ width: `${percent}%` }}
            aria-hidden
          />
        </div>
      </div>

      {/* 3 Explicit Interactive Daily Target Items */}
      <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        {localMissions.map((mission, idx) => {
          const targetUrl = resolveSafeTargetLink(mission.link, currentCourseId);

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all",
                mission.done
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40"
                  : "bg-neutral-50/60 dark:bg-neutral-900/60 border-neutral-200/80 dark:border-neutral-800 hover:border-amber-400"
              )}
            >
              <div
                className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                onClick={() => toggleMission(idx)}
              >
                <button
                  type="button"
                  aria-label={mission.done ? "Mark as uncompleted" : "Mark as completed"}
                  className="mt-0.5 shrink-0 focus-visible:outline-none"
                >
                  {mission.done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="h-4 w-4 text-neutral-400 hover:text-amber-500" />
                  )}
                </button>
                <span
                  className={cn(
                    "text-xs leading-snug",
                    mission.done
                      ? "text-neutral-400 dark:text-neutral-500 line-through"
                      : "text-neutral-800 dark:text-neutral-200 font-medium"
                  )}
                >
                  {mission.label}
                </span>
              </div>

              {/* Action Button that safely navigates without 404 */}
              <button
                type="button"
                onClick={() => navigate(targetUrl)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 hover:bg-amber-500 hover:text-neutral-950 hover:border-amber-400 transition-colors shadow-2xs"
              >
                <span>{mission.done ? "Review" : "Start"}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissionItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <CheckCircle2
        className={cn("mt-0.5 h-4 w-4 shrink-0", done ? "text-emerald-500" : "text-neutral-300")}
        aria-hidden
      />
      <span
        className={cn(
          "text-[12px] leading-snug",
          done ? "text-neutral-400 line-through" : "text-neutral-800"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export default MissionBlock;
