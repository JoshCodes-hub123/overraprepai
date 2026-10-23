import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, BookOpen, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CourseRowProps {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  unreadUpdates?: number;
  actionLabel?: string;
  readinessScore?: number | null;
  className?: string;
}

const INITIAL_COLORS = [
  "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300/40",
  "bg-blue-500/20 text-blue-900 dark:text-blue-200 border-blue-300/40",
  "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-300/40",
  "bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-300/40",
  "bg-violet-500/20 text-violet-900 dark:text-violet-200 border-violet-300/40",
  "bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border-cyan-300/40",
];

function colorFromCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const idx = Math.abs(hash) % INITIAL_COLORS.length;
  return INITIAL_COLORS[idx];
}

function initials(code: string) {
  const parts = code.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /^\d/.test(parts[1])) {
    return parts[0].slice(0, 3).toUpperCase();
  }
  return (
    parts
      .map((w) => w[0]?.toUpperCase())
      .filter(Boolean)
      .slice(0, 3)
      .join("") || "CRS"
  );
}

export function CourseRow({
  id,
  code,
  name,
  department,
  level,
  unreadUpdates = 0,
  actionLabel = "Continue",
  readinessScore,
  className,
}: CourseRowProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/courses/${id}`)}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 text-left transition-all shadow-xs hover:shadow-md hover:border-amber-300/80 cursor-pointer select-none",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/courses/${id}`);
        }
      }}
      aria-label={`${code}: ${name}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-mono text-xs font-bold border",
            colorFromCode(code)
          )}
          aria-hidden
        >
          {initials(code)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm sm:text-base font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {code}
            </span>
            {level && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {level}L
              </span>
            )}
            {unreadUpdates > 0 && (
              <span className="inline-flex h-4 items-center rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-slate-950">
                +{unreadUpdates} new
              </span>
            )}
          </div>
          <span className="block truncate text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
            {name}
          </span>
          {department && (
            <span className="text-[11px] text-muted-foreground/75 truncate block mt-0.5">
              {department}
            </span>
          )}
        </div>
      </div>

      {/* Action Affordances */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto justify-between sm:justify-end">
        {readinessScore !== undefined && readinessScore !== null && (
          <div className="text-[11px] font-medium text-muted-foreground mr-1">
            <span className="font-bold text-foreground tabular-nums">{readinessScore}%</span> ready
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/practice?course=${id}`);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold transition-all shadow-2xs"
          title={`Take CBT Practice Mock for ${code}`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>Practice CBT</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/courses/${id}`);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors"
          title={`View outline for ${code}`}
        >
          <span className="hidden sm:inline">Outline</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function EmptyCourses({ className }: { className?: string }) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center",
        className
      )}
    >
      <BookOpen className="h-9 w-9 text-muted-foreground/50" aria-hidden />
      <p className="mt-3 font-display text-sm font-bold text-foreground">No courses enrolled yet</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs">
        Select your department and registered semester courses to activate personalized past questions.
      </p>
      <button
        type="button"
        onClick={() => navigate("/onboarding/university")}
        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
      >
        Configure Semester Courses
      </button>
    </div>
  );
}

export default CourseRow;
