import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Layers,
  Lock,
  Plus,
  Check,
  Sparkles,
  Target,
  HardDrive,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import { useLiteMode } from "@/lib/liteMode";
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
  progressPercent?: number | null;
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
  progressPercent,
  weakTopic,
  unreadUpdates = 0,
  onAdd,
  onLockedTap,
  className,
}: CourseCardV2Props) {
  const locked = state === "locked";
  const enrolled = state === "enrolled";
  const [liteMode] = useLiteMode();

  const {
    imageUrl,
    fallbackUrl,
    category,
    displayTitle,
    displayDepartment,
  } = getAutomaticCourseImage(course);

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [imgError, setImgError] = useState(false);

  const units = /101|102|201|202|301|302/i.test(course.code) ? "3 Units" : "2 Units";
  const effectiveProgress = Math.round(progressPercent ?? readinessScore ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn("h-full", className)}
    >
      <div
        className={cn(
          "group relative flex flex-col h-full overflow-hidden rounded-3xl border bg-white dark:bg-card transition-all duration-200 select-none",
          locked
            ? "border-[#E8E2D6]/70 opacity-85"
            : "border-[#E8E2D6] dark:border-border hover:border-[#D4AF37] shadow-[0_8px_24px_-10px_rgba(24,24,27,0.06)] hover:shadow-[0_14px_32px_-10px_rgba(212,175,55,0.2)]"
        )}
      >
        {/* Header: Zero-Data Academic Monogram in Lite Mode, or Photographic Cover in Standard Mode */}
        <div
          className={cn(
            "relative w-full overflow-hidden bg-[#18181B] shrink-0",
            liteMode ? "h-24" : "h-36"
          )}
        >
          {!liteMode && !imgError ? (
            <img
              src={currentSrc}
              alt={`${course.code} — ${displayTitle}`}
              referrerPolicy="no-referrer"
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
            <div className="h-full w-full flex items-center justify-center px-5 bg-[#18181B] border-b border-[#27272A]">
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-[#D4AF37]/80 text-center truncate">
                {liteMode ? `${course.code} · Low-Data Mode` : category}
              </span>
            </div>
          )}

          {!liteMode && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/25 pointer-events-none" />
          )}

          {/* Top Bar: Course Code + Status */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold tracking-wider bg-[#18181B]/90 text-[#F5D77F] border border-[#D4AF37]/40 backdrop-blur-md shadow-xs">
              {course.code}
            </span>

            <div className="flex items-center gap-1.5">
              {enrolled && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600/95 text-white shadow-xs">
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Offline Ready</span>
                </span>
              )}

              {recommended && !enrolled && !locked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-[#D4AF37] text-[#18181B] shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  <span>Recommended</span>
                </span>
              )}

              {locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-black/70 text-white/90 border border-white/15">
                  <Lock className="w-3 h-3 text-white/75" />
                  <span>{course.level ? `${course.level}L` : "Locked"}</span>
                </span>
              )}

              {unreadUpdates > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#D4AF37] text-[#18181B]">
                  +{unreadUpdates}
                </span>
              )}
            </div>
          </div>

          {/* Bottom Image Caption */}
          <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 z-10 pointer-events-none">
            <span className="font-medium tracking-tight truncate max-w-[72%]">
              {category}
            </span>
            <span className="font-mono font-bold text-white/95 tabular-nums bg-black/55 px-2 py-0.5 rounded-md text-[10px]">
              {units}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 flex flex-col justify-between flex-1 gap-3.5">
          <div>
            <Link
              to={`/courses/${course.id}`}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] rounded"
            >
              <h3 className="font-display font-extrabold text-[15px] leading-snug line-clamp-2 text-[#18181B] dark:text-foreground group-hover:text-[#996515] transition-colors">
                {displayTitle}
              </h3>
            </Link>

            <div className="flex items-center gap-1.5 text-xs text-[#71717A] dark:text-muted-foreground mt-1 flex-wrap">
              <span className="truncate max-w-[190px] font-medium">{displayDepartment}</span>
              {course.level && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{course.level}L</span>
                </>
              )}
              {enrolled && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#9A7B1C] font-semibold">
                    <HardDrive className="w-3 h-3" />
                    <span>Saved</span>
                  </span>
                </>
              )}
            </div>

            {weakTopic && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#996515] dark:text-amber-300 bg-[#FAF0D6]/70 dark:bg-amber-500/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-xl">
                <Target className="w-3.5 h-3.5 shrink-0 text-[#996515]" />
                <span className="truncate">Focus: {weakTopic}</span>
              </div>
            )}

            {enrolled && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#71717A] font-medium">3-Step Mastery</span>
                  <span className="font-mono font-bold tabular-nums text-[#18181B] dark:text-foreground">
                    {effectiveProgress}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#FAF8F5] dark:bg-muted border border-[#E8E2D6] dark:border-border">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      effectiveProgress >= 80
                        ? "bg-emerald-600"
                        : effectiveProgress > 0
                        ? "bg-gradient-to-r from-[#D4AF37] to-[#B8860B]"
                        : "bg-transparent"
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, effectiveProgress))}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3-Step Direct Learning Entry Points Footer */}
          <div className="pt-3 border-t border-[#E8E2D6] dark:border-border/60 mt-auto">
            {enrolled && (
              <div className="grid grid-cols-3 gap-1.5">
                <Link
                  to={`/courses/${course.id}?tab=materials`}
                  className="inline-flex items-center justify-center gap-1 min-h-[40px] px-2 rounded-xl border border-[#E8E2D6] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-[#18181B] dark:text-foreground text-[11px] font-bold transition-colors"
                  title="Step 1: Read Lecture Notes & Formulas"
                >
                  <FileText className="w-3.5 h-3.5 text-[#996515] shrink-0" />
                  <span>Notes</span>
                </Link>

                <Link
                  to={`/courses/${course.id}?tab=topics`}
                  className="inline-flex items-center justify-center gap-1 min-h-[40px] px-2 rounded-xl border border-[#E8E2D6] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-[#18181B] dark:text-foreground text-[11px] font-bold transition-colors"
                  title="Step 2: Practice Topic Drills"
                >
                  <Layers className="w-3.5 h-3.5 text-[#996515] shrink-0" />
                  <span>Drills</span>
                </Link>

                <Link
                  to={`/courses/${course.id}?tab=quizzes`}
                  className="inline-flex items-center justify-center gap-1 min-h-[40px] px-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#F5D77F] text-[11px] font-bold transition-colors shadow-2xs"
                  title="Step 3: Take Timed CBT Exam"
                >
                  <Target className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
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
                  className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#18181B] font-bold text-xs shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
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
                  to={`/courses/${course.id}?tab=materials`}
                  className="inline-flex items-center justify-center min-h-[40px] px-3 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-xs font-bold transition-colors"
                >
                  <span>Preview</span>
                </Link>
              </div>
            )}

            {locked && (
              <button
                type="button"
                onClick={onLockedTap}
                className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-dashed border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#71717A] hover:text-[#18181B] text-xs font-semibold transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {studentLevel ? `Switch from ${studentLevel}L to add` : "Set your level to enroll"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default CourseCardV2;
