import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trophy, ChevronRight, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
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
  const eligible = myEntry?.status === "in_progress";
  const { data: questions = [], isLoading: qLoading, error: qError } = useArenaPlayQuestions(id, eligible);
  const submit = useSubmitArenaEntry();

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const startedAt = useRef<number>(Date.now());
  const questionShownAt = useRef<number>(Date.now());
  const [timeLeft, setTimeLeft] = useState<number>(ch?.time_limit_seconds ?? 600);
  const submittedRef = useRef(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  // Redirect away if not eligible
  useEffect(() => {
    if (entryLoading) return;
    if (!myEntry || myEntry.status !== "in_progress") {
      navigate(`/arena/${id}`, { replace: true });
    }
  }, [entryLoading, myEntry, id, navigate]);

  // Timer
  useEffect(() => {
    if (!ch) return;
    setTimeLeft(ch.time_limit_seconds);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          // Auto submit on time
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

  // Anti-cheat: report tab blur / visibility change / paste / right-click to server
  useEffect(() => {
    if (!myEntry?.id) return;
    const entryId = myEntry.id;
    const report = async (kind: string, meta: Record<string, unknown> = {}) => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.rpc("arena_log_anti_cheat_event", {
          _entry_id: entryId,
          _kind: kind,
          _meta: meta as never,
        });
      } catch {
        /* best effort */
      }
    };
    const onVis = () => document.hidden && report("visibility_hidden");
    const onBlur = () => report("window_blur");
    const onPaste = () => report("paste");
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      report("context_menu");
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    window.addEventListener("contextmenu", onCtx);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("contextmenu", onCtx);
    };
  }, [myEntry?.id]);

  const current = questions[idx];

  const finalize = async (auto = false) => {
    if (submittedRef.current || !myEntry) return;
    submittedRef.current = true;
    const time_taken_seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    // Ensure every question gets a row (selected=null if untouched)
    const rows: Answer[] = questions.map(
      (q) => answers[q.question_id] ?? { question_id: q.question_id, selected: null, elapsed_ms: 0 },
    );
    try {
      const res = await submit.mutateAsync({
        entry_id: myEntry.id,
        answers: rows,
        time_taken_seconds,
      });
      if (auto) toast.info("Time's up — auto submitted.");
      else toast.success(`Submitted! ${res.score}/${res.total} correct`);
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

  const progress = useMemo(() => ((idx + 1) / Math.max(1, questions.length)) * 100, [idx, questions.length]);
  const answered = Object.keys(answers).length;

  if (qError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-3 text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold mb-1 text-foreground">Could Not Load Questions</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          We encountered an issue preparing the questions for this competition. Please try again.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/arena/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to challenge
          </Button>
          <Button onClick={() => window.location.reload()} className="bg-amber-500 hover:bg-amber-600 text-white">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (qLoading || entryLoading || !ch) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-3" />
        <h2 className="font-display text-lg font-bold text-foreground">Preparing your challenge…</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Loading question bank, initializing timer and securing session.
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

  if (!questions || questions.length === 0 || !current) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3.5 text-amber-700 shadow-sm">
          <Trophy className="w-7 h-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1.5">No Questions Available Yet</h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Questions for this arena competition have not been assigned yet. Your token balance has not been lost.
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <Button variant="outline" onClick={() => navigate(`/arena/${id}`)}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Challenge details
          </Button>
          <Button onClick={() => navigate("/arena")} className="bg-amber-500 hover:bg-amber-600 text-white">
            Return to Arena Home
          </Button>
        </div>
      </div>
    );
  }

  const mm = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const ss = (timeLeft % 60).toString().padStart(2, "0");
  const lowTime = timeLeft < 60;
  const selected = answers[current.question_id]?.selected ?? null;

  return (
    <>
      <SEO title={`Playing · ${ch.title}`} noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-2xl">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-neutral-100 -mx-4 px-4 py-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setExitDialogOpen(true)}
                  aria-label="Exit challenge"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-amber-50 transition border border-transparent hover:border-amber-200 shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Exit
                </button>
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-neutral-800 truncate">
                  <Trophy className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-[220px]">{ch.title}</span>
                </div>
              </div>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-extrabold text-[12.5px] tabular-nums shrink-0",
                  lowTime ? "bg-red-50 text-red-700 border border-red-200 animate-pulse" : "bg-amber-50 text-amber-800 border border-amber-200",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {mm}:{ss}
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="text-[11px] text-neutral-500 mt-1.5 flex justify-between">
              <span>Question {idx + 1} of {questions.length}</span>
              <span>{answered} answered</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current.question_id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-5 border-amber-200/60 shadow-xs">
                {current.image_url && (
                  <img src={current.image_url} alt="" className="rounded-xl mb-3 max-h-64 object-contain w-full" />
                )}
                <p className="font-display text-[16px] sm:text-lg font-bold text-neutral-900 leading-snug whitespace-pre-wrap">
                  {current.question_text}
                </p>
                <div className="mt-4 space-y-2.5">
                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const text = (current as any)[`option_${opt.toLowerCase()}`] as string;
                    const isSel = selected === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelect(opt)}
                        className={cn(
                          "w-full text-left p-3.5 rounded-xl border transition flex items-start gap-3",
                          isSel
                            ? "border-amber-500 bg-amber-50/90 ring-2 ring-amber-300/40 shadow-xs"
                            : "border-neutral-200 bg-white hover:border-amber-300 hover:bg-amber-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 h-7 w-7 rounded-lg flex items-center justify-center font-extrabold text-[13px]",
                            isSel ? "bg-amber-500 text-white" : "bg-neutral-100 text-neutral-700",
                          )}
                        >
                          {opt}
                        </span>
                        <span className="text-[14px] text-neutral-800 leading-snug pt-0.5">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setIdx((i) => Math.max(0, i - 1))}
              disabled={idx === 0}
            >
              Previous
            </Button>
            {idx < questions.length - 1 ? (
              <Button onClick={() => setIdx((i) => i + 1)} className="bg-amber-500 hover:bg-amber-600 text-white">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={() => finalize(false)}
                disabled={submit.isPending}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold"
              >
                {submit.isPending ? "Submitting…" : (
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
              You have answered {answered} of {questions.length} questions. You can submit your current answers now or return later before time expires.
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
              Exit to Arena
            </Button>
            <Button
              onClick={() => {
                setExitDialogOpen(false);
                finalize(false);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Submit & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
