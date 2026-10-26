import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BookOpen, Lock, Plus, Check, Sparkles, Target } from "lucide-react";
import { motion } from "framer-motion";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import { cn } from "@/lib/utils";

export type CourseCardState = "enrolled" | "available" | "locked";

export interface CourseData {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
}

export interface CourseCardV2Props {
  course: CourseData;
  state: CourseCardState;
  recommended?: boolean;
  busy?: boolean;
  studentLevel?: string | null;
  readinessScore?: number | null;
  weakTopic?: string | null;
  unreadUpdates?: number;
  onAdd?: () => void;
  onLockedTap?: () => void;
  onPracticeCBT?: () => void;
  className?: string;
}

export function CourseCardV2({
  course,
  state,
  recommended,
  busy,
  studentLevel,
  readinessScore,
  weakTopic,
  unreadUpdates = 0,
  onAdd,
  onLockedTap,
  className,
}: CourseCardV2Props) {
  const locked = state === "locked";
  const enrolled = state === "enrolled";

  // Derive real local photograph, human-readable title, and discipline metadata automatically
  const {
    imageUrl,
    fallbackUrl,
    category,
    displayTitle,
    displayDepartment,
    gradient,
  } = getAutomaticCourseImage(course);

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [imgError, setImgError] = useState(false);

  const units = /101|102|201|202|301|302/i.test(course.code) ? "3 Units" : "2 Units";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("h-full", className)}
    >
      <Card
        className={cn(
          "group relative flex flex-col h-full overflow-hidden rounded-2xl border bg-card transition-all duration-200 select-none",
          locked
            ? "border-border/60 opacity-85 hover:border-border"
            : "border-amber-200/80 dark:border-border/80 hover:border-amber-400 hover:shadow-[0_12px_30px_-10px_rgba(217,119,6,0.2)]"
        )}
      >
        {/* Automatic Real Photographic Cover */}
        <div className="relative h-40 w-full overflow-hidden bg-neutral-900 shrink-0">
          {!imgError ? (
            <img
              src={currentSrc}
              alt={`${course.code} — ${displayTitle}`}
              onError={() => {
                if (currentSrc !== fallbackUrl) {
                  setCurrentSrc(fallbackUrl);
                } else {
                  setImgError(true);
                }
              }}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={cn(
                "h-full w-full flex items-center justify-center p-6 bg-gradient-to-br",
                gradient
              )}
            >
              <span className="font-display text-lg font-bold text-white/80 text-center">
                {category}
              </span>
            </div>
          )}

          {/* Subtle gradient scrim for legible badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/25 pointer-events-none" />

          {/* Top Bar: Course Code + Enrollment Status */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-black/65 text-amber-300 border border-white/15 backdrop-blur-md shadow-xs">
              {course.code}
            </span>

            <div className="flex items-center gap-1.5">
              {enrolled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/95 text-white backdrop-blur-md shadow-xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Enrolled</span>
                </span>
              )}

              {recommended && !enrolled && !locked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500 text-slate-950 backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommended</span>
                </span>
              )}

              {locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-black/65 text-white/90 border border-white/15 backdrop-blur-md">
                  <Lock className="w-3 h-3 text-white/75" />
                  <span>{course.level ? `${course.level}L` : "Locked"}</span>
                </span>
              )}

              {unreadUpdates > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950 shadow-xs">
                  +{unreadUpdates}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Image Caption: Discipline & Course Units */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 z-10 pointer-events-none">
            <span className="font-medium tracking-tight truncate max-w-[72%] drop-shadow-xs">
              {category}
            </span>
            <span className="font-semibold text-white/95 tabular-nums bg-black/45 px-2 py-0.5 rounded-md backdrop-blur-xs text-[10px]">
              {units}
            </span>
          </div>
        </div>

        {/* Clean Card Body */}
        <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
          <div>
            <Link
              to={`/courses/${course.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
            >
              <h3 className="font-display font-bold text-[15.5px] leading-snug line-clamp-2 text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                {displayTitle}
              </h3>
            </Link>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 flex-wrap">
              <span className="truncate max-w-[190px] font-medium">{displayDepartment}</span>
              {course.level && (
                <>
                  <span aria-hidden="true" className="text-muted-foreground/50">·</span>
                  <span>{course.level} Level</span>
                </>
              )}
            </div>

            {weakTopic && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                <Target className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="truncate">Focus: {weakTopic}</span>
              </div>
            )}

            {readinessScore !== undefined && readinessScore !== null && !weakTopic && (
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Exam Readiness</span>
                <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {readinessScore}%
                </span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-2.5 border-t border-border/60 mt-auto">
            {enrolled && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/courses/${course.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-2xs transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Open Course</span>
                </Link>

                <Link
                  to={`/practice?course=${course.id}`}
                  className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border border-amber-200 dark:border-border bg-amber-50/50 dark:bg-background hover:bg-amber-100/70 text-amber-900 dark:text-foreground text-xs font-semibold transition-colors"
                  title="Practice CBT past questions"
                >
                  <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>CBT</span>
                </Link>
              </div>
            )}

            {state === "available" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAdd}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {busy ? (
                    "Adding…"
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Course</span>
                    </>
                  )}
                </button>

                <Link
                  to={`/courses/${course.id}`}
                  className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
                >
                  <span>Preview</span>
                </Link>
              </div>
            )}

            {locked && (
              <button
                type="button"
                onClick={onLockedTap}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-dashed border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>
                  {studentLevel ? `Switch from ${studentLevel}L to add` : "Set your level to enroll"}
                </span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default CourseCardV2;
