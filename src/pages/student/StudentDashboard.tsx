import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Flame,
  Coins,
  Target,
  Zap,
  SlidersHorizontal,
  Search,
  BellRing,
  Play,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";

import { Screen, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import CourseRow, { EmptyCourses, CourseRowSkeleton } from "@/components/dashboard/mobile/CourseRow";
import MissionBlock from "@/components/dashboard/mobile/MissionBlock";
import WeeklyPulse from "@/components/dashboard/mobile/WeeklyPulse";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useEnrolledCoursesProgress } from "@/hooks/useCourseLearning";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTodayMission, useWeeklyReport, useReadinessAll } from "@/hooks/useIntelligence";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useStudyStreak } from "@/hooks/useLearningProgress";
import { DailyCheckIn } from "@/components/student/dashboard/DailyCheckIn";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { DashboardPreferencesDialog } from "@/components/student/dashboard/DashboardPreferencesMenu";
import { useStudyAnalytics } from "@/hooks/useStudyAnalytics";
import { StudyActivityHeatmap } from "@/components/student/analytics/StudyActivityHeatmap";
import useEnvironment from "@/hooks/useEnvironment";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";
import { courseActionLabel as courseAction } from "@/lib/nextStep";
import { ExamReadinessRings } from "@/components/ux/ExamReadinessRings";
import { StudyPulseOrb } from "@/components/ux/StudyPulseOrb";
import OfflineStudyHub from "@/components/offline/OfflineStudyHub";
import { SmartStudyReminderCard } from "@/components/notifications/SmartStudyReminderCard";

if (typeof window !== "undefined") prefetchDashboardNeighbors();

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return { text: "Good morning", icon: "🌤️" };
  if (h < 17) return { text: "Good afternoon", icon: "☀️" };
  return { text: "Good evening", icon: "🌙" };
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);
  const { preferences } = useDashboardPreferences();
  const { dailyMap, full90DaySeries, summary: analyticsSummary, logStudySession } =
    useStudyAnalytics("14d");

  // Clean workspace tabs preventing vertical clutter on mobile
  const [activeInsightTab, setActiveInsightTab] = useState<
    "target" | "reminders" | "weekly" | "heatmap" | "offline"
  >("target");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const [, setRefreshKey] = useState(0);
  const onRefresh = async () => {
    setRefreshKey((k) => k + 1);
    await new Promise((r) => setTimeout(r, 350));
  };

  const { institution } = useEnvironment();
  const { level, department } = useStudentScope();
  const { data: courses = [], isLoading: coursesLoading } = useCourseSnapshots();
  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);
  const { data: progressMap = {} } = useEnrolledCoursesProgress(courseIds);
  const { data: mission } = useTodayMission();
  const { data: weekly } = useWeeklyReport();
  const { data: readiness = [] } = useReadinessAll();
  const { balance, dailyFreeLeft } = useTokenBalance();
  const { data: streakData } = useStudyStreak();

  const weakTopicByCourse = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of readiness) {
      const topic = r.weak_topics?.[0]?.topic;
      if (r.course_id && topic) map[r.course_id] = topic;
    }
    return map;
  }, [readiness]);

  const readinessByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of readiness) {
      if (r.course_id && typeof r.readiness === "number") {
        map[r.course_id] = Math.round(r.readiness);
      }
    }
    return map;
  }, [readiness]);

  const identityParts = useMemo(() => {
    const code =
      institution ??
      (isInstitutionCode((profile as any)?.university)
        ? (profile as any).university
        : null);
    const uniLabel =
      code && INSTITUTIONS[code]
        ? INSTITUTIONS[code].short
        : (profile as any)?.university || "University";
    const deptLabel = department || (profile as any)?.department;
    const rawLvl = level || (profile as any)?.level;
    const lvlLabel = rawLvl
      ? /l$/i.test(String(rawLvl))
        ? String(rawLvl)
        : `${rawLvl}L`
      : null;

    return [uniLabel, deptLabel, lvlLabel].filter(Boolean) as string[];
  }, [institution, profile, department, level]);

  const firstName = profile?.full_name?.split(" ")[0];
  const greeting = greetingFor();

  const recent = useMemo(
    () =>
      [...courses].sort((a, b) => {
        const ta = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
        const tb = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
        return tb - ta;
      }),
    [courses]
  );
  const current = recent[0];

  const missionTasks = useMemo(
    () => (mission?.tasks ?? []).map((t) => ({ label: t.label, done: t.done, link: t.link })),
    [mission]
  );

  const threeDailyTargets = useMemo(() => {
    const courseCode = current?.code || "Primary Course";
    const courseId = current?.id || "";

    const standardTargets = [
      {
        label: `Complete 1 CBT practice set in ${courseCode}`,
        done: false,
        link: courseId ? `/practice?course=${courseId}` : "/practice",
      },
      {
        label: `Review key lecture notes & formulas for ${courseCode}`,
        done: false,
        link: courseId ? `/courses/${courseId}?tab=materials` : "/courses",
      },
      {
        label: "Drill 5 weak-area questions to boost exam readiness",
        done: false,
        link: "/student/mastery",
      },
    ];

    if (missionTasks.length >= 3) {
      return missionTasks;
    }
    if (missionTasks.length > 0) {
      return [...missionTasks, ...standardTargets.slice(missionTasks.length)];
    }
    return standardTargets;
  }, [current, missionTasks]);

  const completedMissions = threeDailyTargets.filter((t) => t.done).length;
  const currentStreak = streakData?.current ?? mission?.streak ?? 1;

  const avgReadiness = useMemo(() => {
    if (readiness.length === 0) return 78;
    const sum = readiness.reduce((acc, curr) => acc + (curr.readiness || 0), 0);
    return Math.round(sum / readiness.length);
  }, [readiness]);

  return (
    <>
      <SEO
        title="Student Dashboard — OverraPrep AI"
        description="Your calm, distraction-free academic workspace."
        noindex
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <DashboardPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />

      <div className="min-h-screen bg-[#FAF8F5] dark:bg-background text-[#18181B] dark:text-foreground">
        <PullToRefresh onRefresh={onRefresh}>
          <Screen className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
            <BrandTopBar />

            <DashboardOfflineBanner onReattempt={onRefresh} />

            {/* ============================================================== */}
            {/* 1. COMPACT UNIFIED ACADEMIC STATUS CARD (Above the Fold)        */}
            {/* Combines Greeting, Scope Identity, Search, & 3 Vitality Metrics */}
            {/* ============================================================== */}
            <section className="mt-3 rounded-3xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card p-4 sm:p-6 shadow-[0_8px_24px_-8px_rgba(24,24,27,0.05)]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-[#E8E2D6]/80 dark:border-border/60">
                <div>
                  <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#18181B] dark:text-foreground flex items-center gap-2">
                    <span>{greeting.text}</span>
                    {firstName && (
                      <span className="text-[#996515] dark:text-amber-400">, {firstName}</span>
                    )}
                    <span className="text-lg sm:text-xl" aria-hidden="true">
                      {greeting.icon}
                    </span>
                  </h1>

                  {identityParts.length > 0 ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#71717A] dark:text-muted-foreground font-medium">
                      {identityParts.map((part, i) => (
                        <span key={part} className="flex items-center gap-2">
                          {i > 0 && (
                            <span aria-hidden="true" className="text-[#D4CFC4]">
                              ·
                            </span>
                          )}
                          <span
                            className={
                              i === 0
                                ? "font-bold text-[#18181B] dark:text-foreground font-mono"
                                : ""
                            }
                          >
                            {part}
                          </span>
                        </span>
                      ))}
                      <span aria-hidden="true" className="text-[#D4CFC4]">
                        ·
                      </span>
                      <Link
                        to="/onboarding/university"
                        className="text-xs font-bold text-[#996515] dark:text-amber-400 hover:underline"
                      >
                        Change School / Level
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to="/onboarding/university"
                      className="mt-1 text-xs font-bold text-[#996515] dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Select your university & level</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Quick Search & Preferences */}
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E8E2D6] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-xs font-semibold text-[#52525B] dark:text-muted-foreground hover:text-[#18181B] transition-colors cursor-pointer"
                    title="Search courses and topics (⌘K)"
                  >
                    <Search className="w-3.5 h-3.5 text-[#996515]" />
                    <span>Search</span>
                    <kbd className="hidden sm:inline-block font-mono text-[10px] bg-white dark:bg-card border border-[#E8E2D6] dark:border-border px-1.5 py-0.5 rounded text-[#71717A]">
                      ⌘K
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrefsOpen(true)}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-[#E8E2D6] dark:border-border bg-[#FAF8F5] dark:bg-muted/40 hover:border-[#D4AF37] text-[#52525B] dark:text-muted-foreground hover:text-[#18181B] transition-colors cursor-pointer"
                    title="Customize Dashboard"
                    aria-label="Customize Dashboard"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Unified 3-Column Vitality Strip */}
              <div className="pt-4 grid grid-cols-3 gap-2.5 sm:gap-4">
                {/* Streak */}
                <Link
                  to="/student/analytics"
                  className="group flex flex-col justify-between p-3 rounded-2xl border border-[#E8E2D6] dark:border-border/70 bg-[#FAF8F5]/70 dark:bg-muted/20 hover:border-[#D4AF37] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A] dark:text-muted-foreground">
                    <span>Study Streak</span>
                    <Flame className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold tabular-nums text-[#18181B] dark:text-foreground">
                    {currentStreak}
                    <span className="text-[11px] text-[#71717A] font-sans font-medium ml-1">
                      days
                    </span>
                  </div>
                </Link>

                {/* Tokens */}
                <Link
                  to="/pricing"
                  className="group flex flex-col justify-between p-3 rounded-2xl border border-[#E8E2D6] dark:border-border/70 bg-[#FAF8F5]/70 dark:bg-muted/20 hover:border-[#D4AF37] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A] dark:text-muted-foreground">
                    <span>CBT Tokens</span>
                    <Coins className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-1 font-mono text-lg sm:text-xl font-extrabold tabular-nums text-[#18181B] dark:text-foreground">
                    {balance}
                    <span className="text-[10px] text-[#71717A] font-sans font-medium ml-1 hidden sm:inline">
                      ({dailyFreeLeft} free)
                    </span>
                  </div>
                </Link>

                {/* Exam Readiness */}
                <Link
                  to="/progress"
                  className="group flex flex-col justify-between p-3 rounded-2xl border border-[#E8E2D6] dark:border-border/70 bg-[#FAF8F5]/70 dark:bg-muted/20 hover:border-[#D4AF37] transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#71717A] dark:text-muted-foreground">
                    <span>Readiness</span>
                    <Target className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="font-mono text-lg sm:text-xl font-extrabold tabular-nums text-[#18181B] dark:text-foreground">
                      {avgReadiness}%
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hidden sm:inline">
                      Exam Ready
                    </span>
                  </div>
                </Link>
              </div>
            </section>

            {/* ============================================================== */}
            {/* 2. PRIMARY HERO ACTION: START CBT PRACTICE (Above the Fold)     */}
            {/* High-contrast Deep Charcoal & Gold focal card                   */}
            {/* ============================================================== */}
            <section className="mt-4">
              {coursesLoading ? (
                <BrandSkeleton h={136} />
              ) : current ? (
                <div className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/50 bg-[#18181B] text-white p-5 sm:p-6 shadow-[0_14px_34px_-10px_rgba(24,24,27,0.22)]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#F5D77F]">
                          <Sparkles className="w-3 h-3" />
                          Up Next for Your Level
                        </span>
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-white/10 text-white">
                          {current.code}
                        </span>
                      </div>

                      <h2 className="font-display text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {current.name}
                      </h2>

                      <p className="text-xs text-zinc-300 max-w-lg">
                        {courseAction(weakTopicByCourse[current.id] ?? null, current.last_opened_at)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/practice?course=${current.id}`)}
                      className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] text-[#18181B] font-display font-black text-xs sm:text-sm shadow-[0_8px_20px_-4px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-98 transition-all shrink-0 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start CBT Practice</span>
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="h-6 w-6 text-[#D4AF37]" />}
                  title="Select your semester courses"
                  description="Pick your school and level to load past CBT questions and lecture notes."
                  action={
                    <BrandButton to="/onboarding/university">Configure Courses</BrandButton>
                  }
                />
              )}
            </section>

            {/* ============================================================== */}
            {/* 3. CLEAN 3-ACTION QUICK LAUNCHPAD                              */}
            {/* ============================================================== */}
            <section className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate("/practice")}
                className="group flex items-center gap-2.5 p-3 sm:p-3.5 rounded-2xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card hover:border-[#D4AF37] active:scale-98 transition-all text-left cursor-pointer shadow-2xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF0D6] dark:bg-amber-500/15 text-[#996515] dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Target className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-display font-bold text-xs text-[#18181B] dark:text-foreground truncate">
                    CBT Mock
                  </span>
                  <span className="block text-[10px] text-[#71717A] dark:text-muted-foreground truncate">
                    Timed Exam
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="group flex items-center gap-2.5 p-3 sm:p-3.5 rounded-2xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card hover:border-[#D4AF37] active:scale-98 transition-all text-left cursor-pointer shadow-2xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FAF0D6] dark:bg-amber-500/15 text-[#996515] dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-display font-bold text-xs text-[#18181B] dark:text-foreground truncate">
                    My Courses
                  </span>
                  <span className="block text-[10px] text-[#71717A] dark:text-muted-foreground truncate">
                    Notes &amp; PDFs
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/student/mastery")}
                className="group flex items-center gap-2.5 p-3 sm:p-3.5 rounded-2xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card hover:border-[#D4AF37] active:scale-98 transition-all text-left cursor-pointer shadow-2xs"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="block font-display font-bold text-xs text-[#18181B] dark:text-foreground truncate">
                    Weak Areas
                  </span>
                  <span className="block text-[10px] text-[#71717A] dark:text-muted-foreground truncate">
                    Fix Misses
                  </span>
                </div>
              </button>
            </section>

            {/* ============================================================== */}
            {/* 4. ENROLLED SEMESTER COURSES                                    */}
            {/* ============================================================== */}
            <section className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-sm sm:text-base font-extrabold text-[#18181B] dark:text-foreground">
                  Enrolled Semester Courses
                </h2>
                <Link
                  to="/courses"
                  className="text-xs font-bold text-[#996515] dark:text-amber-400 hover:underline flex items-center gap-1 font-mono tabular-nums"
                >
                  <span>View All ({courses.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {coursesLoading ? (
                <div className="space-y-2.5">
                  <CourseRowSkeleton />
                  <CourseRowSkeleton />
                </div>
              ) : recent.length > 0 ? (
                <div className="space-y-2.5">
                  {recent.slice(0, 3).map((c) => {
                    const prog = progressMap[c.id];
                    return (
                      <CourseRow
                        key={c.id}
                        id={c.id}
                        code={c.code}
                        name={c.name}
                        department={c.department}
                        level={c.level}
                        unreadUpdates={c.unread_updates ?? 0}
                        readinessScore={readinessByCourse[c.id]}
                        progressPercent={prog?.percent ?? readinessByCourse[c.id] ?? 0}
                        completedTopics={prog?.studied ?? 0}
                        totalTopics={prog?.total ?? 0}
                        actionLabel={courseAction(
                          weakTopicByCourse[c.id] ?? null,
                          c.last_opened_at
                        )}
                      />
                    );
                  })}
                </div>
              ) : (
                <EmptyCourses />
              )}
            </section>

            {/* ============================================================== */}
            {/* 5. ORGANIZED STUDY WORKSPACE TABS (Zero Vertical Bloat)        */}
            {/* Houses Daily Targets, Smart Reminders, Weekly Pulse & Offline  */}
            {/* ============================================================== */}
            <section className="mt-6 rounded-3xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card p-4 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-[#E8E2D6]/80 dark:border-border/60">
                <h2 className="font-display text-sm sm:text-base font-extrabold text-[#18181B] dark:text-foreground">
                  Study Workspace &amp; Smart Reminders
                </h2>

                <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] dark:bg-muted/60 border border-[#E8E2D6] dark:border-border rounded-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveInsightTab("target")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeInsightTab === "target"
                        ? "bg-[#18181B] text-[#F5D77F] shadow-2xs"
                        : "text-[#71717A] hover:text-[#18181B] dark:hover:text-foreground"
                    }`}
                  >
                    Daily Targets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInsightTab("reminders")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                      activeInsightTab === "reminders"
                        ? "bg-[#18181B] text-[#F5D77F] shadow-2xs"
                        : "text-[#71717A] hover:text-[#18181B] dark:hover:text-foreground"
                    }`}
                  >
                    <BellRing className="w-3 h-3" />
                    <span>15m Reminder</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInsightTab("weekly")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeInsightTab === "weekly"
                        ? "bg-[#18181B] text-[#F5D77F] shadow-2xs"
                        : "text-[#71717A] hover:text-[#18181B] dark:hover:text-foreground"
                    }`}
                  >
                    Readiness
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInsightTab("heatmap")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeInsightTab === "heatmap"
                        ? "bg-[#18181B] text-[#F5D77F] shadow-2xs"
                        : "text-[#71717A] hover:text-[#18181B] dark:hover:text-foreground"
                    }`}
                  >
                    Consistency
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveInsightTab("offline")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeInsightTab === "offline"
                        ? "bg-[#18181B] text-[#F5D77F] shadow-2xs"
                        : "text-[#71717A] hover:text-[#18181B] dark:hover:text-foreground"
                    }`}
                  >
                    Offline Hub
                  </button>
                </div>
              </div>

              {/* Tab 1: Daily Targets + Smart Study Reminder preview */}
              {activeInsightTab === "target" && (
                <div className="pt-4 space-y-4">
                  <MissionBlock
                    title="Today's 3 Study Targets"
                    subtitle="Consistent daily practice builds first-class CBT exam confidence"
                    missions={threeDailyTargets}
                    completed={completedMissions}
                    total={threeDailyTargets.length}
                    currentCourseId={current?.id}
                  />
                  <SmartStudyReminderCard courseCode={current?.code} compact />
                  {preferences.showDailyCheckIn && <DailyCheckIn variant="card" />}
                </div>
              )}

              {/* Tab 2: Dedicated Smart 15-Minute Reminder Schedule */}
              {activeInsightTab === "reminders" && (
                <div className="pt-4">
                  <SmartStudyReminderCard courseCode={current?.code} />
                </div>
              )}

              {/* Tab 3: Exam Readiness Rings + Weekly Pulse */}
              {activeInsightTab === "weekly" && (
                <div className="pt-4 space-y-4">
                  <ExamReadinessRings
                    readinessPct={avgReadiness}
                    dailyDone={completedMissions}
                    dailyTotal={threeDailyTargets.length}
                    streakDays={currentStreak}
                  />
                  <WeeklyPulse
                    quizzesCompleted={weekly?.quizzes_completed ?? 0}
                    accuracy={weekly?.accuracy_pct ?? 0}
                  />
                </div>
              )}

              {/* Tab 4: Study Consistency Heatmap */}
              {activeInsightTab === "heatmap" && (
                <div className="pt-4">
                  <StudyActivityHeatmap
                    dailyMap={dailyMap}
                    full90DaySeries={full90DaySeries}
                    currentStreak={analyticsSummary.currentStreak}
                    longestStreak={analyticsSummary.longestStreak}
                    onRequestLogForDate={(dateKey) =>
                      logStudySession({
                        courseCode: current?.code || "MTH 101",
                        minutes: 30,
                        questions: 20,
                        accuracy: 85,
                        dateKey,
                      })
                    }
                  />
                </div>
              )}

              {/* Tab 5: Deep Offline Hub */}
              {activeInsightTab === "offline" && (
                <div className="pt-4">
                  <OfflineStudyHub />
                </div>
              )}
            </section>
          </Screen>
        </PullToRefresh>
      </div>
      <StudyPulseOrb />
    </>
  );
};

export default StudentDashboard;
