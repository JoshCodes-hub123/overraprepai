import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  MinusCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MathMarkdown } from "@/components/quiz/MathMarkdown";

interface Props {
  attemptId: string;
  quizId: string;
}

interface ReviewRow {
  id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean | null;
  question: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation: string | null;
    topic?: { name: string } | null;
  };
}

const LETTERS = ["A", "B", "C", "D"] as const;

export const QuizReviewList = ({ attemptId, quizId }: Props) => {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [aiByQuestion, setAiByQuestion] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Fetch student's recorded answers for this attempt.
        const { data: answers, error: aErr } = await supabase
          .from("quiz_answers")
          .select("id, question_id, selected_option, is_correct")
          .eq("attempt_id", attemptId);
        if (aErr) throw aErr;

        // 2. Fetch all questions in the quiz (ordered) so we can show
        //    unanswered ones too.
        const { data: qq, error: qErr } = await supabase
          .from("quiz_questions")
          .select("order_index, questions(*, topics(name))")
          .eq("quiz_id", quizId)
          .order("order_index");
        if (qErr) throw qErr;

        const answerMap = new Map<string, { id: string; selected_option: string | null; is_correct: boolean | null }>();
        (answers ?? []).forEach((a: any) => answerMap.set(a.question_id, a));

        const merged: ReviewRow[] = (qq ?? []).map((row: any) => {
          const q = row.questions;
          const a = answerMap.get(q.id);
          return {
            id: a?.id ?? `unanswered-${q.id}`,
            question_id: q.id,
            selected_option: a?.selected_option ?? null,
            is_correct: a?.is_correct ?? null,
            question: { ...q, topic: q.topics },
          };
        });

        setRows(merged);
        // Auto-expand the first wrong/unanswered to nudge learning
        const firstMistake = merged.find((r) => !r.is_correct);
        if (firstMistake) setOpenIds(new Set([firstMistake.question_id]));
      } catch (e) {
        console.error("Failed to load review", e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [attemptId, quizId]);

  const visible = useMemo(
    () => (filter === "wrong" ? rows.filter((r) => !r.is_correct) : rows),
    [rows, filter],
  );

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const getAIExplanation = async (row: ReviewRow) => {
    if (aiByQuestion[row.question_id] || loadingAi) return;
    setLoadingAi(row.question_id);
    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: row.question.question_text,
          options: {
            A: row.question.option_a,
            B: row.question.option_b,
            C: row.question.option_c,
            D: row.question.option_d,
          },
          correctOption: row.question.correct_option,
          userAnswer: row.selected_option,
          topic: row.question.topic?.name,
          tone: "default",
        },
      });
      if (error) throw error;
      setAiByQuestion((prev) => ({ ...prev, [row.question_id]: data.explanation }));
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Couldn't get explanation",
        description: e?.message ?? "Try again in a moment.",
      });
    } finally {
      setLoadingAi(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading review…
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-6">
        No questions to review.
      </p>
    );
  }

  const wrongCount = rows.filter((r) => !r.is_correct).length;

  return (
    <section className="mt-6 bg-card rounded-2xl border border-border overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-950/10">
        <div>
          <h3 className="font-display font-bold text-foreground text-base sm:text-lg">Review every question</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            Tap a question to see your answer, the correct answer, and an AI explanation.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs shrink-0">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "px-2.5 py-1.5 font-semibold",
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
            )}
          >
            All ({rows.length})
          </button>
          <button
            onClick={() => setFilter("wrong")}
            className={cn(
              "px-2.5 py-1.5 font-semibold border-l border-border",
              filter === "wrong" ? "bg-destructive text-destructive-foreground" : "bg-background text-muted-foreground",
            )}
          >
            Mistakes ({wrongCount})
          </button>
        </div>
      </header>

      <ol className="divide-y divide-border">
        {visible.map((row, idx) => {
          const isOpen = openIds.has(row.question_id);
          const correct = row.question.correct_option;
          const picked = row.selected_option;
          const status: "correct" | "wrong" | "skipped" =
            picked == null ? "skipped" : picked === correct ? "correct" : "wrong";
          return (
            <li key={row.question_id} className="px-4 sm:px-5 py-3">
              <button
                onClick={() => toggle(row.question_id)}
                className="w-full flex items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "shrink-0 mt-0.5 w-7 h-7 rounded-lg grid place-items-center text-[11px] font-bold",
                    status === "correct" && "bg-success/15 text-success",
                    status === "wrong" && "bg-destructive/15 text-destructive",
                    status === "skipped" && "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm sm:text-[15px] font-medium text-foreground line-clamp-2">
                    <MathMarkdown content={row.question.question_text} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    {status === "correct" && (
                      <span className="inline-flex items-center gap-1 text-success font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Correct
                      </span>
                    )}
                    {status === "wrong" && (
                      <span className="inline-flex items-center gap-1 text-destructive font-semibold">
                        <XCircle className="w-3 h-3" /> Your answer: {picked}
                      </span>
                    )}
                    {status === "skipped" && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">
                        <MinusCircle className="w-3 h-3" /> Skipped
                      </span>
                    )}
                    {status !== "correct" && (
                      <span className="text-muted-foreground">
                        · Correct: <span className="font-bold text-foreground">{correct}</span>
                      </span>
                    )}
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>

              {isOpen && (
                <div className="mt-3 pl-10 space-y-2">
                  {LETTERS.map((k) => {
                    const text = (row.question as any)[`option_${k.toLowerCase()}`] as string;
                    const isCorrect = k === correct;
                    const isPicked = k === picked;
                    return (
                      <div
                        key={k}
                        className={cn(
                          "flex items-start gap-2 p-2.5 rounded-lg border text-sm",
                          isCorrect && "bg-success/10 border-success/40",
                          !isCorrect && isPicked && "bg-destructive/10 border-destructive/40",
                          !isCorrect && !isPicked && "bg-background border-border",
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 w-6 h-6 rounded grid place-items-center text-[11px] font-bold",
                            isCorrect && "bg-success text-success-foreground",
                            !isCorrect && isPicked && "bg-destructive text-destructive-foreground",
                            !isCorrect && !isPicked && "bg-muted text-muted-foreground",
                          )}
                        >
                          {k}
                        </span>
                        <div className="flex-1 text-foreground">
                          <MathMarkdown content={text} />
                        </div>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />}
                        {!isCorrect && isPicked && <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}

                  {row.question.explanation && (
                    <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      <MathMarkdown content={row.question.explanation} />
                    </div>
                  )}

                  {aiByQuestion[row.question_id] ? (
                    <div className="p-3 rounded-lg border border-amber-300/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">AI Step-by-Step Breakdown</span>
                      </div>
                      <div className="text-sm text-foreground leading-relaxed">
                        <MathMarkdown content={aiByQuestion[row.question_id]} />
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => getAIExplanation(row)}
                      disabled={loadingAi === row.question_id}
                      className="w-full sm:w-auto"
                    >
                      {loadingAi === row.question_id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-2 text-amber-600" />
                      )}
                      Get AI Explanation
                    </Button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default QuizReviewList;
