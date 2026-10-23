import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RateQuizDialog } from "@/components/student/RateQuizDialog";
import { ShareResultsButton } from "@/components/quiz/ShareResultsButton";
import { QuizCelebration } from "@/components/quiz/QuizCelebration";
import { QuizReviewList } from "@/components/quiz/QuizReviewList";
import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Sparkles,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";

interface AttemptData {
  id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent_seconds: number | null;
  mode: string;
  quiz: {
    id: string;
    title: string;
    course_id: string;
    course: {
      id: string;
      code: string;
      name: string;
    };
  };
}

interface MissedTopic {
  topicName: string;
  topicId?: string;
  missedCount: number;
  totalCount: number;
}

export const QuizResults = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [missedTopics, setMissedTopics] = useState<MissedTopic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId || !user || !quizId) return;

      try {
        // 1. Check if we have an offline cached attempt result first or if offline
        const offlineRaw = localStorage.getItem(`cbt_offline_result_${attemptId}`);
        if (offlineRaw) {
          try {
            const off = JSON.parse(offlineRaw);
            setAttempt({
              id: off.attemptId,
              score: off.score,
              total_questions: off.totalQuestions || off.questions?.length || 10,
              correct_answers: off.correctCount || 0,
              time_spent_seconds: off.timeSpent || 0,
              mode: "simulation",
              quiz: {
                id: off.quizId,
                title: off.quiz?.title || "CBT Examination",
                course_id: off.quiz?.course?.id || "",
                course: {
                  id: off.quiz?.course?.id || "",
                  code: off.quiz?.course?.code || "CBT",
                  name: off.quiz?.course?.name || "Verified Course Examination",
                },
              },
            });

            // Compute missed topics from questions & answers
            if (Array.isArray(off.questions)) {
              const topicMap = new Map<string, { topicName: string; topicId?: string; missed: number; total: number }>();
              off.questions.forEach((q: any) => {
                const userAns = off.answers?.[q.id];
                const isCorrect = userAns === q.correct_option;
                const tName = q.topics?.name || q.topic_name || "General Course Syllabus";
                const tId = q.topic_id;
                const existing = topicMap.get(tName) || { topicName: tName, topicId: tId, missed: 0, total: 0 };
                existing.total += 1;
                if (!isCorrect) existing.missed += 1;
                topicMap.set(tName, existing);
              });

              const sortedMissed = Array.from(topicMap.values())
                .filter((t) => t.missed > 0)
                .sort((a, b) => b.missed - a.missed)
                .map((t) => ({
                  topicName: t.topicName,
                  topicId: t.topicId,
                  missedCount: t.missed,
                  totalCount: t.total,
                }));

              setMissedTopics(sortedMissed);
            }

            if (off.score >= 75) {
              setShowCelebration(true);
              setTimeout(() => setShowCelebration(false), 3500);
            }

            setIsLoading(false);
            if (!navigator.onLine) return; // Stay with offline result if no connection
          } catch (e) {
            console.warn("Failed reading offline result cache:", e);
          }
        }

        // 2. Fetch attempt and quiz details from Supabase
        const { data: attemptData, error: attemptError } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(id, title, course_id, courses(id, code, name))")
          .eq("id", attemptId)
          .eq("user_id", user.id)
          .single();

        if (attemptError) {
          if (offlineRaw) return; // Keep offline loaded attempt
          throw attemptError;
        }

        setAttempt({
          ...attemptData,
          quiz: {
            id: attemptData.quizzes.id,
            title: attemptData.quizzes.title,
            course_id: attemptData.quizzes.course_id,
            course: attemptData.quizzes.courses as { id: string; code: string; name: string },
          },
        });

        // 3. Fetch questions with topics to diagnose missed concepts
        const { data: answersData } = await supabase
          .from("quiz_answers")
          .select("is_correct, question_id, questions(id, topic_id, topics(id, name))")
          .eq("attempt_id", attemptId);

        if (answersData) {
          const topicMap = new Map<string, { topicName: string; topicId?: string; missed: number; total: number }>();

          for (const a of answersData) {
            const q = (a as any).questions;
            const topic = q?.topics;
            const tName = topic?.name || "General Course Topics";
            const tId = topic?.id;

            const existing = topicMap.get(tName) || {
              topicName: tName,
              topicId: tId,
              missed: 0,
              total: 0,
            };

            existing.total += 1;
            if (!a.is_correct) {
              existing.missed += 1;
            }
            topicMap.set(tName, existing);
          }

          const sortedMissed = Array.from(topicMap.values())
            .filter((t) => t.missed > 0)
            .sort((a, b) => b.missed - a.missed)
            .map((t) => ({
              topicName: t.topicName,
              topicId: t.topicId,
              missedCount: t.missed,
              totalCount: t.total,
            }));

          setMissedTopics(sortedMissed);
        }

        // 4. Check rating
        const { data: ratingData } = await supabase
          .from("quiz_ratings")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("user_id", user.id)
          .maybeSingle();

        setHasRated(!!ratingData);

        const scorePercent = Math.round((attemptData.correct_answers / attemptData.total_questions) * 100);
        if (scorePercent >= 75) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 3500);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        // Only navigate away if neither online nor offline attempt exists
        const offlineRaw = localStorage.getItem(`cbt_offline_result_${attemptId}`);
        if (!offlineRaw) {
          navigate("/student/dashboard");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, user, quizId, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
        <p className="text-xs text-neutral-500 font-semibold">Calculating exam diagnostic…</p>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm font-semibold text-neutral-600">Results not found.</p>
      </div>
    );
  }

  const percentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  const timeMinutes = attempt.time_spent_seconds ? Math.floor(attempt.time_spent_seconds / 60) : 0;
  const timeSeconds = attempt.time_spent_seconds ? attempt.time_spent_seconds % 60 : 0;
  const avgSeconds = attempt.total_questions > 0
    ? Math.round((attempt.time_spent_seconds ?? 0) / attempt.total_questions)
    : 0;

  return (
    <>
      <SEO
        title={`Results: ${attempt.quiz.course.code} — OverraPrep AI`}
        description={`Diagnostic breakdown for ${attempt.quiz.title}.`}
        noindex
      />

      <QuizCelebration score={percentage} isVisible={showCelebration} />

      <div className="min-h-screen bg-neutral-50/60 pb-20 selection:bg-amber-500 selection:text-neutral-950">
        {/* Header */}
        <header className="bg-white border-b border-neutral-200/90 px-4 sm:px-8 py-3.5 sticky top-0 z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(`/courses/${attempt.quiz.course_id}`)}
              className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Course</span>
            </button>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Exam Diagnostic
            </span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {/* Main Scorecard */}
          <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-6">
            <div className="text-center pb-6 border-b border-neutral-100">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 block mb-1">
                {attempt.quiz.course.code} · {attempt.quiz.course.name}
              </span>
              <h1 className="font-display font-bold text-lg sm:text-xl text-neutral-950">
                {attempt.quiz.title}
              </h1>

              {/* Large Score */}
              <div className="my-5 flex flex-col items-center">
                <span className="font-display text-5xl sm:text-6xl font-extrabold text-neutral-950 tracking-tight">
                  {percentage}%
                </span>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  percentage >= 70
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : percentage >= 50
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}>
                  {percentage >= 75 ? "Exam Ready" : percentage >= 50 ? "Satisfactory — Revisit Weak Points" : "Needs Immediate Revision"}
                </span>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 pt-6 text-center">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-neutral-950">{attempt.correct_answers}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Correct</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-neutral-950">
                  {attempt.total_questions - attempt.correct_answers}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Wrong</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <Clock className="w-4 h-4 text-neutral-600 mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-neutral-950">
                  {timeMinutes}:{timeSeconds.toString().padStart(2, "0")}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Time</p>
              </div>

              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-100">
                <Target className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="font-display font-bold text-lg text-neutral-950">{avgSeconds}s</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Avg / Q</p>
              </div>
            </div>
          </div>

          {/* =========================================================
              ACTIONABLE DIAGNOSTIC: Missed Topics Breakdown
             ========================================================= */}
          {missedTopics.length > 0 && (
            <div className="bg-white border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-xs mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-700" />
                <h3 className="font-display font-bold text-base text-neutral-950">
                  Targeted Missed-Topic Breakdown
                </h3>
              </div>
              <p className="text-xs text-neutral-600 mb-4">
                These are the exact syllabus topics that cost you marks on this exam.
              </p>

              <div className="space-y-2.5 mb-5">
                {missedTopics.map((topic) => (
                  <div
                    key={topic.topicName}
                    className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-xs sm:text-sm text-neutral-950 truncate">
                        {topic.topicName}
                      </p>
                      <p className="text-[11px] text-amber-900/80 mt-0.5">
                        {topic.missedCount} missed out of {topic.totalCount} tested
                      </p>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-200/80 text-amber-950 shrink-0">
                      -{topic.missedCount} marks
                    </span>
                  </div>
                ))}
              </div>

              {/* 1-Tap Revise Button */}
              <Button
                onClick={() => {
                  const element = document.getElementById("detailed-review");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm h-11 rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Revise Missed Topics with AI Explanations</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate(`/quiz/${quizId}/cbt`)}
              className="flex-1 rounded-xl border-neutral-300 font-semibold text-xs h-10"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Retake CBT</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/courses/${attempt.quiz.course_id}`)}
              className="flex-1 rounded-xl border-neutral-300 font-semibold text-xs h-10"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              <span>Course Outline</span>
            </Button>
            <div className="flex-1">
              <ShareResultsButton quizTitle={attempt.quiz.title} score={percentage} quizId={attempt.quiz.id} />
            </div>
          </div>

          {/* Detailed Question Review */}
          <div id="detailed-review" className="pt-2">
            <div className="mb-4">
              <h3 className="font-display font-bold text-lg text-neutral-950">
                Detailed Answer Review & AI Solutions
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Review each question with full step-by-step solutions to fix misconceptions.
              </p>
            </div>

            <QuizReviewList attemptId={attemptId} quizId={quizId} />
          </div>
        </main>
      </div>
    </>
  );
};

export default QuizResults;
