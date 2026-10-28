import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Flame,
  Coins,
  Target,
  Trophy,
  Zap,
  SlidersHorizontal,
  Calendar,
  BarChart3,
  Search,
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
  const { preferences, visibleCount, totalCount } = useDashboardPreferences();
  const { dailyMap, full90DaySeries, summary: analyticsSummary, logStudySession } =
    useStudyAnalytics("14d");

  // Tab state for insights (prevents endless vertical scroll on mobile)
  const [activeInsightTab, setActiveInsightTab] = useState<"target" | "weekly" | "heatmap">("target");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  const [refreshKey, setRefreshKey] = useState(0);
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
        : `${rawLvl} Level`
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

      <PullToRefresh onRefresh={onRefresh}>
        <Screen className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
          <BrandTopBar />

          {/* ============================================================== */}
          {/* 1. SERENE ACADEMIC HEADER                                       */}
          {/* Clean, distraction-free greeting & academic identity           */}
          {/* ============================================================== */}
          <div className="pt-3 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span>{greeting.text}</span>
                  {firstName && <span className="text-[#B8860B] dark:text-amber-400">, {firstName}</span>}
                  <span className="text-xl sm:text-2xl">{greeting.icon}</span>
                </h1>

                {identityParts.length > 0 ? (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs sm:text-sm text-muted-foreground font-medium">
                    {identityParts.map((part, i) => (
                      <span key={part} className="flex items-center gap-2">
                        {i > 0 && <span aria-hidden="true" className="text-muted-foreground/40">·</span>}
                        <span className={i === 0 ? "font-bold text-foreground" : ""}>{part}</span>
                      </span>
                    ))}
                    <span aria-hidden="true" className="text-muted-foreground/40">·</span>
                    <Link
                      to="/onboarding/university"
                      className="text-[11px] font-semibold text-[#B8860B] dark:text-amber-400 hover:underline"
                    >
                      Switch
                    </Link>
                  </div>
                ) : (
                  <Link
                    to="/onboarding/university"
                    className="mt-1 text-xs font-semibold text-[#B8860B] dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Configure your department & level</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>

              {/* Quick Search Shortcut & Preference Trigger */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Search courses and topics (⌘K)"
                >
                  <Search className="w-3.5 h-3.5 text-[#B8860B]" />
                  <span>Search</span>
                  <kbd className="hidden sm:inline-block font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    ⌘K
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setPrefsOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Customize Dashboard"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Offline notification if network is down */}
            <DashboardOfflineBanner onReattempt={onRefresh} />

            {/* ============================================================== */}
            {/* 2. UNIFIED VITALITY BAR                                         */}
            {/* 3 clean, uncluttered metric anchors in single elevation card   */}
            {/* ============================================================== */}
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
              {/* Daily Streak */}
              <Link
                to="/student/analytics"
                className="group flex flex-col justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Streak</span>
                  <Flame className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
                  {currentStreak}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">days</span>
                </div>
              </Link>

              {/* Tokens */}
              <Link
                to="/pricing"
                className="group flex flex-col justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Tokens</span>
                  <Coins className="w-3.5 h-3.5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
                  {balance}
                  <span className="text-[10px] text-muted-foreground font-normal ml-1 hidden xs:inline">
                    ({dailyFreeLeft} free)
                  </span>
                </div>
              </Link>

              {/* Readiness Target */}
              <Link
                to="/progress"
                className="group flex flex-col justify-between p-3 rounded-xl border border-border/70 bg-card hover:border-[#D4AF37]/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Readiness</span>
                  <Target className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-1 font-mono text-lg sm:text-xl font-bold tabular-nums text-foreground">
                  {avgReadiness}
                  <span className="text-xs text-muted-foreground font-normal ml-0.5">%</span>
                </div>
              </Link>
            </div>

            {/* Daily Check-In Banner if enabled */}
            {preferences.showDailyCheckIn && (
              <DailyCheckIn variant="card" className="mt-3" />
            )}
          </div>

          {/* ============================================================== */}
          {/* 3. PRIMARY ACTION: WHAT TO STUDY NEXT                           */}
          {/* High-intent focal card preventing decision fatigue             */}
          {/* ============================================================== */}
          <div className="my-3">
            {coursesLoading ? (
              <BrandSkeleton h={140} />
            ) : current ? (
              <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-gradient-to-br from-card via-card to-[#FAF0D6]/20 p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF0D6] dark:bg-amber-950/40 px-2 py-0.5 text-[11px] font-bold text-[#996515] dark:text-amber-400">
                        <Sparkles className="w-3 h-3" />
                        Recommended Next Step
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {current.code}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                      {current.name}
                    </h2>

                    <p className="text-xs text-muted-foreground max-w-md">
                      {courseAction(weakTopicByCourse[current.id] ?? null, current.last_opened_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/practice?course=${current.id}`)}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-neutral-950 font-bold text-xs sm:text-sm shadow-sm hover:brightness-105 active:scale-98 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Start CBT Practice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="h-6 w-6 text-[#D4AF37]" />}
                title="Select your semester courses"
                description="Pick your departmental courses to get past questions and diagnostic CBT practice."
                action={
                  <BrandButton to="/onboarding/university">
                    Configure Courses
                  </BrandButton>
                }
              />
            )}
          </div>

          {/* ============================================================== */}
          {/* 4. CLEAN 3-ACTION TOOLBAR                                       */}
          {/* Essential workflows with clear affordances                      */}
          {/* ============================================================== */}
          <div className="my-4 grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/practice")}
              className="group flex flex-col items-center justify-center p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 transition-all text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-[#B8860B] dark:text-amber-400 mb-1.5 group-hover:scale-105 transition-transform">
                <Target className="h-4 w-4" />
              </div>
              <span className="font-bold text-xs text-foreground">Practice CBT</span>
              <span className="text-[10px] text-muted-foreground hidden xs:inline">Timed Exam</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/courses")}
              className="group flex flex-col items-center justify-center p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 transition-all text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 mb-1.5 group-hover:scale-105 transition-transform">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-bold text-xs text-foreground">My Courses</span>
              <span className="text-[10px] text-muted-foreground hidden xs:inline">Outlines</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/student/mastery")}
              className="group flex flex-col items-center justify-center p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 transition-all text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-1.5 group-hover:scale-105 transition-transform">
                <Zap className="h-4 w-4" />
              </div>
              <span className="font-bold text-xs text-foreground">Weak Areas</span>
              <span className="text-[10px] text-muted-foreground hidden xs:inline">Fix Misses</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* 5. ENROLLED SEMESTER COURSES (Clean & Calm)                     */}
          {/* ============================================================== */}
          <div className="my-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">Enrolled Courses</h2>
              <Link
                to="/courses"
                className="text-xs font-semibold text-[#B8860B] dark:text-amber-400 hover:underline flex items-center gap-1"
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
                      actionLabel={courseAction(weakTopicByCourse[c.id] ?? null, c.last_opened_at)}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyCourses />
            )}
          </div>

          {/* ============================================================== */}
          {/* 6. STUDY INSIGHTS & RHYTHM (Organized Tabs to avoid busy UI)   */}
          {/* Allows user to view Target, Weekly summary, or Heatmap cleanly */}
          {/* ============================================================== */}
          <div className="my-6 rounded-2xl border border-border/80 bg-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
              <h2 className="text-sm font-bold text-foreground">Study Rhythm & Targets</h2>

              {/* Segmented Controls for Tab Selection */}
              <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveInsightTab("target")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeInsightTab === "target"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Daily Target
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInsightTab("weekly")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeInsightTab === "weekly"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Weekly Pulse
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInsightTab("heatmap")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeInsightTab === "heatmap"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Consistency
                </button>
              </div>
            </div>

            {/* Tab 1: Daily Target Mission */}
            {activeInsightTab === "target" && (
              <div className="pt-4">
                <MissionBlock
                  title="Today's Target"
                  subtitle="Consistent daily practice guarantees 1st-class CBT exam readiness"
                  missions={threeDailyTargets}
                  completed={completedMissions}
                  total={threeDailyTargets.length}
                  currentCourseId={current?.id}
                />
              </div>
            )}

            {/* Tab 2: Weekly Pulse Accuracy */}
            {activeInsightTab === "weekly" && (
              <div className="pt-4">
                <WeeklyPulse
                  quizzesCompleted={weekly?.quizzes_completed ?? 0}
                  accuracy={weekly?.accuracy_pct ?? 0}
                />
              </div>
            )}

            {/* Tab 3: Monthly Study Heatmap */}
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
          </div>
        </Screen>
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
