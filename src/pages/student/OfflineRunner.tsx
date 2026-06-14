import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getOfflineSet, OfflineQuestion, OfflineSet, queuePendingAttempt } from "@/lib/offlineQuizStore";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, X, Trophy, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function OfflineRunner() {
  const { setId = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [set, setSet] = useState<OfflineSet | null>(null);
  const [questions, setQuestions] = useState<OfflineQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const queuedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { set, questions } = await getOfflineSet(setId);
      setSet(set);
      setQuestions(questions);
      startedAtRef.current = new Date().toISOString();
      queuedRef.current = false;
    })();
  }, [setId]);

  const q = questions[idx];

  const submit = () => {
    if (!picked || !q) return;
    setRevealed(true);
    if (picked === q.correct_option) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (idx + 1 >= questions.length) { setDone(true); return; }
    setIdx(idx + 1);
    setPicked(null);
    setRevealed(false);
  };

  // When the run finishes, queue an attempt for upload IF this set came from a
  // real quiz (set id = "quiz:<uuid>"). Synthetic sets like "recommended" or
  // "weak-area" don't map to a row in `quizzes`, so we skip them.
  useEffect(() => {
    if (!done || !user || !set || queuedRef.current) return;
    const rawId = set.id.startsWith("quiz:") ? set.id.slice(5) : set.id;
    if (!UUID_RE.test(rawId)) return;
    queuedRef.current = true;
    const total = questions.length;
    const pct = Math.round((correct / Math.max(1, total)) * 100);
    const startedAt = startedAtRef.current;
    const completedAt = new Date().toISOString();
    const seconds = Math.max(1, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000));
    void queuePendingAttempt({
      user_id: user.id,
      quiz_id: rawId,
      mode: "practice",
      total_questions: total,
      correct_answers: correct,
      score: pct,
      time_spent_seconds: seconds,
      started_at: startedAt,
      completed_at: completedAt,
    }).catch(() => { queuedRef.current = false; });
  }, [done, user, set, correct, questions.length]);

  if (!set) return <AppScreen back title="Loading…"><div /></AppScreen>;


  if (done) {
    const pct = Math.round((correct / Math.max(1, questions.length)) * 100);
    return (
      <AppScreen back title="Offline Practice Complete">
        <div className="max-w-md mx-auto pt-6">
          <Card className="p-6 text-center bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
            <p className="font-display text-3xl font-bold">{pct}%</p>
            <p className="text-sm text-muted-foreground mt-1">{correct} of {questions.length} correct</p>
            <p className="text-xs text-muted-foreground mt-3">When you're back online, your dashboard will refresh.</p>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => { setIdx(0); setPicked(null); setRevealed(false); setCorrect(0); setDone(false); }}>Retry</Button>
              <Button className="flex-1" onClick={() => navigate("/student/offline")}>Done</Button>
            </div>
          </Card>
        </div>
      </AppScreen>
    );
  }

  if (!q) return null;
  const opts: Array<["A" | "B" | "C" | "D", string]> = [["A", q.option_a], ["B", q.option_b], ["C", q.option_c], ["D", q.option_d]];

  return (
    <AppScreen back title={set.title} subtitle={`Question ${idx + 1} of ${questions.length}`}>
      <div className="max-w-2xl mx-auto pb-8">
        <Progress value={((idx) / questions.length) * 100} className="h-1 mb-4" />
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-5 space-y-4">
              <p className="font-medium leading-snug">{q.question_text}</p>
              <div className="space-y-2">
                {opts.map(([k, t]) => {
                  const isCorrect = revealed && q.correct_option === k;
                  const isPicked = picked === k;
                  const wrong = revealed && isPicked && k !== q.correct_option;
                  return (
                    <button
                      key={k}
                      disabled={revealed}
                      onClick={() => setPicked(k)}
                      className={`w-full text-left flex items-start gap-2 p-3 rounded-xl border text-sm transition-all ${
                        isCorrect ? "bg-emerald-500/10 border-emerald-500/40" :
                        wrong ? "bg-rose-500/10 border-rose-500/40" :
                        isPicked ? "bg-primary/10 border-primary/40" :
                        "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="font-semibold w-5">{k}.</span>
                      <span className="flex-1">{t}</span>
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {wrong && <X className="w-4 h-4 text-rose-500" />}
                    </button>
                  );
                })}
              </div>

              {revealed && q.explanation && (
                <div className="bg-muted/40 rounded-lg p-3 text-xs">
                  <span className="font-semibold">Explanation:</span> {q.explanation}
                </div>
              )}

              {!revealed ? (
                <Button onClick={submit} disabled={!picked} className="w-full">Submit</Button>
              ) : (
                <Button onClick={next} className="w-full">
                  {idx + 1 >= questions.length ? "Finish" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppScreen>
  );
}
