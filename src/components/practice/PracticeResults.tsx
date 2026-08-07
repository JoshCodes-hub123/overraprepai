import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

import { Screen, ScreenHeader, BrandButton } from "@/components/ui-kit";
import { coachHref } from "@/lib/coachLink";
import { PracticeResponse } from "@/lib/practiceSession";

interface Props {
  courseId: string;
  courseCode: string | null;
  topicId: string;
  topicName: string | null;
  responses: PracticeResponse[];
  /** Real elapsed seconds for the session. */
  seconds: number;
  onReviewMistakes: () => void;
  onPracticeAgain: () => void;
  /** Where "back" goes. Defaults to the course workspace. */
  backTo?: string;
  backLabel?: string;
}

function formatDuration(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Results for one real practice session, answering four questions: how did I
 * do, what did I get wrong, where am I struggling, what should I do next.
 * Every number is counted from the answers just given.
 */
export function PracticeResults({
  courseId,
  courseCode,
  topicId,
  topicName,
  responses,
  seconds,
  onReviewMistakes,
  onPracticeAgain,
  backTo,
  backLabel,
}: Props) {
  const attempted = responses.length;
  const correct = responses.filter((r) => r.isCorrect).length;
  const incorrect = attempted - correct;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  return (
    <Screen>
      <ScreenHeader
        chip={
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
            {courseCode ? `${courseCode} · Results` : "Results"}
          </span>
        }
        title={`${correct} / ${attempted}`}
        subtitle={topicName ?? undefined}
      />

      {/* How did I do? */}
      <p className="-mt-3 text-[14.5px] leading-relaxed text-brand-ink-soft">
        You answered {correct} of {attempted} correctly ({accuracy}%)
        {seconds > 0 && <> in {formatDuration(seconds)}</>}.
      </p>

      {/* What did I get wrong? / Where am I struggling? */}
      {incorrect > 0 ? (
        <div className="mt-6 rounded-brand-lg border border-brand-line bg-brand-soft/60 p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
            What you got wrong
          </p>
          <p className="mt-2 text-[16px] font-semibold leading-snug text-brand-ink">
            {incorrect} question{incorrect === 1 ? "" : "s"} missed
          </p>
          {topicName && (
            <p className="mt-1 text-[13.5px] text-brand-ink-soft">
              All in this set: <span className="font-semibold text-brand-ink">{topicName}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-brand-lg border border-env bg-env-soft p-5">
          <p className="text-[16px] font-semibold leading-snug text-brand-ink">
            No mistakes in this set.
          </p>
          <p className="mt-1 text-[13.5px] text-brand-ink-soft">
            Nothing to review here — keep going.
          </p>
        </div>
      )}

      {/* What should I do next? */}
      <p className="mt-7 text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
        What to do next
      </p>
      <div className="mt-3 space-y-3">
        {incorrect > 0 && (
          <BrandButton block onClick={onReviewMistakes}>
            Review mistakes
          </BrandButton>
        )}
        {incorrect > 0 && (
          <BrandButton block variant="secondary" to="/weak-areas">
            Practise weak topics
          </BrandButton>
        )}
        <BrandButton
          block
          variant={incorrect > 0 ? "secondary" : undefined}
          onClick={onPracticeAgain}
        >
          Practise again
        </BrandButton>

        <Link
          to={coachHref({
            courseId,
            courseCode,
            topicId,
            topicName,
            prompt: topicName
              ? `I just practised ${topicName}${courseCode ? ` in ${courseCode}` : ""} and scored ${correct}/${attempted}. What should I focus on next?`
              : null,
          })}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-env"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Ask Overra
        </Link>

        <Link
          to={`/courses/${courseId}`}
          className="flex min-h-[48px] items-center justify-center gap-1.5 text-[14px] font-semibold text-brand-ink-soft"
        >
          Back to {courseCode ?? "course"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </Screen>
  );
}

export default PracticeResults;
