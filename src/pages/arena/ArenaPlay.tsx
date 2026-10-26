import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Trophy,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useArenaChallenge,
  useArenaPlayQuestions,
  useEnterArena,
  useMyArenaEntry,
  useSubmitArenaEntry,
} from "@/hooks/useArena";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Answer = { question_id: string; selected: string | null; elapsed_ms: number };

export default function ArenaPlay() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ch } = useArenaChallenge(id);
  const { data: myEntry, isLoading: entryLoading } = useMyArenaEntry(id);
  const enter = useEnterArena();
  const {
    data: questions = [],
    isLoading: qLoading,
    error: qError,
  } = useArenaPlayQuestions(id, true);
  const submit = useSubmitArenaEntry();

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const startedAt = useRef<number>(Date.now());
  const questionShownAt = useRef<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(ch?.time_limit_seconds ?? 600);
  const submittedRef = useRef(false);
  const autoEnteredRef = useRef(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  // If student navigated directly to /arena/:id/play without an active entry,
  // automatically initialize an in_progress entry or redirect if already submitted.
  useEffect(() => {
    if (entryLoading || !id) return;
    if (myEntry?.status === "submitted") {
      navigate(`/arena/${id}/leaderboard`, { replace: true });
      return;
    }
    if (!myEntry && !autoEnteredRef.current) {
      autoEnteredRef.current = true;
      enter.mutate({ challengeId: id, useTicket: true });
    }
  }, [entryLoading, myEntry, id, navigate, enter]);

  // Countdown Timer
  useEffect(() => {
    if (!ch) return;
    setTimeLeft(ch.time_limit_seconds);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          finalize(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch?.id]);

  useEffect(() => {
    questionShownAt.current = Date.now();
  }, [idx]);

  const current = questions[idx];

  const finalize = async (auto = false) => {
    if (submittedRef.current || !id) return;
    submittedRef.current = true;
    const time_taken_seconds = Math.max(1, Math.floor((Date.now() - startedAt.current) / 1000));
    const rows: Answer[] = questions.map(
      (q) =>
        answers[q.question_id] ?? {
          question_id: q.question_id,
          selected: null,
          elapsed_ms: 0,
        }
    );
    try {
      const res = await submit.mutateAsync({
        challenge_id: id,
        entry_id: myEntry?.id ?? `entry_${id}_${Date.now()}`,
        answers: rows,
        time_taken_seconds,
        questions,
      });
      if (auto) {
        toast.info(`Time's up! Scored ${res.score}/${res.total} (${res.accuracy}%).`);
      } else {
        const rewardMsg = res.tokens_awarded ? ` · Earned +${res.tokens_awarded} Tokens!` : "";
        toast.success(`Submitted! ${res.score}/${res.total} correct (${res.accuracy}%)${rewardMsg}`);
      }
      navigate(`/arena/${id}/leaderboard`, { replace: true });
    } catch (e: any) {
      submittedRef.current = false;
      toast.error(e?.message ?? "Submission failed");
    }
  };

  const handleSelect = (opt: string) => {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.question_id]: {
        question_id: current.question_id,
        selected: opt,
        elapsed_ms: Date.now() - questionShownAt.current,
      },
    }));
  };

  const progress = useMemo(
    () => ((idx + 1) / Math.max(1, questions.length)) * 100,
    [idx, questions.length]
  );
  const answered = Object.keys(answers).length;

  if (qError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold mb-1 text-foreground">
          Could Not Load Questions
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          We encountered an issue preparing the questions for this competition. Please try again.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/arena/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Challenge
          </Button>
          <Button
            onClick={() => window.location.reload()}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (qLoading || !ch || !current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-3" />
        <h2 className="font-display text-lg font-bold text-foreground">
          Preparing your Arena session…
        </h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Loading verified question bank and initializing timer.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6 rounded-full"
          onClick={() => navigate(`/arena/${id}`)}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Cancel & Return
        </Button>
      </div>
    );
  }

  const mm = Math.floor(timeLeft / 60)
    .toString()
    .padStart(2, "0");
  const ss = (timeLeft % 60).toString().padStart(2, "0");
  const lowTime = timeLeft < 60;
  const selected = answers[current.question_id]?.selected ?? null;

  return (
    <>
      <SEO title={`Playing · ${ch.title}`} noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-28 max-w-2xl">
          {/* Top sticky bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/80 -mx-4 px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setExitDialogOpen(true)}
                  aria-label="Exit challenge"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-foreground bg-muted/70 hover:bg-amber-500/15 transition border border-border shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Exit
                </button>
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                  <Trophy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate max-w-[160px] sm:max-w-[260px]">{ch.title}</span>
                </div>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-extrabold text-xs tabular-nums shrink-0",
                  lowTime
                    ? "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                    : "bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-300"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {mm}:{ss}
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="text-[11px] text-muted-foreground mt-1.5 flex justify-between font-medium">
              <span>
                Question {idx + 1} of {questions.length}
              </span>
              <span>
                {answered} of {questions.length} answered
              </span>
            </div>
          </div>

          {/* Question Jumper Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
            {questions.map((q, i) => {
              const isAns = !!answers[q.question_id]?.selected;
              const isCurr = i === idx;
              return (
                <button
                  key={q.question_id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-8 w-8 rounded-lg text-xs font-bold shrink-0 transition-all border",
                    isCurr
                      ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                      : isAns
                        ? "bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-300"
                        : "bg-card text-muted-foreground border-border hover:border-amber-300"
                  )}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.question_id}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18 }}
            >
              <Card className="p-5 sm:p-6 border-amber-200/80 dark:border-border shadow-xs">
                {current.image_url && (
                  <img
                    src={current.image_url}
                    alt=""
                    className="rounded-xl mb-3 max-h-64 object-contain w-full"
                  />
                )}
                <p className="font-display text-base sm:text-lg font-bold text-foreground leading-snug whitespace-pre-wrap">
                  {current.question_text}
                </p>
                <div className="mt-4 space-y-2.5">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const text = (current as any)[`option_${opt.toLowerCase()}`] as string;
                    const isSel = selected === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3 cursor-pointer",
                          isSel
                            ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-400/30 shadow-2xs"
                            : "border-border bg-card hover:border-amber-300 hover:bg-amber-50/40 dark:hover:bg-muted/50"
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 h-7 w-7 rounded-lg flex items-center justify-center font-extrabold text-xs",
                            isSel
                              ? "bg-amber-500 text-slate-950"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {opt}
                        </span>
                        <span className="text-sm text-foreground leading-snug pt-0.5">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="rounded-xl font-semibold"
            >
              Previous
            </Button>
            {idx < questions.length - 1 ? (
              <Button
                onClick={() => setIdx((i) => i + 1)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
              >
                Next Question <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => finalize(false)}
                disabled={submit.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl shadow-md"
              >
                {submit.isPending ? (
                  "Grading…"
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit Challenge
                  </>
                )}
              </Button>
            )}
          </div>
        </main>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Exit Challenge?</DialogTitle>
            <DialogDescription>
              You have answered {answered} of {questions.length} questions. You can submit your
              answers now to claim your score and tokens, or return to the Arena overview.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              Keep Playing
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setExitDialogOpen(false);
                navigate(`/arena/${id}`);
              }}
            >
              Leave Without Submitting
            </Button>
            <Button
              onClick={() => {
                setExitDialogOpen(false);
                finalize(false);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              Submit & See Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
