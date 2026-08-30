import { Link } from "react-router-dom";
import { Flame, Target, ArrowRight, ListChecks } from "lucide-react";

import { AnimatedCounter } from "@/components/dashboard/AnimatedCounter";
import { useStudyStreak, useCompletedTopics, useNextRecommendedQuiz } from "@/hooks/useLearningProgress";
import { BrandSkeleton } from "@/components/ui-kit";

/**
 * Three small progress facts: how consistent am I, how much have I mastered,
 * and what should I take next. Every value is real, from the student's data.
 */
export function ProgressCards() {
  const { data: streak, isLoading: streakLoading } = useStudyStreak();
  const { studied, mastered, isLoading: topicsLoading } = useCompletedTopics();
  const { data: nextQuiz, isLoading: quizLoading } = useNextRecommendedQuiz();

  if (streakLoading || topicsLoading || quizLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BrandSkeleton h={110} />
        <BrandSkeleton h={110} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="rounded-3xl border border-brand-line bg-brand-surface p-4">
        <Flame className="h-5 w-5 text-env" aria-hidden />
        <p className="mt-3 font-display text-[26px] font-bold leading-none tracking-tight text-brand-ink">
          <AnimatedCounter value={streak?.current ?? 0} />
        </p>
        <p className="mt-1.5 text-[12.5px] font-medium text-brand-ink-soft">
          day streak{streak?.longest ? ` · best ${streak.longest}` : ""}
        </p>
      </div>

      <div className="rounded-3xl border border-brand-line bg-brand-surface p-4">
        <Target className="h-5 w-5 text-env" aria-hidden />
        <p className="mt-3 font-display text-[26px] font-bold leading-none tracking-tight text-brand-ink">
          <AnimatedCounter value={mastered} />
          <span className="text-[16px] font-semibold text-brand-ink-soft">/{studied || 0}</span>
        </p>
        <p className="mt-1.5 text-[12.5px] font-medium text-brand-ink-soft">topics mastered</p>
      </div>

      {nextQuiz ? (
        <Link
          to={`/quiz/${nextQuiz.id}`}
          className="col-span-2 flex flex-col rounded-3xl border border-env bg-env-soft p-4 transition-all hover:-translate-y-0.5 sm:col-span-1"
        >
          <ListChecks className="h-5 w-5 text-env" aria-hidden />
          <p className="mt-3 line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight text-brand-ink">
            {nextQuiz.title}
          </p>
          <p className="mt-auto flex items-center gap-1 pt-2 text-[12.5px] font-semibold text-env">
            {nextQuiz.course_code ? `${nextQuiz.course_code} · ` : ""}
            {nextQuiz.question_count ? `${nextQuiz.question_count} questions` : "Start quiz"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </p>
        </Link>
      ) : (
        <Link
          to="/practice"
          className="col-span-2 flex flex-col rounded-3xl border border-brand-line bg-brand-soft p-4 sm:col-span-1"
        >
          <ListChecks className="h-5 w-5 text-env" aria-hidden />
          <p className="mt-3 font-display text-[15px] font-semibold leading-snug tracking-tight text-brand-ink">
            You're up to date
          </p>
          <p className="mt-auto flex items-center gap-1 pt-2 text-[12.5px] font-semibold text-env">
            Practise past questions <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </p>
        </Link>
      )}
    </div>
  );
}

export default ProgressCards;
