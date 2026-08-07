import { useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  useCourseTopics,
  useTopicQuestions,
  useRecordTopicPractice,
  PracticeQuestion,
} from "@/hooks/useCourseLearning";
import { PracticeResponse } from "@/lib/practiceSession";
import { coachHref } from "@/lib/coachLink";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import PracticeResults from "@/components/practice/PracticeResults";
import ReviewMistakes from "@/components/practice/ReviewMistakes";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"] as const;

function optionText(q: PracticeQuestion, letter: string) {
  switch (letter.toUpperCase()) {
    case "A":
      return q.option_a;
    case "B":
      return q.option_b;
    case "C":
      return q.option_c;
    default:
      return q.option_d;
  }
}

type Phase = "run" | "results" | "review";

/**
 * The practice runner and the loop that follows it: answer → results →
 * review mistakes → ask Overra → practise again. Everything shown afterwards
 * is computed from the answers captured here.
 */
const TopicPractice = () => {
  const { courseId = "", topicId = "" } = useParams();
  const navigate = useNavigate();

  const { data: course } = useQuery({
    queryKey: ["course-workspace", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, level, department, university_code")
        .eq("id", courseId)
        .maybeSingle();
      return data;
    },
  });

  const { data: topics = [] } = useCourseTopics(courseId);
  const topic = topics.find((t) => t.id === topicId) ?? null;
  const { data: questions = [], isLoading, refetch } = useTopicQuestions(topicId, 20);
  const record = useRecordTopicPractice();

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [responses, setResponses] = useState<PracticeResponse[]>([]);
  const [phase, setPhase] = useState<Phase>("run");
  const [seconds, setSeconds] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const savedRef = useRef(false);

  const q = questions[index];
  const mistakes = useMemo(() => responses.filter((r) => !r.isCorrect), [responses]);

  const choose = (letter: string) => {
    if (picked || !q) return;
    const L = letter.toUpperCase();
    const correct = q.correct_option.toUpperCase();
    setPicked(L);
    setResponses((prev) => [
      ...prev,
      {
        questionId: q.id,
        questionText: q.question_text,
        picked: L,
        pickedText: optionText(q, L) ?? null,
        correct,
        correctText: optionText(q, correct) ?? null,
        explanation: q.explanation,
        isCorrect: L === correct,
      },
    ]);
  };

  const advance = async () => {
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setPicked(null);
      return;
    }
    setSeconds(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
    setPhase("results");
    if (topic && !savedRef.current) {
      savedRef.current = true;
      const correct = responses.filter((r) => r.isCorrect).length;
      await record(topic.name, correct, responses.length);

    }
  };

  const restart = async () => {
    savedRef.current = false;
    setResponses([]);
    setIndex(0);
    setPicked(null);
    setSeconds(0);
    startedAt.current = Date.now();
    setPhase("run");
    await refetch();
  };

  if (isLoading) {
    return (
      <Screen>
        <div className="pt-8 space-y-4">
          <BrandSkeleton h={32} />
          <BrandSkeleton h={140} />
          <BrandSkeleton h={56} />
          <BrandSkeleton h={56} />
        </div>
      </Screen>
    );
  }

  if (!questions.length) {
    return (
      <Screen>
        <ScreenHeader back title={topic?.name ?? "Practice"} />
        <EmptyState
          title="No practice available yet"
          description="We're preparing questions for this topic."
          action={<BrandButton to={`/courses/${courseId}`}>Back to course</BrandButton>}
        />
      </Screen>
    );
  }

  if (phase === "review") {
    return (
      <>
        <SEO title="Review mistakes" noindex />
        <ReviewMistakes
          courseId={courseId}
          courseCode={course?.code ?? null}
          topicId={topicId}
          topicName={topic?.name ?? null}
          mistakes={mistakes}
          onBack={() => setPhase("results")}
        />
      </>
    );
  }

  if (phase === "results") {
    return (
      <>
        <SEO title="Practice results" noindex />
        <PracticeResults
          courseId={courseId}
          courseCode={course?.code ?? null}
          topicId={topicId}
          topicName={topic?.name ?? null}
          responses={responses}
          seconds={seconds}
          onReviewMistakes={() => setPhase("review")}
          onPracticeAgain={restart}
        />
      </>
    );
  }

  const isCorrect = picked ? picked === q.correct_option.toUpperCase() : null;

  return (
    <>
      <SEO title={`${course?.code ?? "Practice"} — practice`} noindex />
      <Screen>
        <ScreenHeader
          back
          onBack={() => navigate(`/courses/${courseId}/topics/${topicId}`)}
          chip={
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
              {course?.code}
            </span>
          }
          title={
            <span className="text-[17px] font-semibold text-brand-ink-soft">
              Question {index + 1} of {questions.length}
            </span>
          }
        />

        <p className="text-[17px] leading-relaxed text-brand-ink">{q.question_text}</p>
        {q.image_url && (
          <img
            src={q.image_url}
            alt=""
            loading="lazy"
            className="mt-4 w-full rounded-brand border border-brand-line"
          />
        )}

        <div className="mt-6 space-y-2.5">
          {LETTERS.map((letter) => {
            const text = optionText(q, letter);
            if (!text) return null;
            const isAnswer = letter === q.correct_option.toUpperCase();
            const chosen = picked === letter;
            return (
              <button
                key={letter}
                type="button"
                onClick={() => choose(letter)}
                disabled={!!picked}
                className={cn(
                  "flex w-full min-h-[56px] items-start gap-3 rounded-brand border px-4 py-3.5 text-left transition-colors",
                  !picked && "border-brand-line bg-brand-surface hover:bg-brand-soft",
                  picked && isAnswer && "border-env bg-env-soft",
                  picked && chosen && !isAnswer && "border-brand-line bg-brand-soft",
                  picked && !isAnswer && !chosen && "border-brand-line bg-brand-surface opacity-60",
                )}
              >
                <span className="mt-0.5 w-5 shrink-0 text-[14px] font-bold text-brand-ink-soft">
                  {letter}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-relaxed text-brand-ink">
                  {text}
                </span>
                {picked && isAnswer && <Check className="mt-0.5 h-4.5 w-4.5 shrink-0 text-env" aria-hidden />}
                {picked && chosen && !isAnswer && (
                  <X className="mt-0.5 h-4.5 w-4.5 shrink-0 text-brand-ink-soft" aria-hidden />
                )}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-6 rounded-brand-lg border border-brand-line bg-brand-soft/60 p-4">
            <p className="text-[12.5px] font-bold uppercase tracking-[0.16em] text-brand-ink">
              {isCorrect ? "Correct" : "Not quite"}
            </p>
            {!isCorrect && (
              <p className="mt-2 text-[14.5px] text-brand-ink">
                <span className="font-semibold">Correct answer: </span>
                {q.correct_option.toUpperCase()}. {optionText(q, q.correct_option)}
              </p>
            )}
            {q.explanation ? (
              <>
                <p className="mt-3 text-[12.5px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
                  Why?
                </p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-brand-ink-soft">
                  {q.explanation}
                </p>
              </>
            ) : (
              <Link
                to={coachHref({
                  courseId,
                  courseCode: course?.code ?? null,
                  topicId,
                  topicName: topic?.name ?? null,
                  question: q.question_text,
                  studentAnswer: `${picked}. ${optionText(q, picked) ?? ""}`.trim(),
                  correctAnswer: `${q.correct_option.toUpperCase()}. ${optionText(q, q.correct_option) ?? ""}`.trim(),
                })}
                className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-env"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ask Overra to explain
              </Link>
            )}

            <BrandButton block className="mt-4" onClick={advance}>
              {index + 1 < questions.length ? "Next question" : "See results"}
            </BrandButton>
          </div>
        )}
      </Screen>
    </>
  );
};

export default TopicPractice;
