import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  BookOpen,
  Target,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Clock,
} from "lucide-react";
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
  progressPercent?: number | null;
  completedTopics?: number;
  totalTopics?: number;
  className?: string;
}

export const CourseRow = memo(function CourseRow({
  id,
  code,
  name,
  department,
  level,
  unreadUpdates = 0,
  readinessScore,
  progressPercent,
  completedTopics = 0,
  totalTopics = 0,
  className,
}: CourseRowProps) {
  const navigate = useNavigate();
  const {
    imageUrl,
    fallbackUrl,
    displayTitle,
    displayDepartment,
    category,
    gradient,
  } = getAutomaticCourseImage({ id, code, name, department });

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Compute effective progress (topics-based if available, else readiness score)
  const effectivePercent = Math.min(
    100,
    Math.max(
      0,
      typeof progressPercent === "number" && progressPercent >= 0
        ? progressPercent
        : typeof readinessScore === "number" && readinessScore >= 0
        ? readinessScore
        : 0
    )
  );

  const isCompleted = effectivePercent >= 80;
  const isStarted = effectivePercent > 0;

  return (
    <div
      onClick={() => navigate(`/courses/${id}`)}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-amber-200/70 dark:border-border/80 bg-card p-3 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:border-amber-400/90 cursor-pointer select-none",
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
      aria-label={`${code}: ${displayTitle} — ${effectivePercent}% completed`}
    >
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Course Info with Photographic / Discipline Thumbnail */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Beautiful Course Badge Thumbnail */}
          <div className="relative h-16 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-neutral-900 border border-amber-300/40 dark:border-neutral-800 shadow-xs">
            {/* Shimmer Placeholder while image loads */}
            {!imgLoaded && (
              <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-amber-500/50" />
              </div>
            )}

            <img
              src={currentSrc}
              alt={`${code} — ${displayTitle}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                if (currentSrc !== fallbackUrl) {
                  setCurrentSrc(fallbackUrl);
                }
              }}
              className={cn(
                "h-full w-full object-cover object-center transition-all duration-500 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
            <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-center font-mono text-[10px] font-bold text-amber-300 bg-black/75 rounded px-1 py-0.5 backdrop-blur-xs shadow-2xs">
              {code}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                {displayDepartment || category}
              </span>
              {level && (
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded-md">
                  {level}L
                </span>
              )}
              {unreadUpdates > 0 && (
                <span className="inline-flex h-4 items-center rounded-full bg-amber-500 px-1.5 text-[9px] font-bold text-slate-950 shadow-2xs">
                  +{unreadUpdates} new
                </span>
              )}

              {/* Completion status pill */}
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.2 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Exam Ready</span>
                </span>
              ) : isStarted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded-full">
                  <Clock className="w-3 h-3" />
                  <span>In Progress</span>
                </span>
              ) : null}
            </div>

            <span className="block line-clamp-1 text-sm sm:text-[15px] font-display font-bold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors mt-0.5">
              {displayTitle}
            </span>
            <span className="text-[11.5px] text-muted-foreground truncate block mt-0.5">
              {code} · Syllabus, Notes & CBT Question Bank
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/practice?course=${id}`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold transition-all shadow-xs"
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

      {/* Visual Progress Bar Section */}
      <div className="mt-1 pt-2.5 border-t border-border/60">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block w-2 h-2 rounded-full",
                isCompleted
                  ? "bg-emerald-500 shadow-xs shadow-emerald-500/50"
                  : isStarted
                  ? "bg-amber-500 shadow-xs shadow-amber-500/50"
                  : "bg-muted-foreground/40"
              )}
            />
            {totalTopics > 0 ? (
              <span>
                <strong className="text-foreground font-semibold">
                  {completedTopics} of {totalTopics}
                </strong>{" "}
                topics completed
              </span>
            ) : effectivePercent > 0 ? (
              <span>
                <strong className="text-foreground font-semibold">
                  {effectivePercent}%
                </strong>{" "}
                mastery & readiness
              </span>
            ) : (
              <span>Not started yet · Ready for topic 1</span>
            )}
          </span>

          <span
            className={cn(
              "font-mono text-xs font-bold tabular-nums",
              isCompleted
                ? "text-emerald-600 dark:text-emerald-400"
                : isStarted
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground"
            )}
          >
            {effectivePercent}%
          </span>
        </div>

        {/* Sleek Gradient Visual Progress Track */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/80 dark:bg-neutral-800/80 border border-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isCompleted
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-xs shadow-emerald-500/30"
                : isStarted
                ? "bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 shadow-xs shadow-amber-500/30"
                : "bg-transparent"
            )}
            style={{ width: `${Math.min(100, Math.max(0, effectivePercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

/**
 * Beautiful Luxury Skeleton matching CourseRow layout
 */
export function CourseRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:p-4 text-left shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {/* Thumbnail box */}
          <div className="relative h-16 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-amber-500/10 border border-amber-500/10">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-amber-400/15 to-transparent" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-24 rounded-xl bg-amber-500/20 animate-pulse" />
          <div className="h-8 w-16 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
      {/* Progress bar shimmer line */}
      <div className="pt-2 border-t border-border/40 space-y-1.5">
        <div className="flex justify-between">
          <div className="h-2.5 w-36 rounded bg-muted animate-pulse" />
          <div className="h-2.5 w-8 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden relative">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
        </div>
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
        className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-xs"
      >
        Explore Semester Courses
      </button>
    </div>
  );
}

export default CourseRow;
