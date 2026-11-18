import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Target,
  Clock,
  Zap,
  BookOpen,
  Sparkles,
  ChevronRight,
  Play,
  RotateCcw,
  Coins,
  Filter,
  Download,
  Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import useEnvironment from "@/hooks/useEnvironment";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getActiveCbtCheckpoint,
  clearActiveCbtCheckpoint,
  autoSeedEnrolledCoursesOffline,
  type ActiveCbtCheckpoint,
} from "@/lib/autoOfflineSeeder";

interface UniversityQuiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  token_cost: number;
  is_simulation: boolean;
  course: {
    id: string;
    code: string;
    name: string;
    department?: string | null;
    level?: string | null;
  };
}

interface RecentAttempt {
  id: string;
  quiz_id: string;
  score: number;
  total_questions: number;
  time_taken_seconds: number | null;
  created_at: string;
  quiz: {
    title: string;
    course: {
      code: string;
      name: string;
    };
  };
}

export const PracticeHubPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCourseId = searchParams.get("course");

  const { user, profile } = useAuth();
  const { institution } = useEnvironment();
  const { level, department } = useStudentScope();
  const { data: courses = [], isLoading: coursesLoading } = useCourseSnapshots();
  const { balance, dailyFreeLeft } = useTokenBalance();

  const [examMode, setExamMode] = useState<"simulation" | "practice" | "weak">("simulation");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preselectedCourseId || "");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isLaunching, setIsLaunching] = useState(false);

  const [quizzes, setQuizzes] = useState<UniversityQuiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [, setAttemptsLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [activeCheckpoint, setActiveCheckpoint] = useState<ActiveCbtCheckpoint | null>(() =>
    getActiveCbtCheckpoint()
  );

  useEffect(() => {
    if (courses.length > 0) {
      void autoSeedEnrolledCoursesOffline(user?.id, courses);
    }
  }, [user?.id, courses]);

  useEffect(() => {
    if (preselectedCourseId) {
      setSelectedCourseId(preselectedCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [preselectedCourseId, courses, selectedCourseId]);

  useEffect(() => {
    async function loadQuizzes() {
      try {
        setQuizzesLoading(true);
        const { data, error } = await supabase
          .from("quizzes")
          .select(`
            id,
            title,
            description,
            duration_minutes,
            question_count,
            is_premium,
            token_cost,
            is_simulation,
            course:courses!inner(id, code, name, department, level)
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setQuizzes((data as any) || []);
      } catch (err) {
        console.warn("Failed loading quizzes:", err);
      } finally {
        setQuizzesLoading(false);
      }
    }
    loadQuizzes();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    async function loadAttempts() {
      try {
        setAttemptsLoading(true);
        const { data, error } = await supabase
          .from("quiz_attempts")
          .select(`
            id,
            quiz_id,
            score,
            total_questions,
            time_taken_seconds,
            created_at,
            quiz:quizzes!inner(
              title,
              course:courses!inner(code, name)
            )
          `)
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(4);

        if (error) throw error;
        setRecentAttempts((data as any) || []);
      } catch (err) {
        console.warn("Failed loading recent attempts:", err);
      } finally {
        setAttemptsLoading(false);
      }
    }
    loadAttempts();
  }, [user]);

  const universityShort = useMemo(() => {
    const code =
      institution ??
      (isInstitutionCode((profile as any)?.university)
        ? (profile as any).university
        : null);
    return code && INSTITUTIONS[code] ? INSTITUTIONS[code].short : (profile as any)?.university || "University";
  }, [institution, profile]);

  const filteredQuizzes = useMemo(() => {
    if (courseFilter === "all") return quizzes;
    return quizzes.filter((q) => q.course?.id === courseFilter || q.course?.code === courseFilter);
  }, [quizzes, courseFilter]);

  const handleLaunchExam = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course to start CBT examination");
      return;
    }

    try {
      setIsLaunching(true);

      // If offline, launch the auto-saved offline CBT pack immediately without waiting on network
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        navigate(`/quiz/offline_${selectedCourseId}/simulation`);
        return;
      }

      const existingQuiz = quizzes.find((q) => q.course?.id === selectedCourseId);

      if (existingQuiz) {
        if (examMode === "simulation") {
          navigate(`/quiz/${existingQuiz.id}/simulation`);
        } else if (examMode === "weak") {
          navigate(`/student/weak/${selectedCourseId}`);
        } else {
          navigate(`/quiz/${existingQuiz.id}/practice`);
        }
        return;
      }

      const { data: dbQuiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("course_id", selectedCourseId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (dbQuiz?.id) {
        if (examMode === "simulation") {
          navigate(`/quiz/${dbQuiz.id}/simulation`);
        } else if (examMode === "weak") {
          navigate(`/student/weak/${selectedCourseId}`);
        } else {
          navigate(`/quiz/${dbQuiz.id}/practice`);
        }
      } else {
        // Launch built-in offline-ready CBT simulation pack for this course
        navigate(`/quiz/offline_${selectedCourseId}/simulation`);
      }
    } catch {
      // Even if network drops mid-click, launch offline CBT simulation pack seamlessly
      navigate(`/quiz/offline_${selectedCourseId}/simulation`);
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <>
      <SEO
        title="CBT Examination & Simulation Hub — OverraPrep AI"
        description="Real university past questions, timed CBT simulation, KaTeX AI breakdowns, and instant feedback."
      />

      <div className="min-h-screen bg-[#FAF8F5] dark:bg-background text-[#18181B] dark:text-foreground pb-24">
        {/* =========================================================
            HEADER & ACADEMIC CONTEXT BAR
           ========================================================= */}
        <header className="border-b border-[#E8E2D6] dark:border-border bg-white/90 dark:bg-card/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#18181B] text-[#F5D77F] font-bold shadow-2xs">
                <Target className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-sm sm:text-base font-extrabold text-[#18181B] dark:text-foreground truncate">
                  CBT Examination Hall
                </h1>
                <p className="text-[11px] font-medium text-[#71717A] dark:text-muted-foreground truncate">
                  <span className="font-mono font-bold text-[#18181B] dark:text-foreground">
                    {universityShort}
                  </span>{" "}
                  · {department || "Department"} {level ? `· ${level}L` : ""}
                </p>
              </div>
            </div>

            {/* Quota & Offline Indicator */}
            <div className="flex items-center gap-2">
              <Link
                to="/student/offline"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E2D6] dark:border-border bg-[#FAF8F5] dark:bg-card hover:border-[#D4AF37] text-xs font-bold text-[#18181B] dark:text-foreground transition-colors"
                title="Download exams for offline practice"
              >
                <Download className="w-3.5 h-3.5 text-[#996515]" />
                <span>Offline CBT</span>
              </Link>

              <Link
                to="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#FAF0D6]/70 dark:bg-amber-500/10 hover:bg-[#FAF0D6] text-[#18181B] dark:text-amber-200 text-xs font-bold transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-[#996515]" />
                <span className="font-mono tabular-nums">{balance}</span>
                <span className="hidden sm:inline text-[10px] font-medium text-[#71717A]">
                  ({dailyFreeLeft} free)
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-7">
          {activeCheckpoint && (
            <section className="rounded-2xl border border-[#D4AF37] bg-[#18181B] text-[#FAF8F5] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                  Unfinished CBT Exam Saved on This Device
                </span>
                <p className="text-xs sm:text-sm font-bold text-[#FAF8F5]">
                  {activeCheckpoint.courseCode} · {activeCheckpoint.title}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-[#A1A1AA]">
                  {activeCheckpoint.answeredCount}/{activeCheckpoint.totalQuestions} answered ·{" "}
                  {Math.max(1, Math.round(activeCheckpoint.timeLeftSeconds / 60))} mins remaining
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate(`/quiz/${activeCheckpoint.quizId}/simulation`)}
                  className="min-h-[40px] px-4 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Exam</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearActiveCbtCheckpoint(activeCheckpoint.quizId);
                    setActiveCheckpoint(null);
                  }}
                  className="min-h-[40px] px-3 rounded-xl border border-[#3F3F46] text-[#A1A1AA] hover:text-[#FAF8F5] text-xs font-semibold cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </section>
          )}

          {/* =========================================================
              COCKPIT: 1-TAP CBT EXAM LAUNCHER
             ========================================================= */}
          <section className="rounded-3xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card p-5 sm:p-7 shadow-[0_14px_34px_-12px_rgba(24,24,27,0.06)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E8E2D6] dark:border-border/60">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#996515] dark:text-amber-400">
                  1-Tap Exam Launchpad
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#18181B] dark:text-foreground tracking-tight">
                  Configure &amp; Start CBT Session
                </h2>
              </div>

              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52525B] dark:text-muted-foreground bg-[#FAF8F5] dark:bg-muted/60 px-3 py-1.5 rounded-xl border border-[#E8E2D6] dark:border-border self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-[#996515]" />
                <span>Official Campus Grading</span>
              </div>
            </div>

            {/* Step 1: Course Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-[#52525B] dark:text-muted-foreground">
                  1. Select Course
                </label>
                {courses.length > 0 && (
                  <span className="font-mono text-[11px] text-[#71717A] tabular-nums">
                    {courses.length} enrolled courses
                  </span>
                )}
              </div>

              {coursesLoading ? (
                <div className="flex gap-2 overflow-x-auto py-1">
                  <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
                  <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
                  <div className="h-10 w-28 rounded-xl bg-muted animate-pulse" />
                </div>
              ) : courses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {courses.map((course) => {
                    const isSelected = selectedCourseId === course.id;
                    return (
                      <button
                        key={course.id}
                        type="button"
                        onClick={() => setSelectedCourseId(course.id)}
                        className={cn(
                          "min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 border-2 cursor-pointer",
                          isSelected
                            ? "bg-[#18181B] border-[#18181B] text-[#F5D77F] shadow-xs"
                            : "bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] border-[#E8E2D6] dark:border-border text-[#18181B] dark:text-foreground"
                        )}
                      >
                        <span className="font-mono font-extrabold">{course.code}</span>
                        {course.name && (
                          <span className="font-medium opacity-80 truncate max-w-[140px] hidden sm:inline">
                            · {course.name}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-[#E8E2D6] bg-[#FAF8F5] text-center">
                  <p className="text-xs font-medium text-[#71717A]">
                    No semester courses enrolled yet.
                  </p>
                  <Link
                    to="/onboarding/university"
                    className="text-xs font-bold text-[#996515] hover:underline mt-1 inline-block"
                  >
                    Pick your university &amp; level &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Step 2: Learning Mode Switcher */}
            <div className="space-y-2.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-[#52525B] dark:text-muted-foreground block">
                2. Choose Examination Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExamMode("simulation")}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex flex-col justify-between cursor-pointer",
                    examMode === "simulation"
                      ? "border-[#18181B] bg-[#FAF8F5] dark:bg-amber-500/10 shadow-xs"
                      : "border-[#E8E2D6] dark:border-border bg-white dark:bg-muted/20 hover:border-[#D4AF37]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#18181B] text-[#F5D77F] font-bold">
                      <Clock className="w-4 h-4" />
                    </span>
                    {examMode === "simulation" && (
                      <span className="text-[10px] font-extrabold text-[#996515] uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#18181B] dark:text-foreground">
                      Exam Simulation
                    </h3>
                    <p className="text-[11px] text-[#71717A] dark:text-muted-foreground leading-snug mt-0.5">
                      Strict timed hall conditions, question palette, and instant score breakdown.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("practice")}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex flex-col justify-between cursor-pointer",
                    examMode === "practice"
                      ? "border-[#18181B] bg-[#FAF8F5] dark:bg-amber-500/10 shadow-xs"
                      : "border-[#E8E2D6] dark:border-border bg-white dark:bg-muted/20 hover:border-[#D4AF37]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF0D6] text-[#996515] font-bold">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    {examMode === "practice" && (
                      <span className="text-[10px] font-extrabold text-[#996515] uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#18181B] dark:text-foreground">
                      Interactive Study
                    </h3>
                    <p className="text-[11px] text-[#71717A] dark:text-muted-foreground leading-snug mt-0.5">
                      Step-by-step KaTeX derivations and instant explanation after each question.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("weak")}
                  className={cn(
                    "p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex flex-col justify-between cursor-pointer",
                    examMode === "weak"
                      ? "border-[#18181B] bg-[#FAF8F5] dark:bg-amber-500/10 shadow-xs"
                      : "border-[#E8E2D6] dark:border-border bg-white dark:bg-muted/20 hover:border-[#D4AF37]"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 font-bold">
                      <Zap className="w-4 h-4" />
                    </span>
                    {examMode === "weak" && (
                      <span className="text-[10px] font-extrabold text-emerald-700 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#18181B] dark:text-foreground">
                      Weakness Drill
                    </h3>
                    <p className="text-[11px] text-[#71717A] dark:text-muted-foreground leading-snug mt-0.5">
                      Targets topics where your accuracy is below 60% to close knowledge gaps.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Exam Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E8E2D6] dark:border-border/70">
              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#52525B] dark:text-muted-foreground block mb-1.5">
                  Question Count
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 20, 35, 50].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={cn(
                        "h-10 rounded-xl font-mono text-xs font-bold tabular-nums transition-all border cursor-pointer",
                        questionCount === count
                          ? "bg-[#18181B] text-[#F5D77F] border-[#18181B] shadow-2xs"
                          : "bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-[#18181B] dark:text-foreground border-[#E8E2D6]"
                      )}
                    >
                      {count} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#52525B] dark:text-muted-foreground block mb-1.5">
                  Timer Duration
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={cn(
                        "h-10 rounded-xl font-mono text-xs font-bold tabular-nums transition-all border cursor-pointer",
                        durationMinutes === mins
                          ? "bg-[#18181B] text-[#F5D77F] border-[#18181B] shadow-2xs"
                          : "bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-[#18181B] dark:text-foreground border-[#E8E2D6]"
                      )}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Launch Action Button */}
            <button
              type="button"
              onClick={handleLaunchExam}
              disabled={isLaunching || !selectedCourseId}
              className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#DFBE57] to-[#C5A059] hover:from-[#C5A059] hover:to-[#B8860B] disabled:opacity-50 text-[#18181B] font-display font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_20px_-4px_rgba(212,175,55,0.35)] active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {isLaunching
                  ? "Initializing Examination Session…"
                  : `Start ${examMode === "simulation" ? "CBT Exam Simulation" : "Practice Session"} (${questionCount} Qs · ${durationMinutes}m)`}
              </span>
            </button>
          </section>

          {/* =========================================================
              RECENT CBT ATTEMPTS & SCORE REVIEWS
             ========================================================= */}
          {recentAttempts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-[#18181B] dark:text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#996515]" />
                  <span>Recent CBT Attempts</span>
                </h3>
                <Link
                  to="/progress"
                  className="text-xs font-bold text-[#996515] hover:underline flex items-center gap-1"
                >
                  <span>Full Analytics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentAttempts.map((attempt) => {
                  const pct = Math.round((attempt.score / (attempt.total_questions || 1)) * 100);
                  const isPassing = pct >= 60;
                  return (
                    <div
                      key={attempt.id}
                      className="p-4 rounded-2xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card hover:border-[#D4AF37] transition-all shadow-2xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs text-[#18181B] dark:text-foreground">
                            {attempt.quiz?.course?.code || "CBT"}
                          </span>
                          <span className="font-mono text-[10px] text-[#71717A] tabular-nums">
                            {new Date(attempt.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-[#71717A] truncate mt-0.5">
                          {attempt.quiz?.title || "Mock Exam"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <span
                            className={cn(
                              "font-extrabold text-sm block",
                              isPassing ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {pct}%
                          </span>
                          <span className="text-[10px] text-[#71717A] block">
                            {attempt.score}/{attempt.total_questions}
                          </span>
                        </div>

                        <Link
                          to={`/quiz/${attempt.quiz_id}/results/${attempt.id}`}
                          className="px-3 py-1.5 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-xs font-bold text-[#18181B] transition-colors"
                        >
                          Review
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* =========================================================
              VERIFIED UNIVERSITY CBT QUESTION PAPERS CATALOG
             ========================================================= */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="font-display font-extrabold text-sm sm:text-base text-[#18181B] dark:text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#996515]" />
                  <span>Verified University Past Question Banks</span>
                </h3>
                <p className="text-xs text-[#71717A]">
                  Official semester past papers and timed CBT simulations.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Filter className="w-3.5 h-3.5 text-[#71717A]" />
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="bg-white dark:bg-card border border-[#E8E2D6] dark:border-border rounded-xl px-3 py-1.5 text-xs font-bold text-[#18181B] dark:text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                >
                  <option value="all">All Enrolled Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {quizzesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredQuizzes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-4 rounded-2xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card hover:border-[#D4AF37] transition-all shadow-2xs flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-[#18181B] text-[#F5D77F]">
                          {quiz.course?.code}
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#71717A] tabular-nums">
                          <Clock className="w-3 h-3 text-[#996515]" />
                          <span>{quiz.duration_minutes || 30}m</span>
                          <span>·</span>
                          <span>{quiz.question_count || 20} Qs</span>
                        </div>
                      </div>

                      <h4 className="font-display font-bold text-sm text-[#18181B] dark:text-foreground group-hover:text-[#996515] transition-colors line-clamp-1">
                        {quiz.title}
                      </h4>
                      {quiz.description && (
                        <p className="text-xs text-[#71717A] line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-[#E8E2D6]/70 dark:border-border/50">
                      <button
                        type="button"
                        onClick={() => navigate(`/quiz/${quiz.id}/simulation`)}
                        className="flex-1 min-h-[38px] rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:brightness-105 active:scale-98 text-[#18181B] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Simulate Exam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/quiz/${quiz.id}/practice`)}
                        className="min-h-[38px] px-3 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Interactive practice with step-by-step solutions"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#996515]" />
                        <span>Study</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-[#E8E2D6] bg-white text-center space-y-2">
                <BookOpen className="w-8 h-8 text-[#996515]/50 mx-auto" />
                <h4 className="font-display font-bold text-sm text-[#18181B]">
                  No pre-packaged papers in this filter
                </h4>
                <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                  Use the 1-Tap Exam Launchpad above to start a custom CBT drill for any enrolled course.
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
};

export default PracticeHubPage;
