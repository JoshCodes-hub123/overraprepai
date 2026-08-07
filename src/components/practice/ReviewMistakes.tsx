import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Screen, ScreenHeader, BrandButton, EmptyState } from "@/components/ui-kit";
import { coachHref } from "@/lib/coachLink";
import { PracticeResponse } from "@/lib/practiceSession";

interface Props {
  courseId: string;
  courseCode: string | null;
  topicId: string;
  topicName: string | null;
  mistakes: PracticeResponse[];
  onBack: () => void;
}

/** One mistake at a time: what you picked, what was right, and why. */
export function ReviewMistakes({
  courseId,
  courseCode,
  topicId,
  topicName,
  mistakes,
  onBack,
}: Props) {
  const [i, setI] = useState(0);
  const m = mistakes[i];

  if (!m) {
    return (
      <Screen>
        <ScreenHeader back onBack={onBack} title="Review mistakes" />
        <EmptyState
          title="Nothing to review"
          description="You answered every question in this set correctly."
          action={<BrandButton onClick={onBack}>Back to results</BrandButton>}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        back
        onBack={onBack}
        chip={
          <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
            {courseCode ? `${courseCode} · Review` : "Review"}
          </span>
        }
        title={
          <span className="text-[17px] font-semibold text-brand-ink-soft">
            Mistake {i + 1} of {mistakes.length}
          </span>
        }
        subtitle={topicName ?? undefined}
      />

      <p className="text-[16.5px] leading-relaxed text-brand-ink">{m.questionText}</p>

      <div className="mt-5 space-y-2.5">
        <div className="rounded-brand border border-brand-line bg-brand-soft px-4 py-3.5">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
            Your answer
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-brand-ink">
            {m.picked}. {m.pickedText ?? "—"}
          </p>
        </div>
        <div className="rounded-brand border border-env bg-env-soft px-4 py-3.5">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
            Correct answer
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-brand-ink">
            {m.correct}. {m.correctText ?? "—"}
          </p>
        </div>
      </div>

      {m.explanation && (
        <div className="mt-5 rounded-brand-lg border border-brand-line bg-brand-surface p-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
            Explanation
          </p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-brand-ink-soft">
            {m.explanation}
          </p>
        </div>
      )}

      <Link
        to={coachHref({
          courseId,
          courseCode,
          topicId,
          topicName,
          question: m.questionText,
          studentAnswer: `${m.picked}. ${m.pickedText ?? ""}`.trim(),
          correctAnswer: `${m.correct}. ${m.correctText ?? ""}`.trim(),
        })}
        className="mt-5 flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-surface text-[15px] font-semibold text-env"
      >
        <Sparkles className="h-4 w-4" aria-hidden /> Ask Overra about this
      </Link>

      <div className="mt-6 flex items-center gap-3">
        <BrandButton
          variant="secondary"
          className="flex-1"
          onClick={() => setI((v) => Math.max(0, v - 1))}
          disabled={i === 0}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Previous
        </BrandButton>
        {i + 1 < mistakes.length ? (
          <BrandButton className="flex-1" onClick={() => setI((v) => v + 1)}>
            Next <ChevronRight className="h-4 w-4" aria-hidden />
          </BrandButton>
        ) : (
          <BrandButton className="flex-1" onClick={onBack}>
            Done
          </BrandButton>
        )}
      </div>
    </Screen>
  );
}

export default ReviewMistakes;
