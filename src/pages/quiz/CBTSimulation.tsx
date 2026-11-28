import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBookmarkedQuestions } from "@/hooks/useBookmarkedQuestions";
import { useOfflineAttemptSync } from "@/hooks/useOfflineAttemptSync";
import { queuePendingAttempt } from "@/lib/offlineQuizStore";
import {
  buildOfflineQuizBundle,
  saveActiveCbtCheckpoint,
  clearActiveCbtCheckpoint,
} from "@/lib/autoOfflineSeeder";
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
  course_id?: string;
  course: {
    id?: string;
    code: string;
    name: string;
  };
}

const isUuid = (val?: string | null) =>
  !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

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

    // 2. Fetch or verify with Server Store & Supabase (if online and not an explicit offline pack)
    const fetchQuizData = async () => {
      try {
        if (quizId.startsWith("offline_") || !navigator.onLine) {
          if (!hasRestoredFromCache) {
            const offlineBundle = buildOfflineQuizBundle(quizId);
            if (!isMounted) return;
            setQuiz(offlineBundle.quiz);
            setQuestions(offlineBundle.questions);
            const fallbackAttemptId = `local_attempt_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`;
            setAttemptId(fallbackAttemptId);
            const totalSec = (offlineBundle.quiz.duration_minutes || 25) * 60;
            const endsAt = Date.now() + totalSec * 1000;
            endsAtRef.current = endsAt;
            setTimeLeft(totalSec);
          }
          return;
        }

        // First check Server Quiz Store (/api/quizzes/:quizId) for bulk-uploaded or split quizzes
        let serverQuizFound: any = null;
        try {
          const srvRes = await fetch(`/api/quizzes/${encodeURIComponent(quizId)}`);
          if (srvRes.ok) {
            const srvJson = await srvRes.json();
            if (srvJson.ok && srvJson.quiz) {
              serverQuizFound = srvJson.quiz;
            }
          }
        } catch {
          // ignore
        }

        let formattedQuiz: QuizData | null = null;
        let formattedQuestions: Question[] = [];

        if (serverQuizFound && Array.isArray(serverQuizFound.questions) && serverQuizFound.questions.length > 0) {
          formattedQuiz = {
            id: serverQuizFound.id,
            title: serverQuizFound.title,
            duration_minutes: Number(serverQuizFound.duration_minutes) || 25,
            course_id: serverQuizFound.course_id || "",
            course: {
              id: serverQuizFound.course_id || "",
              code: serverQuizFound.course_code || "COURSE",
              name: serverQuizFound.course_name || "University Course",
            },
          };
          formattedQuestions = serverQuizFound.questions.map((q: any, idx: number) => ({
            id: q.id || `q_${quizId}_${idx + 1}`,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option || "A",
            explanation: q.explanation || null,
            image_url: q.image_url || null,
          }));
        } else if (isUuid(quizId)) {
          const { data: quizData, error: quizError } = await supabase
            .from("quizzes")
            .select("*, courses(id, code, name)")
            .eq("id", quizId)
            .single();

          if (quizError) {
            if (hasRestoredFromCache) return;
            throw quizError;
          }

          formattedQuiz = {
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

          formattedQuestions = questionsData
            .map((qq: any) => qq.questions)
            .filter(Boolean);

          // If a database quiz has 0 linked question rows yet, synthesize from the course's offline study pack
          if (formattedQuestions.length === 0) {
            const fallbackBundle = buildOfflineQuizBundle(
              quizId,
              formattedQuiz.course?.code,
              formattedQuiz.course?.name
            );
            formattedQuestions = fallbackBundle.questions;
          }
        } else {
          const fallbackBundle = buildOfflineQuizBundle(quizId);
          formattedQuiz = fallbackBundle.quiz;
          formattedQuestions = fallbackBundle.questions;
        }

        if (!isMounted || !formattedQuiz) return;

        setQuiz(formattedQuiz);
        setQuestions(formattedQuestions);

        // Save entire quiz bundle into local cache
        try {
          localStorage.setItem(
            cacheKeyQuiz,
            JSON.stringify({
              quiz: formattedQuiz,
              questions: formattedQuestions,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // localStorage full or disabled
        }

        // Initialize or resume attempt
        const existingSessionRaw = localStorage.getItem(cacheKeySession);
        let currentAttemptId = existingSessionRaw ? JSON.parse(existingSessionRaw).attemptId : null;
        let existingEndsAt = existingSessionRaw ? JSON.parse(existingSessionRaw).endsAt : null;

        if (!currentAttemptId && navigator.onLine && isUuid(quizId)) {
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
      } catch {
        if (!hasRestoredFromCache) {
          // Never fail when network drops — synthesize offline pack immediately
          const fallbackBundle = buildOfflineQuizBundle(quizId);
          if (isMounted) {
            setQuiz(fallbackBundle.quiz);
            setQuestions(fallbackBundle.questions);
            const fallbackAttemptId = `local_attempt_${Date.now()}_${Math.random()
              .toString(36)
              .slice(2, 8)}`;
            setAttemptId(fallbackAttemptId);
            const totalSec = (fallbackBundle.quiz.duration_minutes || 25) * 60;
            const endsAt = Date.now() + totalSec * 1000;
            endsAtRef.current = endsAt;
            setTimeLeft(totalSec);
          }
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
        saveActiveCbtCheckpoint({
          quizId,
          courseCode: quiz?.course?.code || "CBT",
          title: quiz?.title || "CBT Examination",
          answeredCount: Object.keys(newAnswers).length,
          totalQuestions: questions.length || 15,
          timeLeftSeconds: newTimeLeft,
          updatedAt: Date.now(),
        });
      } catch (e) {
        console.warn("Failed saving CBT session to localStorage:", e);
      }
    },
    [quizId, attemptId, quiz, questions.length]
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
    clearActiveCbtCheckpoint(quizId);

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

    // Try online submission if connected and both attemptId and quizId are Supabase UUIDs
    if (navigator.onLine && user && isUuid(safeAttemptId) && isUuid(quizId)) {
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

    // Fallback: Queue attempt in offline store for background sync if it is a Supabase UUID quiz
    if (user && !navigator.onLine && isUuid(quizId)) {
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

    if (!navigator.onLine) {
      toast({
        title: "Offline Mode — Exam Saved Locally",
        description: `Your score of ${score}% (${correctCount}/${questions.length}) is safely stored on this device. It will automatically sync when you are back online.`,
      });
      navigate(`/quiz/${quizId}/results/${safeAttemptId}?offline=true`);
    } else {
      navigate(`/quiz/${quizId}/results/${safeAttemptId}`);
    }
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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-9 h-9 animate-spin text-primary mb-4" />
        <p className="font-display font-bold text-base text-foreground">
          Preparing CBT Examination Engine…
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Loading verified university questions and initializing local offline storage cache.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-28 selection:bg-primary selection:text-primary-foreground">
      {/* ==================== 1. NETWORK STATUS BANNER ==================== */}
      {!isOnline && (
        <div className="bg-primary border-b border-primary/80 px-4 py-2 text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-40 select-none animate-in fade-in slide-in-from-top-1">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Offline Mode — All answers and timer continuously preserved locally.</span>
        </div>
      )}

      {showReconnectedBanner && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-40 select-none animate-in fade-in slide-in-from-top-1">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Back Online — Connection restored. Background synchronization active.</span>
        </div>
      )}

      {/* ==================== 2. LEAN STICKY EXAM HEADER (56px) ==================== */}
      <header className="sticky top-0 z-30 h-14 bg-background/95 backdrop-blur-xl border-b border-border px-4 sm:px-6 flex items-center">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate">
                {quiz?.course.code}
              </span>
              <span className="text-xs text-muted-foreground hidden md:inline truncate">
                · {quiz?.title}
              </span>
            </div>
            <p className="text-[11px] font-mono tabular-nums font-semibold text-muted-foreground leading-none mt-0.5">
              Question {currentIndex + 1} / {questions.length}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* High-Contrast Toggle Button */}
            <Button
              size="sm"
              variant={highContrast ? "secondary" : "outline"}
              onClick={toggleHighContrast}
              className={`h-9 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap ${
                highContrast
                  ? "bg-foreground text-background font-bold border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle high-contrast choices for sunlight and OLED readability"
            >
              <SunMedium className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Contrast</span>
            </Button>

            {/* Continuous Timer Display (Tabular Mono) */}
            <div
              className={`flex items-center gap-1.5 px-3 h-9 rounded-xl font-mono tabular-nums text-sm sm:text-base font-extrabold transition-colors select-none ${
                isLowTime
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 animate-pulse"
                  : "bg-secondary text-foreground border border-border"
              }`}
              aria-label={`Time remaining: ${formatTime(timeLeft)}`}
            >
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Question Navigator Drawer Trigger (Mobile & Tablet only; Desktop uses persistent panel) */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGridDrawer(true)}
              className="lg:hidden h-9 px-3 rounded-xl border-border font-semibold text-xs flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            >
              <LayoutGrid className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Questions</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ==================== 3. ADAPTIVE EXAM WORKSPACE (1-col Mobile -> 8+4 Desktop Console) ==================== */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 8-COL: FOCUSED QUESTION SURFACE */}
          <div className="lg:col-span-8 min-w-0">
            <div
              className={`bg-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 transition-all ${
                highContrast
                  ? "border-2 border-foreground"
                  : "border border-border"
              }`}
            >
              {/* Top question toolbar */}
              <div className="flex items-center justify-between gap-3 pb-3.5 mb-5 border-b border-border/80">
                <span
                  className={`font-mono tabular-nums text-xs uppercase tracking-wider font-extrabold ${
                    highContrast ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Question {currentIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-2">
                  {/* Bookmark */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleBookmark(currentQuestion.id)}
                    className="h-10 w-10 p-0 rounded-xl text-muted-foreground hover:text-foreground active:scale-95"
                    title="Bookmark for review"
                    aria-label="Bookmark question"
                  >
                    {isBookmarked(currentQuestion.id) ? (
                      <BookmarkCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Flag for Review */}
                  <Button
                    variant={flagged.has(currentQuestion.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap ${
                      flagged.has(currentQuestion.id)
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" />
                    <span>{flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}</span>
                  </Button>
                </div>
              </div>

              {/* Question Prompt */}
              <div
                className={`font-display leading-relaxed mb-6 ${
                  highContrast
                    ? "text-lg sm:text-xl font-bold text-foreground"
                    : "text-base sm:text-lg font-semibold text-foreground"
                }`}
              >
                <MathMarkdown content={currentQuestion.question_text} />
              </div>

              {/* Optional Question Image */}
              <ClickableQuestionImage
                imageUrl={currentQuestion.image_url}
                onImageClick={() => setZoomedImageUrl(currentQuestion.image_url)}
                className="max-h-64 mb-6 rounded-2xl border border-border"
              />

              {/* High-Contrast Responsive Answer Options */}
              <div className="space-y-3" role="radiogroup" aria-label="Answer choices">
                {options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.key;

                  let choiceStyle = "";
                  let badgeStyle = "";

                  if (highContrast) {
                    if (isSelected) {
                      choiceStyle =
                        "border-2 border-primary bg-primary/15 text-foreground ring-2 ring-primary/40";
                      badgeStyle = "bg-primary text-primary-foreground font-extrabold";
                    } else {
                      choiceStyle =
                        "border-2 border-foreground/80 bg-card text-foreground hover:bg-secondary";
                      badgeStyle =
                        "border-2 border-foreground/80 bg-secondary text-foreground font-bold";
                    }
                  } else {
                    if (isSelected) {
                      choiceStyle =
                        "border-2 border-primary bg-primary/10 text-foreground";
                      badgeStyle = "bg-primary text-primary-foreground font-extrabold";
                    } else {
                      choiceStyle =
                        "border border-border bg-card hover:border-foreground/30 hover:bg-secondary/40 text-foreground";
                      badgeStyle = "bg-secondary text-muted-foreground font-bold";
                    }
                  }

                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectAnswer(currentQuestion.id, option.key)}
                      className={`w-full min-h-[56px] text-left p-4 rounded-2xl transition-all flex items-start gap-3.5 active:scale-[0.99] select-none cursor-pointer ${choiceStyle}`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono shrink-0 transition-colors ${badgeStyle}`}
                      >
                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : option.key}
                      </span>
                      <div
                        className={`leading-relaxed pt-0.5 flex-1 min-w-0 ${
                          highContrast ? "text-base font-semibold" : "text-sm sm:text-[15px] font-medium"
                        }`}
                      >
                        <MathMarkdown content={option.text} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 4-COL: PERSISTENT DESKTOP QUESTION NAVIGATOR & EXAM SUMMARY */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20">
            <div className="bg-card border border-border rounded-3xl p-5 space-y-5">
              <div className="pb-3.5 border-b border-border/80">
                <h2 className="font-display font-bold text-base text-foreground">
                  Question Navigator
                </h2>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="rounded-xl bg-secondary/70 border border-border/70 px-2.5 py-2 text-center">
                    <p className="font-mono tabular-nums text-base font-extrabold text-foreground">
                      {answeredCount}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Answered
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/70 border border-border/70 px-2.5 py-2 text-center">
                    <p className="font-mono tabular-nums text-base font-extrabold text-foreground">
                      {unansweredCount}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Left
                    </p>
                  </div>
                  <div className="rounded-xl bg-secondary/70 border border-border/70 px-2.5 py-2 text-center">
                    <p className="font-mono tabular-nums text-base font-extrabold text-primary">
                      {flagged.size}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Flagged
                    </p>
                  </div>
                </div>
              </div>

              {/* Numbered Question Grid */}
              <div className="grid grid-cols-5 gap-2 max-h-[38vh] overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isFlagged = flagged.has(q.id);
                  const isCurrent = idx === currentIndex;

                  let badgeStyle =
                    "bg-background border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground";
                  if (isCurrent) {
                    badgeStyle =
                      "ring-2 ring-primary bg-primary/15 border-primary text-foreground font-extrabold";
                  } else if (isFlagged) {
                    badgeStyle =
                      "bg-primary text-primary-foreground border-primary font-extrabold";
                  } else if (isAnswered) {
                    badgeStyle =
                      "bg-foreground text-background border-foreground font-bold";
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigateIndex(idx)}
                      className={`min-h-[40px] h-10 rounded-xl border text-xs font-mono tabular-nums flex items-center justify-center transition active:scale-95 cursor-pointer ${badgeStyle}`}
                      aria-label={`Question ${idx + 1}${isAnswered ? ", answered" : ""}${isFlagged ? ", flagged" : ""}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Explicit Legend (Never Hue-Only) */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/80 text-[11px] text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border-2 border-primary bg-primary/15 shrink-0" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-foreground shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-primary shrink-0" />
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded border border-border bg-background shrink-0" />
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Direct Submit CTA */}
              <Button
                onClick={() => setShowSubmitConfirm(true)}
                disabled={isSubmitting}
                className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm active:scale-[0.98] cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <span>Submit Exam</span>
                )}
              </Button>
            </div>
          </aside>
        </div>
      </main>

      {/* ==================== 4. FIXED BOTTOM THUMB-ZONE CONTROL BAR ==================== */}
      <footer
        className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border px-4 sm:px-6 pt-2.5"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5">
          {/* Previous Button (strictly min-h-[48px]) */}
          <Button
            variant="outline"
            onClick={() => handleNavigateIndex(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="rounded-2xl border-border font-bold text-xs sm:text-sm min-h-[48px] h-12 px-4 sm:px-5 active:scale-95 disabled:opacity-40 whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4 mr-1 shrink-0" />
            <span>Prev</span>
          </Button>

          <div className="text-center hidden sm:block">
            <span className="text-xs font-mono tabular-nums font-bold text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Next Button (strictly min-h-[48px]) */}
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => handleNavigateIndex(currentIndex + 1)}
                className="bg-foreground hover:bg-foreground/90 text-background font-bold text-xs sm:text-sm min-h-[48px] h-12 px-5 rounded-2xl flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Button>
            ) : null}

            {/* Submit Exam Button (strictly min-h-[48px]) */}
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm min-h-[48px] h-12 px-5 sm:px-6 rounded-2xl active:scale-95 whitespace-nowrap"
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

      {/* ==================== 5. QUESTION GRID OVERVIEW DRAWER (MOBILE & TABLET) ==================== */}
      <Sheet open={showGridDrawer} onOpenChange={setShowGridDrawer}>
        <SheetContent side="bottom" className="max-h-[82vh] h-auto rounded-t-3xl bg-card border-t border-border p-5 sm:p-7">
          <SheetHeader className="text-left pb-3 border-b border-border/80">
            <SheetTitle className="font-display font-bold text-lg text-foreground">
              Question Navigator
            </SheetTitle>
            <SheetDescription className="font-mono tabular-nums text-xs text-muted-foreground">
              {answeredCount} answered · {unansweredCount} remaining · {flagged.size} flagged
            </SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2.5 max-h-[45vh] overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isFlagged = flagged.has(q.id);
                const isCurrent = idx === currentIndex;

                let badgeStyle = "bg-background border-border text-muted-foreground";
                if (isCurrent) {
                  badgeStyle =
                    "ring-2 ring-primary bg-primary/15 border-primary text-foreground font-extrabold";
                } else if (isFlagged) {
                  badgeStyle =
                    "bg-primary text-primary-foreground border-primary font-extrabold";
                } else if (isAnswered) {
                  badgeStyle =
                    "bg-foreground text-background border-foreground font-bold";
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      handleNavigateIndex(idx);
                      setShowGridDrawer(false);
                    }}
                    className={`min-h-[44px] h-11 rounded-2xl border text-xs font-mono tabular-nums flex items-center justify-center transition active:scale-90 ${badgeStyle}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-border/80 text-[11px] text-muted-foreground font-medium">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-primary bg-primary/15" /> Current
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-foreground" /> Answered
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary" /> Flagged
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-border bg-background" /> Unanswered
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ==================== 6. SUBMIT CONFIRMATION DIALOG ==================== */}
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent className="rounded-3xl max-w-md p-6 bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-lg text-foreground">
              Ready to submit your CBT examination?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground space-y-2 mt-2">
              <span className="block">
                You have answered <strong className="font-mono tabular-nums text-foreground font-bold">{answeredCount}</strong> of{" "}
                <strong className="font-mono tabular-nums text-foreground font-bold">{questions.length}</strong> questions.
              </span>
              {unansweredCount > 0 && (
                <span className="block text-rose-600 dark:text-rose-400 font-semibold">
                  You still have {unansweredCount} unanswered question{unansweredCount === 1 ? "" : "s"}.
                </span>
              )}
              {!isOnline && (
                <span className="block text-amber-800 dark:text-amber-300 font-medium text-xs bg-primary/10 p-2.5 rounded-xl border border-primary/30">
                  Offline Mode Active: Your answers will be graded instantly and preserved locally on this device, then synced automatically once connection is restored.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 gap-2.5">
            <AlertDialogCancel className="rounded-2xl border-border min-h-[48px] font-semibold active:scale-95">
              Continue Practising
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitExam}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl min-h-[48px] px-5 active:scale-95"
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
