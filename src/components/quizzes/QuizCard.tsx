import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, ListChecks, Flame, Sparkles, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export function QuizCard({ quiz }: { quiz: QuizCardData }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="group relative overflow-hidden rounded-2xl border-2 border-amber-300/70 bg-card shadow-[0_8px_24px_-12px_hsl(38_80%_45%/.35)] hover:shadow-[0_18px_36px_-16px_hsl(38_80%_45%/.45)] transition-shadow"
    >
      {/* Gold corner glow */}
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-300/40 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300" />

      <div className="relative p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {quiz.course?.code && (
              <span className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">
                {quiz.course.code}
              </span>
            )}
            <h3 className="mt-1 text-base sm:text-lg font-bold leading-snug text-foreground line-clamp-2">
              {quiz.title}
            </h3>
          </div>
          {quiz.badge === "trending" && (
            <Badge className="shrink-0 bg-amber-500 hover:bg-amber-500 text-white border-0 gap-1">
              <Flame className="h-3 w-3" /> Hot
            </Badge>
          )}
          {quiz.badge === "new" && (
            <Badge className="shrink-0 bg-emerald-600 hover:bg-emerald-600 text-white border-0 gap-1">
              <Sparkles className="h-3 w-3" /> New
            </Badge>
          )}
        </div>

        {quiz.description && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="h-3.5 w-3.5 text-amber-600" />
            {quiz.question_count} Qs
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            {quiz.duration_minutes} min
          </span>
          {quiz.is_simulation && (
            <Badge variant="outline" className="border-amber-400 text-amber-700">CBT</Badge>
          )}
          {quiz.level && (
            <Badge variant="outline" className="border-muted">{quiz.level}</Badge>
          )}
        </div>

        <Link
          to={`/quiz/${quiz.id}`}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold px-4 py-2.5 text-sm shadow hover:shadow-lg active:scale-[0.98] transition"
        >
          Start Quiz
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
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
