import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RateQuizDialog } from "@/components/student/RateQuizDialog";
import { ShareResultsButton } from "@/components/quiz/ShareResultsButton";
import { QuizCelebration } from "@/components/quiz/QuizCelebration";
import { QuizResultShareCard } from "@/components/quiz/QuizResultShareCard";
import { QuizReviewList } from "@/components/quiz/QuizReviewList";
import logo from "@/assets/logo.png";
import {
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Home,
  Star
} from "lucide-react";

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
    course: {
      code: string;
      name: string;
    };
  };
}

const QuizResults = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!attemptId || !user || !quizId) return;

      try {
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select("*, quizzes(id, title, courses(code, name))")
          .eq("id", attemptId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;

        setAttempt({
          ...data,
          quiz: {
            id: data.quizzes.id,
            title: data.quizzes.title,
            course: data.quizzes.courses as { code: string; name: string }
          }
        });

        // Check if user already rated this quiz
        const { data: ratingData } = await supabase
          .from("quiz_ratings")
          .select("id")
          .eq("quiz_id", quizId)
          .eq("user_id", user.id)
          .maybeSingle();

        setHasRated(!!ratingData);

        // Show celebration for good scores
        const scorePercent = Math.round((data.correct_answers / data.total_questions) * 100);
        if (scorePercent >= 70) {
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 4000);
        }

        // Show rating prompt after a short delay if not already rated
        if (!ratingData) {
          setTimeout(() => setShowRating(true), scorePercent >= 70 ? 4500 : 1500);
        }
      } catch (error) {
        console.error("Error fetching results:", error);
        navigate("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [attemptId, user, quizId, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Results not found</p>
      </div>
    );
  }

  const percentage = Math.round((attempt.correct_answers / attempt.total_questions) * 100);
  const isPassing = percentage >= 50;
  const isExcellent = percentage >= 80;
  const timeMinutes = attempt.time_spent_seconds 
    ? Math.floor(attempt.time_spent_seconds / 60) 
    : 0;
  const timeSeconds = attempt.time_spent_seconds 
    ? attempt.time_spent_seconds % 60 
    : 0;

  const getMessage = () => {
    if (percentage >= 90) return "Outstanding! You're exam-ready!";
    if (percentage >= 80) return "Excellent work! Keep it up!";
    if (percentage >= 70) return "Good job! You're getting there!";
    if (percentage >= 60) return "Not bad! A bit more practice will help.";
    if (percentage >= 50) return "You passed! But there's room for improvement.";
    return "Keep practicing! You'll get better.";
  };

  return (
    <>
      {/* Celebration Animation */}
      <QuizCelebration score={percentage} isVisible={showCelebration} />

      <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>

            <a href="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="relative bg-card rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-600" />

          <div className="relative px-6 pt-10 pb-8 text-center bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/20">
            <div className="absolute top-4 right-4 text-[10px] font-bold tracking-widest text-amber-700/70">OVERRAPREP AI</div>
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              {isExcellent ? <Trophy className="w-12 h-12 text-white" /> : isPassing ? <Target className="w-12 h-12 text-white" /> : <XCircle className="w-12 h-12 text-white" />}
            </div>
            <h1 className="font-display text-6xl font-extrabold bg-gradient-to-br from-amber-600 to-yellow-700 bg-clip-text text-transparent mb-1 tracking-tight">
              {percentage}%
            </h1>
            <p className="text-sm font-semibold tracking-wide uppercase text-amber-700/80 mb-1">
              {percentage >= 90 ? "Outstanding" : percentage >= 80 ? "Excellent" : percentage >= 70 ? "Great Job" : isPassing ? "Passed" : "Keep Practicing"}
            </p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{getMessage()}</p>
          </div>

          <div className="px-6 pb-8">
            <div className="text-center mb-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-0.5">{attempt.quiz.title}</h2>
              <p className="text-xs text-muted-foreground">{attempt.quiz.course.code} · {attempt.quiz.course.name}</p>
              <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2.5 py-1 rounded-full">
                {attempt.mode === "practice" ? "Practice Mode" : "CBT Simulation"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 border border-emerald-200/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{attempt.correct_answers}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/30 dark:to-rose-900/10 border border-rose-200/50">
                <XCircle className="w-4 h-4 text-rose-600 mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{attempt.total_questions - attempt.correct_answers}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Wrong</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10 border border-amber-200/50">
                <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">{timeMinutes}:{timeSeconds.toString().padStart(2, "0")}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Time</p>
              </div>
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/10 border border-violet-200/50">
                <Target className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                <p className="font-display text-xl font-bold text-foreground">
                  {attempt.total_questions > 0 ? Math.round((attempt.time_spent_seconds ?? 0) / attempt.total_questions) : 0}s
                </p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg / Q</p>
              </div>
            </div>

            <div className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100/60 dark:from-amber-950/20 dark:to-yellow-950/10 border border-amber-300/40">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 text-center">
                📸 Save your branded result card
              </p>
              <QuizResultShareCard
                quizTitle={attempt.quiz.title}
                courseCode={attempt.quiz.course.code}
                score={attempt.correct_answers}
                total={attempt.total_questions}
                timeSeconds={attempt.time_spent_seconds ?? 0}
                mode={attempt.mode}
              />
            </div>

            <div className="mb-4">
              <Button variant={hasRated ? "outline" : "secondary"} className="w-full" onClick={() => setShowRating(true)}>
                <Star className={`w-4 h-4 mr-2 ${hasRated ? "fill-accent text-accent" : ""}`} />
                {hasRated ? "Update Your Rating" : "Rate This Quiz"}
              </Button>
            </div>

            <div className="mb-4">
              <ShareResultsButton quizTitle={attempt.quiz.title} score={percentage} quizId={attempt.quiz.id} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="default" className="flex-1" onClick={() => navigate(`/quiz/${quizId}/practice`)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/dashboard")}>
                <Home className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Per-question review with AI explanations */}
        {attemptId && quizId && (
          <QuizReviewList attemptId={attemptId} quizId={quizId} />
        )}
      </main>

      {/* Rating Dialog */}
      {quizId && attempt && (
        <RateQuizDialog
          open={showRating}
          onOpenChange={(open) => {
            setShowRating(open);
            if (!open) setHasRated(true);
          }}
          quizId={quizId}
          quizTitle={attempt.quiz.title}
        />
      )}
      </div>
    </>
  );
};

export default QuizResults;
