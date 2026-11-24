import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Layers,
  Target,
  CheckCircle2,
  Clock,
  GraduationCap,
} from "lucide-react";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import { resolveCourseSemester, type AcademicSemester } from "@/lib/cleanSlateManager";
import { cn } from "@/lib/utils";

export interface CourseCoverCardProps {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  description?: string | null;
  semester?: AcademicSemester;
  unreadUpdates?: number;
  readinessScore?: number | null;
  progressPercent?: number | null;
  completedTopics?: number;
  totalTopics?: number;
  materialsCount?: number;
  quizzesCount?: number;
  questionsCount?: number;
  className?: string;
}

export const CourseCoverCard = memo(function CourseCoverCard({
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
}: CourseCoverCardProps) {
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
  const [imgError, setImgError] = useState(false);

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
  const units = /101|102|201|202|301|302/i.test(code) ? "3 Units" : "2 Units";

  return (
    <article
      onClick={() => navigate(`/courses/${id}?tab=materials`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/courses/${id}?tab=materials`);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${code}: ${displayTitle} — ${effectivePercent}% completed`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37] shadow-[0_8px_24px_-12px_rgba(24,24,27,0.08)] hover:shadow-[0_18px_36px_-14px_rgba(212,175,55,0.28)] cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
        className
      )}
    >
      {/* Full-Bleed Photographic Course Cover */}
      <div className="relative h-44 w-full overflow-hidden bg-[#18181B] shrink-0">
        {!imgError ? (
          <img
            src={currentSrc}
            alt={`${code} — ${displayTitle}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => {
              if (currentSrc !== fallbackUrl) {
                setCurrentSrc(fallbackUrl);
              } else {
                setImgError(true);
              }
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div
            className={cn(
              "h-full w-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-br",
              gradient
            )}
          >
            <GraduationCap className="h-7 w-7 text-[#F5D77F]/80" aria-hidden />
            <span className="font-display text-xs font-bold text-white/90 text-center">
              {category}
            </span>
          </div>
        )}

        {/* Measured Scrim for Guaranteed Contrast */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/25"
          aria-hidden
        />

        {/* Top Overlay: Course Code + Semester / Status */}
        <div className="absolute inset-x-3.5 top-3.5 z-10 flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-lg bg-[#18181B]/90 px-2.5 py-1 font-mono text-xs font-extrabold tracking-wider text-[#F5D77F] border border-[#D4AF37]/40 backdrop-blur-md shadow-xs">
            {code}
          </span>

          <div className="flex items-center gap-1.5">
            {unreadUpdates > 0 && (
              <span className="inline-flex items-center rounded-md bg-[#D4AF37] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#18181B] shadow-xs">
                +{unreadUpdates} new
              </span>
            )}
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                <span>Exam Ready</span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-white/95 border border-white/15 backdrop-blur-md">
                {effectiveSemester === "1st" ? "1st Sem" : "2nd Sem"}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Cover Caption */}
        <div className="pointer-events-none absolute inset-x-3.5 bottom-3 z-10 flex items-end justify-between gap-2 text-white">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-white/85">
              {category}
            </p>
            {(materialsCount > 0 || quizzesCount > 0) && (
              <p className="mt-0.5 truncate font-mono text-[10.5px] font-bold text-[#F5D77F]">
                {materialsCount} Handout{materialsCount === 1 ? "" : "s"} · {quizzesCount} CBT
                {questionsCount > 0 ? ` (${questionsCount} Qs)` : ""}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-white/95 backdrop-blur-sm">
            {units}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between gap-3.5 p-4">
        <div>
          <h3 className="font-display text-[15.5px] font-extrabold leading-snug text-[#18181B] dark:text-foreground line-clamp-2 group-hover:text-[#996515] dark:group-hover:text-amber-400 transition-colors">
            {displayTitle}
          </h3>

          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#71717A] dark:text-muted-foreground">
            <span className="truncate font-medium">{displayDepartment}</span>
            {cleanLevel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0 font-mono tabular-nums">{cleanLevel}L</span>
              </>
            )}
            {isStarted && !isCompleted && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#996515] dark:text-amber-400">
                  <Clock className="h-3 w-3" aria-hidden />
                  <span>In progress</span>
                </span>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-[#71717A] dark:text-muted-foreground">
                {totalTopics > 0
                  ? `${completedTopics}/${totalTopics} topics mastered`
                  : effectivePercent > 0
                  ? "Exam readiness"
                  : "Ready for study"}
              </span>
              <span className="font-mono font-bold tabular-nums text-[#18181B] dark:text-foreground">
                {effectivePercent}%
              </span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#FAF8F5] dark:bg-muted border border-[#E6E0D4] dark:border-border/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCompleted
                    ? "bg-emerald-600"
                    : isStarted
                    ? "bg-gradient-to-r from-[#D4AF37] to-[#B8860B]"
                    : "bg-transparent"
                )}
                style={{ width: `${effectivePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 3 Direct Learning Buttons */}
        <div className="grid grid-cols-3 gap-1.5 border-t border-[#EFECE6] dark:border-border/60 pt-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=materials`);
            }}
            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-[#E6E0D4] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 px-2 text-[11px] font-bold text-[#18181B] dark:text-foreground hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            title={`Read Notes & Handouts for ${code}`}
          >
            <FileText className="h-3.5 w-3.5 shrink-0 text-[#9A7B1C] dark:text-amber-400" aria-hidden />
            <span>Notes</span>
            {materialsCount > 0 && (
              <span className="font-mono text-[10px] font-extrabold tabular-nums text-[#996515] dark:text-amber-400">
                ({materialsCount})
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=topics`);
            }}
            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl border border-[#E6E0D4] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 px-2 text-[11px] font-bold text-[#18181B] dark:text-foreground hover:border-[#D4AF37] transition-colors cursor-pointer whitespace-nowrap"
            title={`Practice Topic Drills for ${code}`}
          >
            <Layers className="h-3.5 w-3.5 shrink-0 text-[#9A7B1C] dark:text-amber-400" aria-hidden />
            <span>Drills</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/courses/${id}?tab=quizzes`);
            }}
            className="inline-flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-[#18181B] hover:bg-[#27272A] px-2 text-[11px] font-bold text-[#F5D77F] transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            title={`Start CBT Exam for ${code}`}
          >
            <Target className="h-3.5 w-3.5 shrink-0 text-[#D4AF37]" aria-hidden />
            <span>CBT</span>
            {quizzesCount > 0 && (
              <span className="font-mono text-[10px] font-extrabold tabular-nums text-[#D4AF37]">
                ({quizzesCount})
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
});

export function CourseCoverCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card shadow-2xs">
      <div className="h-44 w-full bg-muted animate-pulse" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-1.5 w-full rounded-full bg-muted animate-pulse" />
        <div className="grid grid-cols-3 gap-1.5 pt-2">
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default CourseCoverCard;
