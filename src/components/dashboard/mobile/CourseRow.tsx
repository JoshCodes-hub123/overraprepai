import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, BookOpen, Target } from "lucide-react";
import { getAutomaticCourseImage } from "@/lib/courseImages";
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

export function CourseRow({
  id,
  code,
  name,
  department,
  level,
  unreadUpdates = 0,
  readinessScore,
  className,
}: CourseRowProps) {
  const navigate = useNavigate();
  const {
    imageUrl,
    fallbackUrl,
    displayTitle,
    displayDepartment,
    category,
  } = getAutomaticCourseImage({ id, code, name, department });

  const [currentSrc, setCurrentSrc] = useState(imageUrl);

  return (
    <div
      onClick={() => navigate(`/courses/${id}`)}
      className={cn(
        "group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200/75 dark:border-border/80 bg-card p-3 sm:p-3.5 text-left transition-all shadow-2xs hover:shadow-md hover:border-amber-400 cursor-pointer select-none",
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
      aria-label={`${code}: ${displayTitle}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Real Photographic Course Thumbnail */}
        <div className="relative h-16 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-amber-200/50 dark:border-border">
          <img
            src={currentSrc}
            alt={`${code} — ${displayTitle}`}
            onError={() => {
              if (currentSrc !== fallbackUrl) {
                setCurrentSrc(fallbackUrl);
              }
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
          <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-center font-mono text-[10px] font-bold text-amber-300 bg-black/65 rounded px-1 py-0.5 backdrop-blur-xs">
            {code}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              {displayDepartment || category}
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
          <span className="block line-clamp-1 text-sm sm:text-[15px] font-display font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors mt-0.5">
            {displayTitle}
          </span>
          <span className="text-[11.5px] text-muted-foreground truncate block mt-0.5">
            {code} · Syllabus, Notes & Past Questions
          </span>
        </div>
      </div>

      {/* Action Affordances */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto justify-between sm:justify-end">
        {readinessScore !== undefined && readinessScore !== null && (
          <div className="text-[11px] font-medium text-muted-foreground mr-1">
            <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
              {readinessScore}%
            </span>{" "}
            ready
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
          title={`Open course ${code}`}
        >
          <span className="hidden sm:inline">Study</span>
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
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-amber-200 dark:border-border bg-card/60 p-8 text-center",
        className
      )}
    >
      <BookOpen className="h-9 w-9 text-amber-500/70" aria-hidden />
      <p className="mt-3 font-display text-sm font-bold text-foreground">No courses enrolled yet</p>
      <p className="mt-1 text-xs text-muted-foreground max-w-xs">
        Browse your university curriculum to add your semester courses and start practicing.
      </p>
      <button
        type="button"
        onClick={() => navigate("/courses")}
        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
      >
        Explore Semester Courses
      </button>
    </div>
  );
}

export default CourseRow;
