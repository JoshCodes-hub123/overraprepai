import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { type WeakTopic, type MissedQuestion } from "@/hooks/useMasteryBreakdown";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface DrillQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  topic_name?: string | null;
  course_code?: string | null;
}

interface TargetedDrillModalProps {
  isOpen: boolean;
  onClose: () => void;
  weakTopics: WeakTopic[];
  selectedTopic?: WeakTopic | null;
  onCompleted?: () => void;
}

export function TargetedDrillModal({
  isOpen,
  onClose,
  weakTopics,
  selectedTopic,
  onCompleted,
}: TargetedDrillModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [savingResult, setSavingResult] = useState(false);
  const [attemptScore, setAttemptScore] = useState<{ correct: number; total: number; pct: number } | null>(null);

  // AI explanations per question
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Filter topics targeted
  const activeTopics = useMemo(() => {
    if (selectedTopic) return [selectedTopic];
    return weakTopics;
  }, [selectedTopic, weakTopics]);

  // Load 10 targeted questions strictly for these topics
  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setIsSubmitted(false);
      setAnswers({});
      setFlagged(new Set());
      setCurrentIndex(0);
      setAttemptScore(null);
      setAiExplanations({});
      return;
    }

    let isAlive = true;
    const loadQuestions = async () => {
      setLoading(true);
      try {
        const pool: DrillQuestion[] = [];
        const seenIds = new Set<string>();

        // 1. First add previously missed questions from these weak topics
        for (const topic of activeTopics) {
          for (const mq of topic.missedQuestions) {
            if (!seenIds.has(mq.id)) {
              seenIds.add(mq.id);
              pool.push({
                id: mq.id,
                question_text: mq.question_text,
                option_a: mq.option_a,
                option_b: mq.option_b,
                option_c: mq.option_c,
                option_d: mq.option_d,
                correct_option: mq.correct_option,
                explanation: mq.explanation,
                topic_name: mq.topic_name || topic.topicName,
                course_code: mq.course_code || topic.courseCode,
              });
            }
            if (pool.length >= 10) break;
          }
          if (pool.length >= 10) break;
        }

        // 2. If fewer than 10, fetch extra approved questions for these topic IDs or course IDs
        if (pool.length < 10 && activeTopics.length > 0) {
          const topicIds = activeTopics.map((t) => t.topicId).filter(Boolean);
          const courseIds = activeTopics.map((t) => t.courseId).filter(Boolean);

          let query = supabase
            .from("questions")
            .select(`
              id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, topic_id, course_id,
              courses:course_id(code, name),
              topics:topic_id(name)
            `)
            .eq("is_approved", true)
            .limit(20);

          if (topicIds.length > 0) {
            query = query.in("topic_id", topicIds);
          } else if (courseIds.length > 0) {
            query = query.in("course_id", courseIds);
          }

          const { data: extra } = await query;

          (extra || []).forEach((row: any) => {
            if (pool.length < 10 && !seenIds.has(row.id)) {
              seenIds.add(row.id);
              pool.push({
                id: row.id,
                question_text: row.question_text,
                option_a: row.option_a,
                option_b: row.option_b,
                option_c: row.option_c,
                option_d: row.option_d,
                correct_option: row.correct_option,
                explanation: row.explanation,
                topic_name: row.topics?.name || "Targeted Topic",
                course_code: row.courses?.code || "CBT",
              });
            }
          });
        }

        if (isAlive) {
          setQuestions(pool.slice(0, 10));
          setTimeLeft(Math.max(300, pool.slice(0, 10).length * 60)); // 1 min per question, minimum 5m
          startTimeRef.current = Date.now();
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading drill questions:", err);
        if (isAlive) setLoading(false);
      }
    };

    void loadQuestions();

    return () => {
      isAlive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, activeTopics]);

  // Countdown timer when active
  useEffect(() => {
    if (!isOpen || isSubmitted || loading) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          void handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isSubmitted, loading]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitted || savingResult) return;
    setSavingResult(true);

    let correctCount = 0;
    const totalCount = questions.length;

    questions.forEach((q) => {
      if (answers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase()) {
        correctCount += 1;
      }
    });

    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    setAttemptScore({ correct: correctCount, total: totalCount, pct: scorePct });
    setIsSubmitted(true);

    // Save attempt and answers to Supabase so mastery tracking updates
    if (user?.id && totalCount > 0) {
      try {
        const timeSpentSec = Math.round((Date.now() - startTimeRef.current) / 1000);

        // Find a representative quiz ID or fallback to the first active course
        const primaryCourseId = activeTopics[0]?.courseId || null;

        // Try to get a valid quiz_id to satisfy foreign key, or use an existing one
        const { data: existingQuiz } = await supabase
          .from("quizzes")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existingQuiz?.id) {
          const { data: attempt, error: attemptError } = await supabase
            .from("quiz_attempts")
            .insert({
              user_id: user.id,
              quiz_id: existingQuiz.id,
              mode: "remediation_drill",
              total_questions: totalCount,
              correct_answers: correctCount,
              score: scorePct,
              time_spent_seconds: timeSpentSec,
              completed_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (!attemptError && attempt?.id) {
            const answerInserts = questions.map((q) => ({
              attempt_id: attempt.id,
              question_id: q.id,
              selected_option: answers[q.id] || null,
              is_correct: answers[q.id]?.toUpperCase() === q.correct_option?.toUpperCase(),
            }));

            await supabase.from("quiz_answers").insert(answerInserts);
          }
        }

        void track("remediation_drill_completed", {
          score: scorePct,
          correct: correctCount,
          total: totalCount,
          topics_count: activeTopics.length,
        });

        toast.success(`Drill complete! Scored ${scorePct}% (${correctCount}/${totalCount})`);
        onCompleted?.();
      } catch (e) {
        console.warn("Could not persist drill attempt logs:", e);
      } finally {
        setSavingResult(false);
      }
    } else {
      setSavingResult(false);
    }
  };

  const handleRequestAIExplanation = async (q: DrillQuestion) => {
    if (aiExplanations[q.id] || aiLoading[q.id]) return;
    setAiLoading((prev) => ({ ...prev, [q.id]: true }));

    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: q.question_text,
          options: {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d,
          },
          correctOption: q.correct_option,
          userAnswer: answers[q.id] || null,
          topic: q.topic_name,
        },
      });

      if (error) throw error;
      setAiExplanations((prev) => ({
        ...prev,
        [q.id]: data?.explanation || "Examine key concepts and rules for this topic to solve step by step.",
      }));
    } catch {
      setAiExplanations((prev) => ({
        ...prev,
        [q.id]: `Correct Answer: Option ${q.correct_option}. ${q.explanation || "Focus on reviewing this core concept in your lecture syllabus."}`,
      }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-neutral-200">
        <DialogHeader className="px-5 py-3.5 border-b border-neutral-100 bg-white shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-neutral-950 font-bold text-[11px] px-2 py-0.5">
                  Targeted Drill
                </Badge>
                <span className="text-xs font-semibold text-neutral-500 truncate">
                  {selectedTopic ? `${selectedTopic.courseCode} · ${selectedTopic.topicName}` : "Aggregated Weak Areas"}
                </span>
              </div>
              <DialogTitle className="font-display font-bold text-base sm:text-lg text-neutral-950 mt-1">
                {isSubmitted ? "Drill Results & Diagnostic Review" : "10-Question Weak-Area Remediation"}
              </DialogTitle>
            </div>

            {!isSubmitted && !loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-800 text-xs font-bold shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
            <p className="font-semibold text-sm text-neutral-800">Generating targeted remediation questions…</p>
            <p className="text-xs text-neutral-500 mt-1">Grounded in your syllabus and topics scored under 60%.</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <p className="font-display font-bold text-lg text-neutral-900">No Questions Available For This Drill</p>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto">
              We couldn't locate specific practice questions for these topics yet. Try browsing enrolled courses to practice standard CBT tests.
            </p>
            <Button onClick={onClose} className="bg-amber-500 text-neutral-950 font-bold text-xs">
              Close Drill
            </Button>
          </div>
        ) : !isSubmitted ? (
          // ==================== LIVE DRILL SCREEN ====================
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Stepper Progress */}
            <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
              <span>Question {currentIndex + 1} of {questions.length}</span>
              <span>{answeredCount} of {questions.length} answered</span>
            </div>
            <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5 bg-neutral-100" />

            {/* Question Card */}
            {currentQ && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                      {currentQ.course_code} · {currentQ.topic_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFlag(currentQ.id)}
                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        flagged.has(currentQ.id)
                          ? "bg-amber-500/20 text-amber-800"
                          : "text-neutral-500 hover:bg-neutral-200/60"
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Flag</span>
                    </button>
                  </div>
                  <p className="font-medium text-sm sm:text-base text-neutral-950 leading-relaxed">
                    {currentQ.question_text}
                  </p>
                </div>

                {/* Option Choices */}
                <div className="space-y-2">
                  {(["A", "B", "C", "D"] as const).map((key) => {
                    const text = key === "A" ? currentQ.option_a
                      : key === "B" ? currentQ.option_b
                      : key === "C" ? currentQ.option_c
                      : currentQ.option_d;
                    if (!text) return null;
                    const isPicked = answers[currentQ.id] === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectOption(currentQ.id, key)}
                        className={`w-full min-h-[52px] text-left p-3.5 rounded-2xl border flex items-start gap-3 transition-all select-none active:scale-[0.98] ${
                          isPicked
                            ? "bg-amber-500/15 border-amber-500 text-neutral-950 font-semibold shadow-2xs"
                            : "bg-white border-neutral-200/90 hover:bg-neutral-50 text-neutral-800"
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isPicked ? "bg-amber-500 text-neutral-950" : "bg-neutral-100 text-neutral-700"
                        }`}>
                          {key}
                        </span>
                        <span className="text-xs sm:text-sm pt-1 leading-snug flex-1 font-medium">{text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Question Quick Jump Grid */}
                <div className="pt-2 border-t border-neutral-100">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Jump to question</p>
                  <div className="flex flex-wrap gap-1.5">
                    {questions.map((q, idx) => {
                      const isAnswered = !!answers[q.id];
                      const isCurrent = idx === currentIndex;
                      const isFlagged = flagged.has(q.id);

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentIndex(idx)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center relative ${
                            isCurrent
                              ? "bg-neutral-950 text-white shadow-xs"
                              : isAnswered
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          }`}
                        >
                          {idx + 1}
                          {isFlagged && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // ==================== COMPLETED DRILL REVIEW SCREEN ====================
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Scorecard Hero */}
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Remediation Performance
              </span>
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-8 h-8 text-amber-600" />
                <span className="font-display font-extrabold text-4xl text-neutral-950">
                  {attemptScore?.pct}%
                </span>
              </div>
              <p className="text-xs font-semibold text-neutral-700">
                You answered {attemptScore?.correct} out of {attemptScore?.total} questions correctly.
              </p>
              <div className="pt-1">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  (attemptScore?.pct ?? 0) >= 70
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : (attemptScore?.pct ?? 0) >= 50
                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                    : "bg-rose-100 text-rose-800 border border-rose-300"
                }`}>
                  {(attemptScore?.pct ?? 0) >= 70
                    ? "Gap Remediated 🎉"
                    : (attemptScore?.pct ?? 0) >= 50
                    ? "Improving — Re-check wrong answers"
                    : "Needs Further Practice"}
                </span>
              </div>
            </div>

            {/* Answer Solutions & AI Explanations */}
            <div className="space-y-4">
              <h4 className="font-display font-bold text-sm text-neutral-950 flex items-center justify-between">
                <span>Detailed Question Review ({questions.length})</span>
                <span className="text-xs text-neutral-500 font-normal">All answers step-by-step</span>
              </h4>

              {questions.map((q, idx) => {
                const picked = answers[q.id];
                const isCorrect = picked?.toUpperCase() === q.correct_option?.toUpperCase();
                const aiExplanation = aiExplanations[q.id];
                const isAiLoading = aiLoading[q.id];

                return (
                  <div
                    key={q.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      isCorrect ? "bg-white border-neutral-200" : "bg-rose-50/25 border-rose-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                          {q.course_code} · {q.topic_name}
                        </span>
                      </div>
                      <Badge className={isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}>
                        {isCorrect ? "Correct" : picked ? `Missed (Chose ${picked})` : "Unanswered"}
                      </Badge>
                    </div>

                    <p className="font-medium text-xs sm:text-sm text-neutral-950">
                      {q.question_text}
                    </p>

                    {/* Options Breakdown */}
                    <div className="space-y-1.5 text-xs">
                      {(["A", "B", "C", "D"] as const).map((letter) => {
                        const optText = letter === "A" ? q.option_a
                          : letter === "B" ? q.option_b
                          : letter === "C" ? q.option_c
                          : q.option_d;
                        if (!optText) return null;
                        const isCorrectOption = letter.toUpperCase() === q.correct_option?.toUpperCase();
                        const isSelectedByStudent = picked?.toUpperCase() === letter.toUpperCase();

                        return (
                          <div
                            key={letter}
                            className={`p-2.5 rounded-xl flex items-start gap-2 border ${
                              isCorrectOption
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 font-semibold"
                                : isSelectedByStudent && !isCorrectOption
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-950"
                                : "bg-neutral-50/50 border-neutral-200/60 text-neutral-700"
                            }`}
                          >
                            <span className="font-bold w-4">{letter}.</span>
                            <span className="flex-1">{optText}</span>
                            {isCorrectOption && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                            {isSelectedByStudent && !isCorrectOption && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Static Tutor Note if present */}
                    {q.explanation && (
                      <div className="p-2.5 rounded-xl bg-neutral-100 text-xs text-neutral-700">
                        <span className="font-bold text-neutral-900">Syllabus Note: </span>
                        {q.explanation}
                      </div>
                    )}

                    {/* AI Explanation Accordion/Card */}
                    {aiExplanation ? (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-neutral-800 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>AI Tutor Explanation</span>
                        </div>
                        <p className="leading-relaxed text-neutral-800 whitespace-pre-wrap">{aiExplanation}</p>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isAiLoading}
                        onClick={() => handleRequestAIExplanation(q)}
                        className="w-full text-xs font-bold border-amber-300 text-amber-900 hover:bg-amber-50 h-8 rounded-lg flex items-center justify-center gap-1.5"
                      >
                        {isAiLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Explaining concept…</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-3.5 h-3.5 text-amber-600" />
                            <span>Explain Concept with AI</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-neutral-100 bg-white shrink-0 flex items-center justify-between gap-2">
          {!isSubmitted ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="text-xs font-semibold rounded-2xl min-h-[44px] h-11 px-4 active:scale-95 border-neutral-300"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Prev
              </Button>

              <div className="flex items-center gap-2">
                {currentIndex < questions.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                    className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold rounded-2xl min-h-[44px] h-11 px-5 active:scale-95"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={savingResult}
                    onClick={handleSubmit}
                    className="bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold rounded-2xl shadow-xs min-h-[44px] h-11 px-5 active:scale-95"
                  >
                    {savingResult ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Submit Drill ({answeredCount}/{questions.length})
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSubmitted(false);
                  setAnswers({});
                  setCurrentIndex(0);
                  setTimeLeft(questions.length * 60);
                }}
                className="text-xs font-semibold rounded-2xl min-h-[44px] h-11 px-4 active:scale-95 border-neutral-300"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Drill Again
              </Button>
              <Button
                size="sm"
                onClick={onClose}
                className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold rounded-2xl min-h-[44px] h-11 px-5 active:scale-95 shadow-xs"
              >
                Finish & Update Progress
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
