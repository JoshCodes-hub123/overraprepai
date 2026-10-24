import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BookOpen, Lock, Plus, Check, Sparkles, Target, ArrowRight } from "lucide-react";
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
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const locked = state === "locked";
  const enrolled = state === "enrolled";

  // Derive automatic curated imagery, discipline classification & visual theme
  const { imageUrl, category, gradient, accentHex } = getAutomaticCourseImage(course);

  // Heuristic for course units
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
            : "border-border/80 hover:border-amber-400/70 hover:shadow-[0_12px_30px_-10px_rgba(217,119,6,0.18)]"
        )}
      >
        {/* Automatic Course Hero Image Cover */}
        <div className="relative h-36 sm:h-40 w-full overflow-hidden bg-neutral-900 shrink-0">
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 bg-neutral-800 animate-pulse" />
          )}

          {!imgError ? (
            <img
              src={imageUrl}
              alt={`${course.code} - ${course.name}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={cn(
                "h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105",
                !imgLoaded && "opacity-0"
              )}
            />
          ) : (
            // Artistic SVG gradient backdrop if image fails to load
            <div
              className={cn(
                "h-full w-full flex items-center justify-center p-6 bg-gradient-to-br",
                gradient
              )}
            >
              <span className="font-mono text-3xl font-extrabold text-white/20 tracking-wider">
                {course.code}
              </span>
            </div>
          )}

          {/* Contrast scrim gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/20 pointer-events-none" />

          {/* Top Overlaid Bar: Code Pill + Status Indicator */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-black/60 text-amber-300 border border-white/15 backdrop-blur-md shadow-xs">
              {course.code}
            </span>

            <div className="flex items-center gap-1.5">
              {enrolled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Enrolled</span>
                </span>
              )}

              {recommended && !enrolled && !locked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500 text-slate-950 backdrop-blur-md shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Curated</span>
                </span>
              )}

              {locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-black/60 text-white/90 border border-white/15 backdrop-blur-md">
                  <Lock className="w-3 h-3 text-white/70" />
                  <span>{course.level ? `${course.level}L` : "Locked"}</span>
                </span>
              )}

              {unreadUpdates > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500 text-white shadow-xs">
                  +{unreadUpdates}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Overlaid Metadata on Image: Category / Discipline */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/85 z-10 pointer-events-none">
            <span className="font-medium tracking-tight truncate max-w-[70%]">
              {category}
            </span>
            <span className="font-semibold text-white/90 tabular-nums bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs text-[10px]">
              {units}
            </span>
          </div>
        </div>

        {/* Card Content Details */}
        <div className="p-4 sm:p-4.5 flex flex-col justify-between flex-1 gap-3">
          <div>
            {/* Course Title */}
            <h3 className="font-display font-bold text-[15px] sm:text-[15.5px] leading-snug line-clamp-2 text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {course.name}
            </h3>

            {/* Clean unboxed metadata with dot separators (Zero-pill discipline) */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 flex-wrap">
              <span className="truncate max-w-[180px]">{course.department || "Curriculum"}</span>
              {course.level && (
                <>
                  <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                  <span>{course.level} Level</span>
                </>
              )}
            </div>

            {/* Weak area drill or CBT readiness badge */}
            {weakTopic && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                <Target className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="truncate">Focus: {weakTopic}</span>
              </div>
            )}

            {readinessScore !== undefined && readinessScore !== null && !weakTopic && (
              <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">CBT Mastery</span>
                <span className="font-bold text-foreground tabular-nums">{readinessScore}%</span>
              </div>
            )}
          </div>

          {/* Action Affordance Footer */}
          <div className="pt-2 border-t border-border/60 mt-auto">
            {enrolled && (
              <div className="flex items-center gap-2">
                <Link
                  to={`/courses/${course.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-xs transition-all"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Study Course</span>
                </Link>

                <Link
                  to={`/practice?course=${course.id}`}
                  className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold transition-colors"
                  title="Practice CBT questions"
                >
                  <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="hidden xs:inline">CBT</span>
                </Link>
              </div>
            )}

            {state === "available" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onAdd}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
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
                  <span>Outline</span>
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
                <span>{studentLevel ? `Switch from ${studentLevel} to add` : "Set your level to enroll"}</span>
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export default CourseCardV2;
