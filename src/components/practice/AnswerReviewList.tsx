import { useState } from "react";
import { CheckCircle2, XCircle, Sparkles, Loader2, ChevronDown } from "lucide-react";

import { PracticeResponse } from "@/lib/practiceSession";
import { getAIExplanation, readCachedExplanation } from "@/lib/aiExplain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  responses: PracticeResponse[];
  topicName?: string | null;
  /** Show only the questions the student got wrong. */
  onlyWrong?: boolean;
}

/**
 * Colour-coded answer review with on-demand AI explanations.
 * Green = you got it right, red = you missed it, and every card can ask
 * Overra AI for a step-by-step explanation (cached after the first time).
 */
export function AnswerReviewList({ responses, topicName, onlyWrong }: Props) {
  const items = onlyWrong ? responses.filter((r) => !r.isCorrect) : responses;
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [ai, setAi] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const explain = async (r: PracticeResponse) => {
    const input = {
      questionId: r.questionId,
      question: r.questionText,
      options: {
        A: r.correct === "A" ? r.correctText ?? "" : r.picked === "A" ? r.pickedText ?? "" : "",
        B: r.correct === "B" ? r.correctText ?? "" : r.picked === "B" ? r.pickedText ?? "" : "",
        C: r.correct === "C" ? r.correctText ?? "" : r.picked === "C" ? r.pickedText ?? "" : "",
        D: r.correct === "D" ? r.correctText ?? "" : r.picked === "D" ? r.pickedText ?? "" : "",
      },
      correctOption: (["A", "B", "C", "D"].includes(r.correct) ? r.correct : "A") as "A" | "B" | "C" | "D",
      userAnswer: r.picked,
      topic: topicName ?? null,
    };
    const cached = readCachedExplanation(input);
    if (cached) {
      setAi((p) => ({ ...p, [r.questionId]: cached }));
      return;
    }
    setBusy(r.questionId);
    try {
      const text = await getAIExplanation(input);
      setAi((p) => ({ ...p, [r.questionId]: text }));
    } catch (e: any) {
      if (e?.message !== "paywall") {
        toast.error("Couldn't generate an explanation. Please try again.");
      }
    } finally {
      setBusy(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map((r, idx) => {
        const isOpen = open.has(r.questionId);
        return (
          <div
            key={r.questionId}
            className={cn(
              "overflow-hidden rounded-brand-lg border",
              r.isCorrect
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-rose-200 bg-rose-50/60",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(r.questionId)}
              className="flex w-full items-start gap-3 p-4 text-left"
            >
              {r.isCorrect ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
              )}
              <span className="flex-1">
                <span className="block text-[12px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
                  Question {idx + 1}
                </span>
                <span className="mt-1 block text-[14.5px] font-semibold leading-snug text-brand-ink">
                  {r.questionText}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "mt-1 h-4 w-4 shrink-0 text-brand-ink-soft transition-transform",
                  isOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-black/5 p-4 pt-3">
                <p className="text-[13.5px] text-brand-ink-soft">
                  Your answer:{" "}
                  <span className={cn("font-semibold", r.isCorrect ? "text-emerald-700" : "text-rose-700")}>
                    {r.picked ? `${r.picked}. ${r.pickedText ?? ""}` : "Not answered"}
                  </span>
                </p>
                {!r.isCorrect && (
                  <p className="text-[13.5px] text-brand-ink-soft">
                    Correct answer:{" "}
                    <span className="font-semibold text-emerald-700">
                      {r.correct}. {r.correctText ?? ""}
                    </span>
                  </p>
                )}

                {r.explanation && (
                  <p className="rounded-brand border border-brand-line bg-brand-surface p-3 text-[13.5px] leading-relaxed text-brand-ink">
                    {r.explanation}
                  </p>
                )}

                {ai[r.questionId] ? (
                  <div className="rounded-brand border border-env bg-env-soft p-3">
                    <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-env">
                      <Sparkles className="h-3.5 w-3.5" aria-hidden /> Overra AI explains
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-brand-ink">
                      {ai[r.questionId]}
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => explain(r)}
                    disabled={busy === r.questionId}
                    className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-env px-4 text-[13.5px] font-semibold text-env disabled:opacity-60"
                  >
                    {busy === r.questionId ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-4 w-4" aria-hidden />
                    )}
                    {busy === r.questionId ? "Thinking…" : "Explain with AI"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AnswerReviewList;
