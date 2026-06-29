import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ListChecks, Flame, Sparkles, ArrowRight, CheckCircle2, PlayCircle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { QuizProgress } from "@/hooks/useQuizProgress";

export type QuizCardData = {
  id: string;
  title: string;
  description?: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium?: boolean;
  is_simulation?: boolean;
  level?: string | null;
  course?: { code?: string | null; name?: string | null } | null;
  attempts?: number;
  badge?: "trending" | "new" | null;
};

export function QuizCard({ quiz, progress }: { quiz: QuizCardData; progress?: QuizProgress }) {
  const isResume = progress?.status === "in_progress";
  const isDone = progress?.status === "completed";

  const ctaLabel = isResume ? "Resume" : isDone ? "Retake" : "Start";
  const ctaIcon = isResume ? PlayCircle : isDone ? Trophy : ArrowRight;
  const CtaIcon = ctaIcon;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border-2 border-amber-300/70 bg-card shadow-[0_8px_24px_-12px_hsl(38_80%_45%/.35)] hover:shadow-[0_18px_36px_-16px_hsl(38_80%_45%/.45)] transition-shadow flex flex-col"
    >
      {/* Gold corner glow */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-300/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />

      <Link
        to={`/quiz/${quiz.id}`}
        className="relative p-4 sm:p-5 flex flex-col gap-3 flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-2xl"
      >
        {/* Top row: course code + badges (chip-style, wraps so it never overlaps title) */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {quiz.course?.code && (
            <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold tracking-wider text-amber-800 uppercase max-w-full truncate">
              {quiz.course.code}
            </span>
          )}
          {quiz.badge === "trending" && (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-0 gap-1 px-1.5 py-0 h-5 text-[10px]">
              <Flame className="h-3 w-3" /> Hot
            </Badge>
          )}
          {quiz.badge === "new" && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-0 gap-1 px-1.5 py-0 h-5 text-[10px]">
              <Sparkles className="h-3 w-3" /> New
            </Badge>
          )}
          {isResume && (
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 gap-1 px-1.5 py-0 h-5 text-[10px]">
              <PlayCircle className="h-3 w-3" /> In progress
            </Badge>
          )}
          {isDone && (
            <Badge className="bg-emerald-700 hover:bg-emerald-700 text-white border-0 gap-1 px-1.5 py-0 h-5 text-[10px]">
              <CheckCircle2 className="h-3 w-3" />
              {progress?.bestScore != null ? `${progress.bestScore}%` : "Done"}
            </Badge>
          )}
        </div>

        {/* Title — full width, no right-side competition */}
        <h3 className="text-[15px] sm:text-lg font-bold leading-snug text-foreground line-clamp-2 break-words">
          {quiz.title}
        </h3>

        {quiz.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words">
            {quiz.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-auto">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5 text-amber-600" />
            {quiz.question_count} Qs
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {quiz.duration_minutes} min
          </span>
          {quiz.is_simulation && (
            <Badge variant="outline" className="border-amber-400 text-amber-700 px-1.5 py-0 h-5 text-[10px]">CBT</Badge>
          )}
          {quiz.level && (
            <Badge variant="outline" className="border-muted px-1.5 py-0 h-5 text-[10px]">{quiz.level}</Badge>
          )}
        </div>
      </Link>

      {/* CTA — separate so the full card link + button don't fight */}
      <div className="relative px-4 sm:px-5 pb-4 sm:pb-5">
        <Link
          to={`/quiz/${quiz.id}`}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold px-4 py-2.5 text-sm shadow active:scale-[0.98] transition ${
            isResume
              ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg"
              : "bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg"
          }`}
          aria-label={`${ctaLabel} ${quiz.title}`}
        >
          <CtaIcon className="h-4 w-4" />
          {ctaLabel} Quiz
        </Link>
      </div>
    </motion.div>
  );
}

export function QuizCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-amber-200/60 bg-card p-4 sm:p-5 animate-pulse">
      <div className="h-3 w-16 bg-amber-100 rounded mb-2" />
      <div className="h-5 w-3/4 bg-muted rounded mb-3" />
      <div className="h-3 w-full bg-muted rounded mb-2" />
      <div className="h-3 w-2/3 bg-muted rounded mb-4" />
      <div className="h-9 w-full bg-amber-100 rounded-xl" />
    </div>
  );
}
