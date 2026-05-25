import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Flag,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  questions: PreviewQuestion[];
  title?: string;
  durationMinutes?: number;
}

/** Tutor-only CBT simulation — runs entirely client-side, nothing is saved. */
export default function CBTPreviewDialog({
  open,
  onOpenChange,
  questions,
  title,
  durationMinutes = 30,
}: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (!open) return;
    setIndex(0);
    setAnswers({});
    setSubmitted(false);
    setSecondsLeft(durationMinutes * 60);
  }, [open, durationMinutes, questions.length]);

  useEffect(() => {
    if (!open || submitted) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setSubmitted(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [open, submitted]);

  const current = questions[index];
  const score = useMemo(
    () =>
      questions.reduce(
        (acc, q, i) => (answers[i] === q.correct_option ? acc + 1 : acc),
        0,
      ),
    [answers, questions],
  );
  const answeredCount = Object.keys(answers).length;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  if (!questions.length) return null;

  const renderOption = (key: "A" | "B" | "C" | "D", text: string) => {
    const picked = answers[index] === key;
    const isCorrect = current.correct_option === key;
    const showResult = submitted;
    return (
      <button
        key={key}
        type="button"
        disabled={submitted}
        onClick={() => setAnswers((a) => ({ ...a, [index]: key }))}
        className={cn(
          "w-full text-left px-3 py-2 rounded-lg border text-sm transition flex items-start gap-2",
          !showResult && picked && "border-amber-500 bg-amber-50 dark:bg-amber-500/10",
          !showResult && !picked && "hover:border-amber-300",
          showResult && isCorrect && "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
          showResult && picked && !isCorrect && "border-rose-500 bg-rose-50 dark:bg-rose-500/10",
        )}
      >
        <span className="font-semibold w-5 shrink-0">{key}.</span>
        <span className="flex-1">{text}</span>
        {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
        {showResult && picked && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-muted/40">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-1.5 text-sm">
              <Eye className="w-4 h-4 text-amber-600" />
              Tutor preview — {title || "Untitled quiz"}
            </DialogTitle>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="gap-1">
                <Clock className="w-3 h-3" /> {mm}:{ss}
              </Badge>
              <Badge variant="outline">
                {index + 1} / {questions.length}
              </Badge>
            </div>
          </div>
          <Progress
            value={((index + 1) / questions.length) * 100}
            className="h-1 mt-2"
          />
        </DialogHeader>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {!submitted ? (
            <>
              <p className="text-xs text-muted-foreground">
                Simulation only — answers are not saved. {current.difficulty && (
                  <Badge variant="outline" className="ml-1 capitalize">{current.difficulty}</Badge>
                )}
              </p>
              <p className="font-medium text-sm leading-relaxed whitespace-pre-wrap">
                {current.question_text}
              </p>
              <div className="space-y-2">
                {renderOption("A", current.option_a)}
                {renderOption("B", current.option_b)}
                {renderOption("C", current.option_c)}
                {renderOption("D", current.option_d)}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Preview score</p>
                <p className="text-3xl font-bold text-amber-600">
                  {score}/{questions.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round((score / questions.length) * 100)}% correct
                </p>
              </div>
              <ul className="space-y-2 text-sm">
                {questions.map((q, i) => {
                  const picked = answers[i];
                  const ok = picked === q.correct_option;
                  return (
                    <li key={i} className="rounded-md border p-2">
                      <p className="font-medium flex items-center gap-1.5">
                        {ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                        Q{i + 1}. {q.question_text}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Correct: <span className="font-semibold">{q.correct_option}</span>
                        {picked && picked !== q.correct_option && (
                          <> · You picked: <span className="font-semibold">{picked}</span></>
                        )}
                        {!picked && <> · Not answered</>}
                      </p>
                      {q.explanation && (
                        <p className="text-xs mt-1 italic text-muted-foreground">{q.explanation}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-between gap-2 bg-muted/30">
          {!submitted ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <p className="text-xs text-muted-foreground">
                Answered {answeredCount}/{questions.length}
              </p>
              {index < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setSubmitted(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Flag className="w-4 h-4 mr-1" /> Submit preview
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setAnswers({});
                  setIndex(0);
                  setSecondsLeft(durationMinutes * 60);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-1" /> Retry
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Close preview
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}