import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarkedQuestions } from "@/hooks/useBookmarkedQuestions";
import { useOfflineAttemptSync } from "@/hooks/useOfflineAttemptSync";
import { queuePendingAttempt } from "@/lib/offlineQuizStore";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  AlertTriangle,
  Flag,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CheckCircle2,
  X,
  Loader2,
  Wifi,
  WifiOff,
  SunMedium,
  Check,
} from "lucide-react";
import ReportQuestionDialog from "@/components/student/ReportQuestionDialog";
import { ImageZoomModal, ClickableQuestionImage } from "@/components/quiz/ImageZoomModal";
import { MathMarkdown } from "@/components/quiz/MathMarkdown";
import { haptic } from "@/lib/native";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  image_url: string | null;
  topic_id?: string | null;
  explanation?: string | null;
}

interface QuizData {
  id: string;
  title: string;
  duration_minutes: number;
  course: {
    code: string;
    name: string;
  };
}

export const CBTSimulation = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { isBookmarked, toggleBookmark } = useBookmarkedQuestions();
  const { flush } = useOfflineAttemptSync();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGridDrawer, setShowGridDrawer] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Global-Grade UI: Responsive High-Contrast Option
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cbt_high_contrast") === "true";
    } catch {
      return false;
    }
  });

  // Offline Resilience & Network Monitoring
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnectedBanner, setShowReconnectedBanner] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const endsAtRef = useRef<number | null>(null);

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    try {
      localStorage.setItem("cbt_high_contrast", String(next));
    } catch {
      // ignore
    }
    void haptic("selection");
  };

  // Monitor network online/offline transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnectedBanner(true);
      void flush(); // auto-sync any queued offline attempts
      const timer = setTimeout(() => setShowReconnectedBanner(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnectedBanner(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flush]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Load Quiz Data: Hydrate immediately from Local Cache first (offline resilience)
  useEffect(() => {
    if (!quizId || !user) return;

    let isMounted = true;
    const cacheKeyQuiz = `cbt_quiz_${quizId}`;
    const cacheKeySession = `cbt_session_${quizId}`;

    // 1. Instant local restore from cache if exists
    let hasRestoredFromCache = false;
    try {
      const cachedQuizRaw = localStorage.getItem(cacheKeyQuiz);
      const cachedSessionRaw = localStorage.getItem(cacheKeySession);

      if (cachedQuizRaw) {
        const cached = JSON.parse(cachedQuizRaw);
        if (cached.quiz && Array.isArray(cached.questions) && cached.questions.length > 0) {
          setQuiz(cached.quiz);
          setQuestions(cached.questions);
          hasRestoredFromCache = true;
        }
      }

      if (cachedSessionRaw) {
        const session = JSON.parse(cachedSessionRaw);
        if (session.answers) setAnswers(session.answers);
        if (session.flagged) setFlagged(new Set(session.flagged));
        if (typeof session.currentIndex === "number") setCurrentIndex(session.currentIndex);
        if (session.attemptId) setAttemptId(session.attemptId);
        if (session.startedAt) startTimeRef.current = session.startedAt;

        if (session.endsAt) {
          endsAtRef.current = session.endsAt;
          const remaining = Math.max(0, Math.round((session.endsAt - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
      }
    } catch (e) {
      console.warn("Failed reading local CBT cache:", e);
    }

    if (hasRestoredFromCache) {
      setIsLoading(false);
    }

    // 2. Fetch or verify with Supabase (if online)
    const fetchQuizData = async () => {
      try {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("id", quizId)
          .single();

        if (quizError) {
          // If offline and we had cache, don't crash
          if (hasRestoredFromCache) return;
          throw quizError;
        }

        const formattedQuiz: QuizData = {
          ...quizData,
          course: quizData.courses as { code: string; name: string },
        };

        const { data: questionsData, error: questionsError } = await supabase
          .from("quiz_questions")
          .select("questions(*)")
          .eq("quiz_id", quizId)
          .order("order_index");

        if (questionsError) {
          if (hasRestoredFromCache) return;
          throw questionsError;
        }

        const formattedQuestions: Question[] = questionsData.map((qq: any) => qq.questions);

        if (!isMounted) return;

        setQuiz(formattedQuiz);
        setQuestions(formattedQuestions);

        // Save entire quiz bundle into local cache
        try {
          localStorage.setItem(
            cacheKeyQuiz,
            JSON.stringify({ quiz: formattedQuiz, questions: formattedQuestions, cachedAt: Date.now() })
          );
        } catch {
          // localStorage full or disabled
        }

        // Initialize or resume attempt
        const existingSessionRaw = localStorage.getItem(cacheKeySession);
        let currentAttemptId = existingSessionRaw ? JSON.parse(existingSessionRaw).attemptId : null;
        let existingEndsAt = existingSessionRaw ? JSON.parse(existingSessionRaw).endsAt : null;

        if (!currentAttemptId && navigator.onLine) {
          const { data: attemptData, error: attemptError } = await supabase
            .from("quiz_attempts")
            .insert({
              user_id: user.id,
              quiz_id: quizId,
              mode: "simulation",
              total_questions: formattedQuestions.length,
            })
            .select()
            .single();

          if (!attemptError && attemptData) {
            currentAttemptId = attemptData.id;
          }
        }

        // Fallback local attempt ID if offline
        if (!currentAttemptId) {
          currentAttemptId = `local_attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }

        setAttemptId(currentAttemptId);

        // Compute endsAt
        if (!existingEndsAt) {
          const totalSec = formattedQuiz.duration_minutes * 60;
          existingEndsAt = Date.now() + totalSec * 1000;
          endsAtRef.current = existingEndsAt;
          setTimeLeft(totalSec);
        } else {
          endsAtRef.current = existingEndsAt;
          const remaining = Math.max(0, Math.round((existingEndsAt - Date.now()) / 1000));
          setTimeLeft(remaining);
        }

        // Persist session state
        try {
          localStorage.setItem(
            cacheKeySession,
            JSON.stringify({
              attemptId: currentAttemptId,
              endsAt: existingEndsAt,
              startedAt: startTimeRef.current,
              currentIndex: 0,
              answers: {},
              flagged: [],
            })
          );
        } catch {
          // ignore
        }
      } catch (error) {
        if (!hasRestoredFromCache) {
          toast({
            variant: "destructive",
            title: "Examination Load Error",
            description: "Please check your network connection or try again.",
          });
          navigate("/student/dashboard");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchQuizData();

    return () => {
      isMounted = false;
    };
  }, [quizId, user, navigate, toast]);

  const handleSubmitRef = useRef<() => void>(() => {});

  // Robust Persistent Timer (ticks continuously using endsAt timestamp)
  useEffect(() => {
    if (isLoading || !endsAtRef.current) return;

    const tick = () => {
      if (!endsAtRef.current) return;
      const remaining = Math.max(0, Math.round((endsAtRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmitRef.current();
      }
    };

    // Immediate first tick
    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  // Continuous Local Persistence Helper
  const persistSessionNow = useCallback(
    (
      newAnswers: Record<string, string>,
      newFlagged: Set<string>,
      newIndex: number,
      newTimeLeft: number
    ) => {
      if (!quizId) return;
      try {
        localStorage.setItem(
          `cbt_session_${quizId}`,
          JSON.stringify({
            attemptId,
            endsAt: endsAtRef.current,
            startedAt: startTimeRef.current,
            currentIndex: newIndex,
            timeLeft: newTimeLeft,
            answers: newAnswers,
            flagged: Array.from(newFlagged),
            updatedAt: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Failed saving CBT session to localStorage:", e);
      }
    },
    [quizId, attemptId]
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAnswer = (questionId: string, option: string) => {
    const updated = { ...answers, [questionId]: option };
    setAnswers(updated);
    persistSessionNow(updated, flagged, currentIndex, timeLeft);
    void haptic("selection");
  };

  const toggleFlag = (questionId: string) => {
    const next = new Set(flagged);
    if (next.has(questionId)) next.delete(questionId);
    else next.add(questionId);
    setFlagged(next);
    persistSessionNow(answers, next, currentIndex, timeLeft);
    void haptic("selection");
  };

  const handleNavigateIndex = (newIdx: number) => {
    const safeIdx = Math.max(0, Math.min(questions.length - 1, newIdx));
    setCurrentIndex(safeIdx);
    persistSessionNow(answers, flagged, safeIdx, timeLeft);
  };

  // Submit Exam: Online & Offline Resilient
  const handleSubmitExam = async () => {
    if (!quizId || isSubmitting) return;

    setIsSubmitting(true);
    setShowSubmitConfirm(false);
    void haptic("heavy");
    if (timerRef.current) clearInterval(timerRef.current);

    const safeAttemptId = attemptId || `att_${Date.now()}`;
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

    let correctCount = 0;
    const answerInserts = questions.map((q) => {
      const selectedOption = answers[q.id] || null;
      const isCorrect = selectedOption === q.correct_option;
      if (isCorrect) correctCount++;

      return {
        attempt_id: safeAttemptId,
        question_id: q.id,
        selected_option: selectedOption,
        is_correct: selectedOption ? isCorrect : false,
      };
    });

    const score = Math.round((correctCount / Math.max(1, questions.length)) * 100);

    // Save offline result snapshot so /results can load instantly offline
    try {
      localStorage.setItem(
        `cbt_offline_result_${safeAttemptId}`,
        JSON.stringify({
          attemptId: safeAttemptId,
          quizId,
          quiz,
          questions,
          answers,
          score,
          correctCount,
          totalQuestions: questions.length,
          timeSpent,
          completedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore
    }

    // Try online submission if connected
    if (navigator.onLine && user && !safeAttemptId.startsWith("local_attempt_")) {
      try {
        await supabase.from("quiz_answers").insert(answerInserts);

        await supabase
          .from("quiz_attempts")
          .update({
            completed_at: new Date().toISOString(),
            correct_answers: correctCount,
            score,
            time_spent_seconds: timeSpent,
          })
          .eq("id", safeAttemptId);

        // Clear active in-progress session
        try {
          localStorage.removeItem(`cbt_session_${quizId}`);
        } catch {}

        navigate(`/quiz/${quizId}/results/${safeAttemptId}`);
        return;
      } catch (err) {
        console.warn("Online submission failed, falling back to local sync queue:", err);
      }
    }

    // Fallback: Queue attempt in offline store for background sync
    if (user) {
      try {
        await queuePendingAttempt({
          user_id: user.id,
          quiz_id: quizId,
          mode: "simulation",
          total_questions: questions.length,
          correct_answers: correctCount,
          score,
          time_spent_seconds: timeSpent,
          started_at: new Date(startTimeRef.current).toISOString(),
          completed_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed queueing offline attempt:", err);
      }
    }

    // Clear active in-progress session
    try {
      localStorage.removeItem(`cbt_session_${quizId}`);
    } catch {}

    toast({
      title: "Offline Mode — Exam Saved Locally",
      description: `Your score of ${score}% (${correctCount}/${questions.length}) is safely stored on this device. It will automatically sync when you are back online.`,
    });

    navigate(`/quiz/${quizId}/results/${safeAttemptId}?offline=true`);
  };

  handleSubmitRef.current = handleSubmitExam;

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;
  const isLowTime = timeLeft <= 300; // < 5 mins

  const options = currentQuestion
    ? [
        { key: "A", text: currentQuestion.option_a },
        { key: "B", text: currentQuestion.option_b },
        { key: "C", text: currentQuestion.option_c },
        { key: "D", text: currentQuestion.option_d },
      ]
    : [];

  if (isLoading || !currentQuestion) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-9 h-9 animate-spin text-amber-500 mb-4" />
        <p className="font-display font-bold text-base text-neutral-900 dark:text-white">
          Preparing CBT Examination Engine…
        </p>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
          Loading verified university questions and initializing local offline storage cache.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/80 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col pb-28 selection:bg-amber-500 selection:text-neutral-950">
      {/* ==================== 1. NETWORK STATUS BANNER ==================== */}
      {!isOnline && (
        <div className="bg-amber-500 border-b border-amber-600 px-4 py-2 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-40 select-none animate-in fade-in slide-in-from-top-1">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Mode — All answers and timer continuously preserved locally.</span>
        </div>
      )}

      {showReconnectedBanner && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shadow-xs sticky top-0 z-40 select-none animate-in fade-in slide-in-from-top-1">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Back Online — Connection restored. Background synchronization active.</span>
        </div>
      )}

      {/* ==================== 2. STICKY TOP HEADER ==================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-200/90 dark:border-neutral-800 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-sm sm:text-base text-neutral-950 dark:text-white tracking-tight truncate">
                {quiz?.course.code}
              </span>
              <span className="text-xs text-neutral-500 hidden sm:inline truncate">
                {quiz?.title}
              </span>
            </div>
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mt-0.5">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* High-Contrast Toggle Button */}
            <Button
              size="sm"
              variant={highContrast ? "secondary" : "outline"}
              onClick={toggleHighContrast}
              className={`h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                highContrast
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-bold border-neutral-900 shadow-xs"
                  : "border-neutral-300 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950"
              }`}
              title="Toggle high-contrast choices for sunlight and OLED readability"
            >
              <SunMedium className="w-4 h-4" />
              <span className="hidden sm:inline">High Contrast</span>
            </Button>

            {/* Continuous Timer Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-extrabold transition-colors select-none ${
                isLowTime
                  ? "bg-rose-50 text-rose-700 border border-rose-300 animate-pulse"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
              }`}
            >
              <Clock className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Question Navigator Drawer Trigger */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGridDrawer(true)}
              className="h-9 px-3 rounded-xl border-neutral-300 dark:border-neutral-700 font-semibold text-xs flex items-center gap-1.5 active:scale-95"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ==================== 3. MAIN QUESTION SURFACE ==================== */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        <div
          className={`bg-white dark:bg-neutral-900 rounded-3xl p-5 sm:p-7 shadow-xs transition-all ${
            highContrast
              ? "border-2 border-neutral-900 dark:border-neutral-100 shadow-md"
              : "border border-neutral-200/90 dark:border-neutral-800"
          }`}
        >
          {/* Top question toolbar */}
          <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-neutral-100 dark:border-neutral-800">
            <span
              className={`text-xs uppercase tracking-wider font-extrabold ${
                highContrast ? "text-neutral-950 dark:text-white" : "text-neutral-500"
              }`}
            >
              Question #{currentIndex + 1}
            </span>

            <div className="flex items-center gap-2">
              {/* Bookmark */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleBookmark(currentQuestion.id)}
                className="h-9 w-9 p-0 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white active:scale-95"
                title="Bookmark for review"
              >
                {isBookmarked(currentQuestion.id) ? (
                  <BookmarkCheck className="w-4 h-4 text-amber-600" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
              </Button>

              {/* Flag for Review */}
              <Button
                variant={flagged.has(currentQuestion.id) ? "destructive" : "outline"}
                size="sm"
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                  flagged.has(currentQuestion.id)
                    ? "bg-amber-500 hover:bg-amber-600 text-neutral-950 border-amber-500 shadow-xs"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>{flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}</span>
              </Button>
            </div>
          </div>

          {/* Question Prompt */}
          <div
            className={`font-display leading-relaxed mb-6 ${
              highContrast
                ? "text-lg sm:text-xl font-bold text-neutral-950 dark:text-white"
                : "text-base sm:text-lg font-semibold text-neutral-950 dark:text-neutral-100"
            }`}
          >
            <MathMarkdown content={currentQuestion.question_text} />
          </div>

          {/* Optional Question Image */}
          <ClickableQuestionImage
            imageUrl={currentQuestion.image_url}
            onImageClick={() => setZoomedImageUrl(currentQuestion.image_url)}
            className="max-h-60 mb-6 rounded-2xl border border-neutral-200 dark:border-neutral-800"
          />

          {/* High-Contrast Responsive Choices */}
          <div className="space-y-3">
            {options.map((option) => {
              const isSelected = answers[currentQuestion.id] === option.key;

              // High-Contrast vs Standard styling
              let choiceStyle = "";
              let badgeStyle = "";

              if (highContrast) {
                if (isSelected) {
                  choiceStyle =
                    "border-3 border-amber-600 bg-amber-100/90 dark:bg-amber-950/60 text-neutral-950 dark:text-amber-100 shadow-md ring-2 ring-amber-500";
                  badgeStyle = "bg-amber-600 text-white font-extrabold";
                } else {
                  choiceStyle =
                    "border-2 border-neutral-800 dark:border-neutral-300 bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-xs";
                  badgeStyle =
                    "border-2 border-neutral-800 dark:border-neutral-300 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-bold";
                }
              } else {
                if (isSelected) {
                  choiceStyle =
                    "border-2 border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-neutral-950 dark:text-white shadow-xs";
                  badgeStyle = "bg-amber-500 text-neutral-950 font-bold";
                } else {
                  choiceStyle =
                    "border border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 text-neutral-800 dark:text-neutral-200";
                  badgeStyle = "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold";
                }
              }

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSelectAnswer(currentQuestion.id, option.key)}
                  className={`w-full min-h-[56px] text-left p-4 rounded-2xl transition-all flex items-start gap-3.5 active:scale-[0.98] select-none ${choiceStyle}`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition-colors ${badgeStyle}`}
                  >
                    {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : option.key}
                  </span>
                  <div
                    className={`leading-normal pt-1 flex-1 ${
                      highContrast ? "text-base font-semibold" : "text-sm font-medium"
                    }`}
                  >
                    <MathMarkdown content={option.text} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* ==================== 4. FIXED BOTTOM CONTROL BAR ==================== */}
      <footer className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Previous Button (strictly min-h-[48px]) */}
          <Button
            variant="outline"
            onClick={() => handleNavigateIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="rounded-2xl border-neutral-300 dark:border-neutral-700 font-bold text-xs sm:text-sm min-h-[48px] h-12 px-5 active:scale-95 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span>Prev</span>
          </Button>

          <div className="text-center hidden sm:block">
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
              {answeredCount} of {questions.length} answered
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Next Button (strictly min-h-[48px]) */}
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => handleNavigateIndex(currentIndex + 1)}
                className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-bold text-xs sm:text-sm min-h-[48px] h-12 px-5 rounded-2xl flex items-center gap-1.5 active:scale-95 shadow-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : null}

            {/* Submit Exam Button (strictly min-h-[48px]) */}
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs sm:text-sm min-h-[48px] h-12 px-6 rounded-2xl shadow-xs active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Submitting…</span>
                </>
              ) : (
                <span>Submit Exam</span>
              )}
            </Button>
          </div>
        </div>
      </footer>

      {/* ==================== 5. QUESTION GRID OVERVIEW DRAWER ==================== */}
      <Sheet open={showGridDrawer} onOpenChange={setShowGridDrawer}>
        <SheetContent side="bottom" className="max-h-[80vh] h-auto rounded-t-3xl bg-white dark:bg-neutral-900 p-5 sm:p-7">
          <SheetHeader className="text-left pb-3 border-b border-neutral-100 dark:border-neutral-800">
            <SheetTitle className="font-display font-bold text-lg text-neutral-950 dark:text-white">
              Question Navigator
            </SheetTitle>
            <SheetDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              {answeredCount} answered · {unansweredCount} remaining · {flagged.size} flagged
            </SheetDescription>
          </SheetHeader>

          <div className="py-4">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 max-h-[45vh] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged.has(q.id);
                const isCurrent = idx === currentIndex;

                let badgeStyle = "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300";
                if (isCurrent) {
                  badgeStyle = "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-neutral-950 dark:text-white font-bold";
                } else if (isFlagged) {
                  badgeStyle = "bg-amber-500 text-neutral-950 border-amber-500 font-bold shadow-xs";
                } else if (isAnswered) {
                  badgeStyle = "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-950 border-neutral-900 dark:border-neutral-100 font-semibold";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      handleNavigateIndex(idx);
                      setShowGridDrawer(false);
                    }}
                    className={`min-h-[44px] h-11 rounded-2xl border text-xs font-semibold flex items-center justify-center transition active:scale-90 ${badgeStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ==================== 6. SUBMIT CONFIRMATION DIALOG ==================== */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-lg text-neutral-950 dark:text-white">
              Ready to submit your CBT examination?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 space-y-2 mt-2">
              <p>
                You have answered <strong className="text-neutral-950 dark:text-white font-bold">{answeredCount}</strong> of{" "}
                <strong className="text-neutral-950 dark:text-white font-bold">{questions.length}</strong> questions.
              </p>
              {unansweredCount > 0 && (
                <p className="text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ You still have {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}.
                </p>
              )}
              {!isOnline && (
                <p className="text-amber-800 dark:text-amber-400 font-medium text-xs bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
                  ⚡ Offline Mode Active: Your answers will be graded instantly and preserved locally on this device, then synced automatically once connection is restored.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2.5">
            <AlertDialogCancel className="rounded-2xl border-neutral-300 dark:border-neutral-700 min-h-[48px] font-semibold active:scale-95">
              Continue Practising
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitExam}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-2xl min-h-[48px] px-5 active:scale-95 shadow-xs"
            >
              Yes, Submit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageUrl={zoomedImageUrl}
        isOpen={!!zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />
    </div>
  );
};

export default CBTSimulation;
