import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarkedQuestions } from "@/hooks/useBookmarkedQuestions";
import { useQuizAutoSave } from "@/hooks/useQuizAutoSave";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Sparkles,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain,
  Lightbulb,
  Clock,
  Bookmark,
  BookmarkCheck,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import ReportQuestionDialog from "@/components/student/ReportQuestionDialog";
import { ImageZoomModal, ClickableQuestionImage } from "@/components/quiz/ImageZoomModal";
import { SpeakButton } from "@/components/audio/SpeakButton";
import { haptic } from "@/lib/native";
import PreQuizTimerDialog from "@/components/quiz/PreQuizTimerDialog";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  image_url: string | null;
  topic: {
    name: string;
  } | null;
}

interface QuizData {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  course: {
    code: string;
    name: string;
  };
}

const QuizPractice = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarkedQuestions();
  const { saveState, loadState, clearState, hasSavedState } = useQuizAutoSave(quizId || "");
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [explanationTone, setExplanationTone] = useState<"simple" | "default" | "deep">(
    profile?.academic_path === "secondary" ? "simple" : profile?.academic_path === "university" ? "deep" : "default"
  );
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  // Track answers per question for restore
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({});
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedData, setSavedData] = useState<ReturnType<typeof loadState>>(null);
  // Pre-quiz timer
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [chosenMinutes, setChosenMinutes] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  // Show timer picker once the quiz is loaded (and not resuming)
  useEffect(() => {
    if (!quiz) return;
    if (showResumePrompt) return;
    if (chosenMinutes !== null) return;
    setShowTimerPicker(true);
  }, [quiz, showResumePrompt, chosenMinutes]);

  // Countdown
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void handleFinishQuiz();
      return;
    }
    const t = setInterval(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Check for saved state before loading quiz
  useEffect(() => {
    if (!quizId || !user) return;
    
    if (hasSavedState()) {
      const saved = loadState();
      if (saved) {
        setSavedData(saved);
        setShowResumePrompt(true);
      }
    }
  }, [quizId, user, hasSavedState, loadState]);

  const fetchQuizData = useCallback(async (resumeData?: { answers: Record<string, string>; currentIndex: number; attemptId: string | null }) => {
    if (!quizId || !user) return;

    try {
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .select("*, courses(code, name)")
        .eq("id", quizId)
        .single();

      if (quizError) throw quizError;

      // Token gate: tutor-made quizzes must be unlocked first.
      // Free: your own quizzes (tutor_id == you) and AI/system quizzes (tutor_id is null).
      const needsGate = !!quizData.tutor_id && quizData.tutor_id !== user.id;
      if (needsGate) {
        const { data: unlockRow } = await (supabase as any)
          .from("quiz_unlocks")
          .select("id")
          .eq("user_id", user.id)
          .eq("quiz_id", quizId)
          .maybeSingle();
        if (!unlockRow) {
          setQuiz({
            ...quizData,
            course: quizData.courses as { code: string; name: string },
          });
          setNeedsUnlock(true);
          setIsLoading(false);
          return;
        }
      }

      setQuiz({
        ...quizData,
        course: quizData.courses as { code: string; name: string }
      });

      const { data: questionsData, error: questionsError } = await supabase
        .from("quiz_questions")
        .select("questions(*, topics(name))")
        .eq("quiz_id", quizId)
        .order("order_index");

      if (questionsError) throw questionsError;

      const formattedQuestions = questionsData.map((qq: any) => ({
        ...qq.questions,
        topic: qq.questions.topics
      }));

      setQuestions(formattedQuestions);

      if (resumeData?.attemptId) {
        // Resume existing attempt
        setAttemptId(resumeData.attemptId);
        setAnswersMap(resumeData.answers);
        setCurrentIndex(resumeData.currentIndex);
        
        // Calculate score from saved answers
        let correct = 0;
        let total = 0;
        for (const [qId, answer] of Object.entries(resumeData.answers)) {
          const q = formattedQuestions.find((fq: Question) => fq.id === qId);
          if (q) {
            total++;
            if (answer === q.correct_option) correct++;
          }
        }
        setScore({ correct, total });

        toast({
          title: "Progress Restored",
          description: `Resuming from question ${resumeData.currentIndex + 1}. You've answered ${total} question(s) so far.`,
        });
      } else {
        // Create new attempt
        const { data: attemptData, error: attemptError } = await supabase
          .from("quiz_attempts")
          .insert({
            user_id: user.id,
            quiz_id: quizId,
            mode: "practice",
            total_questions: formattedQuestions.length,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(attemptData.id);
        const { track } = await import("@/lib/analytics");
        void track("quiz_started", { quiz_id: quizId, mode: "practice", total_questions: formattedQuestions.length });
      }
    } catch (error) {
      console.error("Error fetching quiz:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load quiz. Please try again.",
      });
      navigate("/student/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [quizId, user, navigate, toast]);

  // Auto-load quiz when no resume prompt needed
  useEffect(() => {
    if (!quizId || !user || showResumePrompt) return;
    if (!quiz && !isLoading) return; // Already attempted
    if (quiz) return; // Already loaded
    
    fetchQuizData();
  }, [quizId, user, showResumePrompt, quiz, fetchQuizData, isLoading]);

  // Auto-save progress whenever state changes
  useEffect(() => {
    if (!attemptId || !quizId) return;
    
    saveState({
      answers: answersMap,
      flagged: [],
      currentIndex,
      timeLeft: 0,
      attemptId,
    });
  }, [answersMap, currentIndex, attemptId, quizId, saveState]);

  const currentQuestion = questions[currentIndex];

  const handleSelectAnswer = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    void haptic("selection");
  };

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion || !attemptId) return;

    const correct = selectedAnswer === currentQuestion.correct_option;
    setIsCorrect(correct);
    setIsAnswered(true);
    void haptic(correct ? "success" : "error");
    setScore(prev => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1
    }));

    // Track this answer
    setAnswersMap(prev => ({ ...prev, [currentQuestion.id]: selectedAnswer }));

    // Save answer to DB
    await supabase.from("quiz_answers").insert({
      attempt_id: attemptId,
      question_id: currentQuestion.id,
      selected_option: selectedAnswer,
      is_correct: correct,
    });
  };

  const handleGetAIExplanation = async () => {
    if (!currentQuestion) return;
    
    setIsLoadingExplanation(true);
    setAiExplanation(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: currentQuestion.question_text,
          options: {
            A: currentQuestion.option_a,
            B: currentQuestion.option_b,
            C: currentQuestion.option_c,
            D: currentQuestion.option_d,
          },
          correctOption: currentQuestion.correct_option,
          userAnswer: selectedAnswer,
          topic: currentQuestion.topic?.name,
          tone: explanationTone,
        },
      });

      if (error) throw error;
      setAiExplanation(data.explanation);
    } catch (error: any) {
      console.error("Error getting AI explanation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to get AI explanation. Try again.",
      });
    } finally {
      setIsLoadingExplanation(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAiExplanation(null);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setIsCorrect(false);
      setAiExplanation(null);
    }
  };

  const handleFinishQuiz = async () => {
    if (!attemptId) return;

    // Clear auto-save on explicit finish
    clearState();

    await supabase
      .from("quiz_attempts")
      .update({
        completed_at: new Date().toISOString(),
        correct_answers: score.correct,
        score: Math.round((score.correct / questions.length) * 100),
      })
      .eq("id", attemptId);

    const { track } = await import("@/lib/analytics");
    void track("quiz_completed", {
      quiz_id: quizId,
      mode: "practice",
      score: Math.round((score.correct / questions.length) * 100),
      correct: score.correct,
      total: questions.length,
    });

    navigate(`/quiz/${quizId}/results/${attemptId}`);
  };

  const handleResume = () => {
    setShowResumePrompt(false);
    setIsLoading(true);
    fetchQuizData({
      answers: savedData?.answers || {},
      currentIndex: savedData?.currentIndex || 0,
      attemptId: savedData?.attemptId || null,
    });
  };

  const handleStartFresh = () => {
    clearState();
    setShowResumePrompt(false);
    setSavedData(null);
    setIsLoading(true);
    fetchQuizData();
  };

  // Resume prompt screen
  if (showResumePrompt) {
    const answeredCount = Object.keys(savedData?.answers || {}).length;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center">
          <RotateCcw className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Resume Quiz?
          </h2>
          <p className="text-muted-foreground mb-6">
            You have saved progress for this quiz. You answered {answeredCount} question(s) and were on question {(savedData?.currentIndex || 0) + 1}.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="hero" onClick={handleResume} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Continue Where I Left Off
            </Button>
            <Button variant="outline" onClick={handleStartFresh} className="w-full">
              Start Fresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium mb-2">Quiz not found</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const options = [
    { key: "A", text: currentQuestion?.option_a },
    { key: "B", text: currentQuestion?.option_b },
    { key: "C", text: currentQuestion?.option_c },
    { key: "D", text: currentQuestion?.option_d },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Exit Practice
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                {quiz.course.code}
              </span>
              <span className="font-display font-semibold text-foreground text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">
                {quiz.title}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {secondsLeft !== null && (
                <div className={`flex items-center gap-1.5 text-sm font-mono px-2 py-1 rounded-md ${
                  secondsLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>
                  <Clock className="w-4 h-4" />
                  {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:
                  {String(secondsLeft % 60).padStart(2, "0")}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-foreground font-medium">{score.correct}</span>
                <span className="text-muted-foreground">/ {score.total}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <PreQuizTimerDialog
        open={showTimerPicker}
        onOpenChange={setShowTimerPicker}
        tutorMinutes={quiz?.duration_minutes ?? 0}
        onConfirm={(mins) => {
          setChosenMinutes(mins);
          setSecondsLeft(mins > 0 ? mins * 60 : null);
          setShowTimerPicker(false);
        }}
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQuestion?.topic && (
              <span className="text-muted-foreground">
                Topic: {currentQuestion.topic.name}
              </span>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-primary transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-display text-xl font-semibold text-foreground mb-4 leading-relaxed">
            {currentQuestion?.question_text}
          </h2>

          {/* Question Image */}
          <ClickableQuestionImage
            imageUrl={currentQuestion?.image_url || null}
            onImageClick={() => setZoomedImageUrl(currentQuestion?.image_url || null)}
          />

          {/* Options */}
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const isCorrectAnswer = option.key === currentQuestion?.correct_option;
              
              let optionStyle = "border-border hover:border-primary/50 hover:bg-muted/50";
              
              if (isAnswered) {
                if (isCorrectAnswer) {
                  optionStyle = "border-success bg-success/10";
                } else if (isSelected && !isCorrectAnswer) {
                  optionStyle = "border-destructive bg-destructive/10";
                }
              } else if (isSelected) {
                optionStyle = "border-primary bg-primary/10";
              }

              return (
                <button
                  key={option.key}
                  onClick={() => handleSelectAnswer(option.key)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${optionStyle}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                      isAnswered && isCorrectAnswer
                        ? "bg-success text-success-foreground"
                        : isAnswered && isSelected && !isCorrectAnswer
                        ? "bg-destructive text-destructive-foreground"
                        : isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {option.key}
                    </span>
                    <span className="text-foreground flex-1 pt-1">{option.text}</span>
                    {isAnswered && isCorrectAnswer && (
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-1" />
                    )}
                    {isAnswered && isSelected && !isCorrectAnswer && (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Answer Feedback */}
        {isAnswered && (
          <div className={`rounded-xl p-4 mb-6 ${
            isCorrect ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="font-semibold text-success">Correct!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-destructive" />
                    <span className="font-semibold text-destructive">Incorrect</span>
                  </>
                )}
              </div>
              
              {/* Bookmark Button */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => currentQuestion && toggleBookmark(currentQuestion.id)}
                  className={isBookmarked(currentQuestion?.id || "") ? "text-primary" : "text-muted-foreground"}
                >
                  {isBookmarked(currentQuestion?.id || "") ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 mr-1" />
                      Bookmarked
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 mr-1" />
                      Bookmark
                    </>
                  )}
                </Button>
                
                {/* Report Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportDialog(true)}
                  className="text-muted-foreground hover:text-accent"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Report
                </Button>
              </div>
            </div>
            
            {currentQuestion?.explanation && (
              <p className="text-sm text-muted-foreground mb-3">
                {currentQuestion.explanation}
              </p>
            )}

            {/* AI Explanation */}
            {!aiExplanation ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetAIExplanation}
                  disabled={isLoadingExplanation}
                >
                  {isLoadingExplanation ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2 text-accent" />
                  )}
                  Get AI Explanation
                </Button>
                <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                  {(["simple", "default", "deep"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setExplanationTone(t)}
                      className={`px-2.5 py-1.5 capitalize transition-colors ${
                        explanationTone === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                      aria-pressed={explanationTone === t}
                    >
                      {t === "simple" ? "Like I'm 12" : t === "deep" ? "Lecturer" : "Standard"}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-card rounded-lg border border-border">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-accent" />
                    <span className="font-medium text-foreground text-sm">AI Explanation</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {explanationTone === "simple" ? "Like I'm 12" : explanationTone === "deep" ? "Lecturer" : "Standard"}
                    </span>
                  </div>
                  <SpeakButton text={aiExplanation} />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {aiExplanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={handlePrevQuestion}
            disabled={currentIndex === 0}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Previous
          </Button>

          {!isAnswered ? (
            <Button
              variant="hero"
              onClick={handleSubmitAnswer}
              disabled={!selectedAnswer}
              className="w-full sm:w-auto order-first sm:order-none"
            >
              Submit Answer
            </Button>
          ) : currentIndex < questions.length - 1 ? (
            <Button variant="hero" onClick={handleNextQuestion} className="w-full sm:w-auto order-first sm:order-none">
              Next Question
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          ) : (
            <Button variant="accent" onClick={handleFinishQuiz} className="w-full sm:w-auto order-first sm:order-none">
              Finish Quiz
            </Button>
          )}

          <div className="hidden sm:block w-24" /> {/* Spacer for alignment on desktop */}
        </div>
      </main>

      {/* Report Question Dialog */}
      {currentQuestion && (
        <ReportQuestionDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          questionId={currentQuestion.id}
          questionText={currentQuestion.question_text}
        />
      )}

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageUrl={zoomedImageUrl}
        isOpen={!!zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />
    </div>
  );
};

export default QuizPractice;
