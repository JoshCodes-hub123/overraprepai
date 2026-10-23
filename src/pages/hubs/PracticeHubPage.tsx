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
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Coins,
  Flame,
  Award,
  Layers,
  Search,
  Filter,
  Download,
  Check,
  Star,
  GraduationCap,
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

  // Mode Selection: "simulation" (Strict CBT Exam) vs "practice" (Interactive Study) vs "weak" (Targeted Drill)
  const [examMode, setExamMode] = useState<"simulation" | "practice" | "weak">("simulation");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(preselectedCourseId || "");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isLaunching, setIsLaunching] = useState(false);

  // Available Quizzes & Recent Attempts
  const [quizzes, setQuizzes] = useState<UniversityQuiz[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  // Sync selectedCourseId if passed from query params or courses load
  useEffect(() => {
    if (preselectedCourseId) {
      setSelectedCourseId(preselectedCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [preselectedCourseId, courses]);

  // Load verified university quizzes for this level/department
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

  // Load student's recent CBT attempts
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
  }, [user?.id]);

  // Format institutional scope badge
  const universityShort = useMemo(() => {
    const code =
      institution ??
      (isInstitutionCode((profile as any)?.university)
        ? (profile as any).university
        : null);
    return code && INSTITUTIONS[code] ? INSTITUTIONS[code].short : (profile as any)?.university || "University";
  }, [institution, profile]);

  // Filtered quizzes for catalog
  const filteredQuizzes = useMemo(() => {
    if (courseFilter === "all") return quizzes;
    return quizzes.filter((q) => q.course?.id === courseFilter || q.course?.code === courseFilter);
  }, [quizzes, courseFilter]);

  // 1-Tap Launch Handler
  const handleLaunchExam = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a course to start CBT examination");
      return;
    }

    try {
      setIsLaunching(true);

      // Check if there is an existing quiz for this course
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

      // Query database for a quiz matching this course
      const { data: dbQuiz, error } = await supabase
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
        // Fallback: If no pre-authored quiz exists yet, redirect to general practice or course workspace
        toast.info("Loading questions for this course...");
        navigate(`/courses/${selectedCourseId}`);
      }
    } catch (err) {
      console.error("Exam launcher error:", err);
      toast.error("Failed to start CBT session. Please try again.");
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

      <div className="min-h-screen bg-background text-foreground pb-24">
        {/* =========================================================
            HEADER & ACADEMIC CONTEXT BAR
           ========================================================= */}
        <div className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-900 dark:text-amber-200 font-bold">
                <Target className="h-5 w-5 text-amber-600" />
              </span>
              <div className="min-w-0">
                <h1 className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                  CBT Examination Suite
                </h1>
                <p className="text-[11px] text-muted-foreground truncate">
                  {universityShort} · {department || "Department"} {level ? `· ${level}L` : ""}
                </p>
              </div>
            </div>

            {/* Quota Indicator */}
            <div className="flex items-center gap-2">
              <Link
                to="/student/offline"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors"
                title="Download exams for offline practice"
              >
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Offline CBT</span>
              </Link>

              <Link
                to="/pricing"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-300/80 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-bold transition-colors"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span className="tabular-nums">{balance}</span>
                <span className="hidden sm:inline text-[10px] font-normal text-muted-foreground">
                  ({dailyFreeLeft} free daily)
                </span>
              </Link>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
          {/* =========================================================
              COCKPIT: 1-TAP CBT EXAM LAUNCHER
             ========================================================= */}
          <section className="rounded-3xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs relative overflow-hidden">
            {/* Top Amber Accent Glow */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Instant Simulation Cockpit
                </span>
                <h2 className="font-display text-xl sm:text-2xl font-black text-foreground">
                  Launch CBT Mock Exam
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/60 self-start sm:self-auto">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Real University Grading Logic</span>
              </div>
            </div>

            {/* Step 1: Course Selection Pills */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>1. Select Course Target</span>
                {courses.length > 0 && (
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {courses.length} enrolled semester courses
                  </span>
                )}
              </label>

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
                          "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 border",
                          isSelected
                            ? "bg-amber-500 border-amber-600 text-slate-950 shadow-xs ring-2 ring-amber-500/30"
                            : "bg-muted/40 hover:bg-muted border-border/80 text-foreground"
                        )}
                      >
                        <span className="font-mono">{course.code}</span>
                        {course.name && (
                          <span className="font-normal opacity-85 truncate max-w-[140px] hidden sm:inline">
                            · {course.name}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-border bg-muted/20 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    No semester courses selected yet.
                  </p>
                  <Link
                    to="/onboarding/university"
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline mt-1 inline-block"
                  >
                    Select your department courses &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Step 2: Learning Mode Switcher */}
            <div className="space-y-2 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                2. Choose CBT Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExamMode("simulation")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] flex flex-col justify-between",
                    examMode === "simulation"
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-border/80 bg-muted/30 hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold">
                      <Clock className="w-4 h-4" />
                    </span>
                    {examMode === "simulation" && (
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Exam Simulation</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      Strict timed exam conditions, question palette, flag questions, and formal grade report.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("practice")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] flex flex-col justify-between",
                    examMode === "practice"
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-border/80 bg-muted/30 hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white font-bold">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    {examMode === "practice" && (
                      <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Interactive Practice</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      Instant feedback, step-by-step KaTeX math breakdowns, audio explanations, and hints.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamMode("weak")}
                  className={cn(
                    "p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] flex flex-col justify-between",
                    examMode === "weak"
                      ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs"
                      : "border-border/80 bg-muted/30 hover:bg-muted/60"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold">
                      <Zap className="w-4 h-4" />
                    </span>
                    {examMode === "weak" && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Weakness Drill</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      Specifically targets questions and topics where your readiness score is under 60%.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Exam Parameters */}
            <div className="grid grid-cols-2 gap-4 mb-7 pt-4 border-t border-border/70">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Question Count
                </label>
                <div className="flex items-center gap-1.5">
                  {[10, 20, 40].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        questionCount === count
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
                      )}
                    >
                      {count} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Timer Duration
                </label>
                <div className="flex items-center gap-1.5">
                  {[15, 30, 45].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={cn(
                        "flex-1 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        durationMinutes === mins
                          ? "bg-foreground text-background border-foreground shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-foreground border-border/80"
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
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-base flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {isLaunching
                  ? "Initializing Examination Session…"
                  : `Launch ${examMode === "simulation" ? "CBT Exam Simulation" : "Practice Mock"}`}
              </span>
            </button>
          </section>

          {/* =========================================================
              RECENT CBT ATTEMPTS & SCORE REVIEWS
             ========================================================= */}
          {recentAttempts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Recent CBT Examination Attempts</span>
                </h3>
                <Link
                  to="/progress"
                  className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
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
                      className="p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-300 transition-all shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-foreground">
                            {attempt.quiz?.course?.code || "CBT"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {new Date(attempt.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {attempt.quiz?.title || "Mock Exam"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span
                            className={cn(
                              "font-mono font-black text-sm block",
                              isPassing ? "text-emerald-600" : "text-rose-600"
                            )}
                          >
                            {pct}%
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            {attempt.score}/{attempt.total_questions}
                          </span>
                        </div>

                        <Link
                          to={`/quiz/${attempt.quiz_id}/results/${attempt.id}`}
                          className="px-2.5 py-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted text-[11px] font-bold text-foreground transition-colors"
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
                <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" />
                  <span>University CBT Question Banks</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Grounded in official semester past questions, syllabus tests, and exam formats.
                </p>
              </div>

              {/* Course Filter Dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className="bg-card border border-border rounded-xl px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-amber-400/80 transition-all shadow-xs flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200">
                          {quiz.course?.code}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{quiz.duration_minutes || 30} mins</span>
                          <span>·</span>
                          <span>{quiz.question_count || 20} Qs</span>
                        </div>
                      </div>

                      <h4 className="font-display font-bold text-sm text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                        {quiz.title}
                      </h4>
                      {quiz.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {quiz.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <button
                        type="button"
                        onClick={() => navigate(`/quiz/${quiz.id}/simulation`)}
                        className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Simulate Exam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/quiz/${quiz.id}/practice`)}
                        className="py-2 px-3 rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        title="Interactive practice with step-by-step solutions"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                        <span className="hidden sm:inline">Practice</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-3xl border border-dashed border-border bg-card/60 text-center space-y-2">
                <BookOpen className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                <h4 className="font-bold text-sm text-foreground">No quizzes currently listed</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Use the CBT Exam Launcher above to start a custom mock drill for any of your enrolled courses.
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
