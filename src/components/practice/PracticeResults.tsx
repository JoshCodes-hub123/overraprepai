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
}

function formatDuration(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Results for one real practice session. Every number below is counted from
 * the answers the student just gave — nothing is estimated or filled in.
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
}: Props) {
  const attempted = responses.length;
  const correct = responses.filter((r) => r.isCorrect).length;
  const incorrect = attempted - correct;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  // The primary action follows actual performance, never a fixed script.
  const primary =
    incorrect > 0
      ? accuracy < 60
        ? { label: "Practice weak areas", action: onPracticeAgain }
        : { label: "Review mistakes", action: onReviewMistakes }
      : null;

  const stats: { label: string; value: string }[] = [
    { label: "Attempted", value: String(attempted) },
    { label: "Correct", value: String(correct) },
    { label: "Incorrect", value: String(incorrect) },
    { label: "Accuracy", value: `${accuracy}%` },
  ];
  if (seconds > 0) stats.push({ label: "Time spent", value: formatDuration(seconds) });

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

      <dl className="grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5"
          >
            <dt className="text-[12px] font-semibold uppercase tracking-[0.12em] text-brand-ink-soft">
              {s.label}
            </dt>
            <dd className="mt-1 text-[20px] font-bold tabular-nums leading-none text-brand-ink">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {incorrect > 0 && (
        <div className="mt-6 rounded-brand-lg border border-brand-line bg-brand-soft/60 p-5">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
            Needs attention
          </p>
          <p className="mt-2 text-[16px] font-semibold leading-snug text-brand-ink">
            {topicName ?? "This topic"}
          </p>
          <p className="mt-1 text-[13.5px] text-brand-ink-soft">
            You missed {incorrect} question{incorrect === 1 ? "" : "s"} in this set.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {primary && (
          <BrandButton block onClick={primary.action}>
            {primary.label}
          </BrandButton>
        )}
        {incorrect > 0 && primary?.label !== "Review mistakes" && (
          <BrandButton block variant="secondary" onClick={onReviewMistakes}>
            Review mistakes
          </BrandButton>
        )}
        {incorrect === 0 && (
          <BrandButton block to={`/courses/${courseId}`}>
            Continue learning
          </BrandButton>
        )}
        <BrandButton block variant="secondary" onClick={onPracticeAgain}>
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
          <Sparkles className="h-4 w-4" aria-hidden /> Ask Overra AI
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
