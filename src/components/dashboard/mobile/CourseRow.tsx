import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Layers,
  BookOpen,
  Target,
  CheckCircle2,
  GraduationCap,
  Clock,
  CalendarRange,
} from "lucide-react";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import { resolveCourseSemester, type AcademicSemester } from "@/lib/cleanSlateManager";
import { cn } from "@/lib/utils";

export interface CourseRowProps {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  description?: string | null;
  semester?: AcademicSemester;
  unreadUpdates?: number;
  actionLabel?: string;
  readinessScore?: number | null;
  progressPercent?: number | null;
  completedTopics?: number;
  totalTopics?: number;
  materialsCount?: number;
  quizzesCount?: number;
  questionsCount?: number;
  className?: string;
}

export const CourseRow = memo(function CourseRow({
  id,
  code,
  name,
  department,
  level,
  description,
  semester,
  unreadUpdates = 0,
  readinessScore,
  progressPercent,
  completedTopics = 0,
  totalTopics = 0,
  materialsCount = 0,
  quizzesCount = 0,
  questionsCount = 0,
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
  const [imgLoaded, setImgLoaded] = useState(false);

  const effectiveSemester =
    semester || resolveCourseSemester({ code, description, semester });

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
  const cleanLevel = level ? String(level).replace(/[^0-9]/g, "") || level : null;

  return (
    <div
      onClick={() => navigate(`/courses/${id}?tab=materials`)}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-3.5 sm:p-4 text-left transition-all duration-150 shadow-2xs hover:border-[#D4AF37] cursor-pointer select-none",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/courses/${id}?tab=materials`);
        }
      }}
      aria-label={`${code}: ${displayTitle} — ${effectivePercent}% completed`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Course Info with Photographic Thumbnail */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="relative h-16 w-20 sm:h-18 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-[#18181B] border border-[#E6E0D4] dark:border-border shadow-2xs">
            {!imgLoaded && (
              <div className="absolute inset-0 bg-[#18181B] animate-pulse flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[#D4AF37]/60" />
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
                "h-full w-full object-cover object-center transition-all duration-300 group-hover:scale-105",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
            <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-center font-mono text-[10px] font-extrabold text-[#F5D77F] bg-[#18181B]/90 rounded px-1 py-0.5">
              {code}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Metadata Badges Row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md border",
                  effectiveSemester === "1st"
                    ? "bg-[#18181B] text-[#D4AF37] border-[#18181B]"
                    : "bg-[#FAF8F5] text-[#18181B] border-[#D4AF37]/60"
                )}
              >
                <CalendarRange className="w-2.5 h-2.5 text-[#D4AF37]" />
                <span>{effectiveSemester === "1st" ? "1st Sem" : "2nd Sem"}</span>
              </span>

              {cleanLevel && (
                <span className="font-mono text-[10px] font-bold text-[#52525B] bg-[#FAF8F5] border border-[#E6E0D4] px-1.5 py-0.5 rounded-md">
                  {cleanLevel}L
                </span>
              )}

              <span className="text-[11px] font-bold text-[#9A7B1C] dark:text-amber-400 truncate max-w-[180px]">
                {displayDepartment || category}
              </span>

              {unreadUpdates > 0 && (
                <span className="inline-flex h-4 items-center rounded-md bg-[#D4AF37] px-1.5 font-mono text-[9px] font-extrabold text-[#18181B]">
                  +{unreadUpdates} new
                </span>
              )}

              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Exam Ready</span>
                </span>
              ) : isStarted ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#9A7B1C] bg-[#FAF0D6] px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3" />
                  <span>In Progress</span>
                </span>
              ) : null}
            </div>

            {/* Course Title */}
            <span className="block line-clamp-1 text-sm sm:text-[15px] font-display font-extrabold text-[#18181B] dark:text-foreground group-hover:text-[#9A7B1C] transition-colors mt-1">
              {displayTitle}
            </span>

            {/* Live Uploaded Content Indicators */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                  materialsCount > 0
                    ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/25"
                    : "bg-[#FAF8F5] text-[#71717A] border-[#E6E0D4]"
                )}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="font-mono tabular-nums font-bold">{materialsCount}</span>
                <span>{materialsCount === 1 ? "Handout / Note" : "Handouts & PDFs"}</span>
              </span>

              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border",
                  quizzesCount > 0
                    ? "bg-[#D4AF37]/15 text-[#18181B] border-[#D4AF37]/40"
                    : "bg-[#FAF8F5] text-[#71717A] border-[#E6E0D4]"
                )}
              >
                <Target className="w-3 h-3 shrink-0 text-[#9A7B1C]" />
                <span className="font-mono tabular-nums font-bold">{quizzesCount}</span>
                <span>
                  {quizzesCount === 1 ? "CBT Paper" : "CBT Papers"}
                  {questionsCount > 0 ? ` (${questionsCount} Qs)` : ""}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Direct Learning Buttons: Notes | Drills | CBT */}
        <div className="grid grid-cols-3 sm:flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=materials`);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-xs font-bold transition-colors cursor-pointer"
            title={`Read Notes & Handouts for ${code}`}
          >
            <FileText className="h-3.5 w-3.5 text-[#9A7B1C]" />
            <span>Notes</span>
            {materialsCount > 0 && (
              <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-[#18181B] text-[#D4AF37] font-extrabold">
                {materialsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=topics`);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-xs font-bold transition-colors cursor-pointer"
            title={`Practice Topic Drills for ${code}`}
          >
            <Layers className="h-3.5 w-3.5 text-[#9A7B1C]" />
            <span>Drills</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=quizzes`);
            }}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#F5D77F] text-xs font-bold transition-colors shadow-2xs cursor-pointer"
            title={`Start CBT Exam for ${code}`}
          >
            <Target className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>CBT</span>
            {quizzesCount > 0 && (
              <span className="font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded bg-[#D4AF37] text-[#18181B] font-extrabold">
                {quizzesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="pt-2 border-t border-[#EFECE6] dark:border-border/60">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-[11px] font-medium text-[#71717A]">
            {totalTopics > 0 ? (
              <span>
                <strong className="text-[#18181B] dark:text-foreground font-bold font-mono">
                  {completedTopics}/{totalTopics}
                </strong>{" "}
                topics mastered
              </span>
            ) : effectivePercent > 0 ? (
              <span>
                <strong className="text-[#18181B] dark:text-foreground font-bold font-mono">
                  {effectivePercent}%
                </strong>{" "}
                exam readiness score
              </span>
            ) : materialsCount > 0 || quizzesCount > 0 ? (
              <span className="text-[#18181B] font-medium">
                Ready for study — open <strong className="text-[#9A7B1C]">Notes</strong> or start{" "}
                <strong className="text-[#9A7B1C]">CBT Exam</strong>
              </span>
            ) : (
              <span>Step 1: Read Notes &amp; Handouts · Step 2: Topic Drills · Step 3: CBT</span>
            )}
          </span>

          <span className="font-mono text-xs font-bold tabular-nums text-[#18181B] dark:text-foreground">
            {effectivePercent}%
          </span>
        </div>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#FAF8F5] dark:bg-neutral-800 border border-[#E6E0D4] dark:border-border/40">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isCompleted
                ? "bg-emerald-600"
                : isStarted
                ? "bg-gradient-to-r from-[#D4AF37] to-[#B8860B]"
                : "bg-transparent"
            )}
            style={{ width: `${Math.min(100, Math.max(0, effectivePercent))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export function CourseRowSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E6E0D4] bg-white p-3.5 sm:p-4 text-left shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="h-16 w-20 sm:w-24 shrink-0 rounded-xl bg-muted animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-28 rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
          </div>
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
        "flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-[#E6E0D4] bg-white p-8 text-center",
        className
      )}
    >
      <BookOpen className="h-8 w-8 text-[#9A7B1C]" aria-hidden />
      <p className="mt-3 font-display text-sm font-extrabold text-[#18181B]">
        No courses available in this view yet
      </p>
      <p className="mt-1 text-xs text-[#71717A] max-w-xs">
        Explore your university curriculum or switch semesters to view uploaded handouts, notes, and CBT exams.
      </p>
      <button
        type="button"
        onClick={() => navigate("/courses")}
        className="mt-4 px-4 py-2 rounded-xl bg-[#18181B] text-[#F5D77F] text-xs font-bold transition-colors cursor-pointer"
      >
        Explore Semester Courses
      </button>
    </div>
  );
}

export default CourseRow;
