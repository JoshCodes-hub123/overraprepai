import React, { useEffect, useMemo, useState } from "react";
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
  Compass,
  Zap,
  TrendingUp,
  RotateCcw,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";

import { Screen, Section, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import NextStepHero from "@/components/dashboard/mobile/NextStepHero";
import CourseRow, { EmptyCourses } from "@/components/dashboard/mobile/CourseRow";
import MissionBlock from "@/components/dashboard/mobile/MissionBlock";
import WeeklyPulse from "@/components/dashboard/mobile/WeeklyPulse";
import ProgressCards from "@/components/dashboard/mobile/ProgressCards";
import DashboardSearch from "@/components/dashboard/mobile/DashboardSearch";

import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTodayMission, useWeeklyReport, useReadinessAll, useSuccessScore } from "@/hooks/useIntelligence";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useStudyStreak } from "@/hooks/useLearningProgress";
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

/**
 * University student home — 5-tier focused academic study space:
 * 1. Warm Personal Greeting & Academic Scope (e.g. FUTA · Computer Science · 200L)
 * 2. Academic Vitals Ticker (Study Streak 🔥, Token Wallet 🪙, Exam Readiness 🎯)
 * 3. Responsive Real-time Course & Topic Search
 * 4. 1-Tap Speed Launchpad (CBT Practice, Course Syllabi, Weakness Drill, Arena)
 * 5. "Next Best Action" Dynamic Study Hero
 * 6. Enrolled Semester Courses with direct CBT buttons
 * 7. Daily Practice Target & Diagnostic Intelligence
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

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
  const { data: mission } = useTodayMission();
  const { data: weekly } = useWeeklyReport();
  const { data: readiness = [] } = useReadinessAll();
  const { data: successScore } = useSuccessScore();
  const { balance, dailyFreeLeft } = useTokenBalance();
  const { data: streakData } = useStudyStreak();

  /** course_id → weakest real topic, when available */
  const weakTopicByCourse = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of readiness) {
      const topic = r.weak_topics?.[0]?.topic;
      if (r.course_id && topic) map[r.course_id] = topic;
    }
    return map;
  }, [readiness]);

  /** course_id → readiness percentage */
  const readinessByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of readiness) {
      if (r.course_id && typeof r.readiness === "number") {
        map[r.course_id] = Math.round(r.readiness);
      }
    }
    return map;
  }, [readiness]);

  // Academic Context: "FUTA · Computer Science · 200 Level"
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
  const completedMissions = missionTasks.filter((t) => t.done).length;

  const currentStreak = streakData?.current ?? mission?.streak ?? 1;

  // Average readiness across courses
  const avgReadiness = useMemo(() => {
    if (readiness.length === 0) return 78;
    const sum = readiness.reduce((acc, curr) => acc + (curr.readiness || 0), 0);
    return Math.round(sum / readiness.length);
  }, [readiness]);

  return (
    <>
      <SEO
        title="Student Dashboard — OverraPrep AI"
        description="Your calm academic home — know exactly what to study next."
        noindex
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PullToRefresh onRefresh={onRefresh}>
        <Screen className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
          <BrandTopBar />

          {/* =========================================================
              TIER 1: Academic Home Greeting & Context
             ========================================================= */}
          <div className="pt-2 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight text-foreground flex items-center gap-2">
                  <span>{greeting.text}</span>
                  {firstName && <span className="text-amber-600 dark:text-amber-400">, {firstName}</span>}
                  <span className="text-xl sm:text-2xl">{greeting.icon}</span>
                </h1>

                {identityParts.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm font-medium text-muted-foreground">
                    {identityParts.map((part, i) => (
                      <span key={part} className="flex items-center gap-2">
                        {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-amber-500" />}
                        <span className={i === 0 ? "text-foreground font-bold" : ""}>{part}</span>
                      </span>
                    ))}
                    <Link
                      to="/onboarding/university"
                      className="ml-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Switch</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                ) : (
                  <Link
                    to="/onboarding/university"
                    className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <span>Select your university and department</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Motivational Quote / Exam Date Tag */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                <GraduationCap className="w-4 h-4 text-amber-600" />
                <span>Semester CBT Mode Active</span>
              </div>
            </div>

            {/* =========================================================
                TIER 2: Academic Vitality Trio (Home Island)
               ========================================================= */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4">
              {/* Streak Card */}
              <div className="flex flex-col justify-between p-3 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-400/60 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Streak
                  </span>
                  <Flame className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                </div>
                <div className="mt-2">
                  <div className="font-mono text-lg sm:text-2xl font-black text-foreground">
                    {currentStreak}
                    <span className="text-xs font-semibold text-muted-foreground ml-1">d</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:block">
                    {currentStreak > 1 ? "Active streak · On fire" : "Study today to start"}
                  </p>
                </div>
              </div>

              {/* Token Wallet Card */}
              <Link
                to="/pricing"
                className="group flex flex-col justify-between p-3 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-400/80 transition-all cursor-pointer"
                title="View your token wallet and get more tokens"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tokens
                  </span>
                  <Coins className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2">
                  <div className="font-mono text-lg sm:text-2xl font-black text-foreground">
                    {balance}
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 ml-1">+</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate hidden sm:block">
                    {dailyFreeLeft} free CBTs left today
                  </p>
                </div>
              </Link>

              {/* Exam Readiness Card */}
              <Link
                to="/progress"
                className="group flex flex-col justify-between p-3 sm:p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-amber-400/80 transition-all cursor-pointer"
                title="View full diagnostic readiness analytics"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Readiness
                  </span>
                  <Target className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <div className="mt-2">
                  <div className="font-mono text-lg sm:text-2xl font-black text-foreground">
                    {avgReadiness}
                    <span className="text-xs font-semibold text-muted-foreground ml-0.5">%</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold truncate hidden sm:block">
                    A-Grade Target Pace
                  </p>
                </div>
              </Link>
            </div>
          </div>

          {/* =========================================================
              TIER 3: Responsive Real-Time Course & Topic Search
             ========================================================= */}
          <div className="mb-6">
            <DashboardSearch onOpen={() => setPaletteOpen(true)} />
          </div>

          <DashboardOfflineBanner onReattempt={onRefresh} />

          {/* =========================================================
              TIER 4: 1-Tap Speed Launchpad (Fast Action Grid)
             ========================================================= */}
          <div className="mb-7">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/practice")}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-amber-300/80 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 text-left transition-all shadow-2xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-bold shadow-xs group-hover:scale-105 transition-transform">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-foreground truncate">
                    Practice CBT
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    Timed exam simulation
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/courses")}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 text-left transition-all shadow-2xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-foreground truncate">
                    Syllabi & Notes
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    Verified outlines
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/student/mastery")}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 text-left transition-all shadow-2xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold group-hover:scale-105 transition-transform">
                  <Zap className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-foreground truncate">
                    Weakness Drill
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    Target missed questions
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/leaderboard")}
                className="group flex items-center gap-3 p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 active:scale-95 text-left transition-all shadow-2xs"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold group-hover:scale-105 transition-transform">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span className="block font-bold text-xs sm:text-sm text-foreground truncate">
                    Arena Ranking
                  </span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    Campus showdowns
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* =========================================================
              TIER 5: "Next Best Action" Dynamic Hero Card
             ========================================================= */}
          {coursesLoading ? (
            <BrandSkeleton h={180} />
          ) : current ? (
            <NextStepHero
              key={`next-${refreshKey}`}
              eyebrow="Recommended Next Step"
              kicker={current.code}
              title={current.name}
              context={courseAction(weakTopicByCourse[current.id] ?? null, current.last_opened_at)}
              cta="Start CBT Practice Now"
              to={`/practice?course=${current.id}`}
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="h-6 w-6 text-amber-600" />}
              title="Set your semester courses"
              description="Select your department courses to activate your personalized past questions and lecture notes."
              action={
                <BrandButton to="/onboarding/university">
                  Configure Courses
                </BrandButton>
              }
            />
          )}

          {/* =========================================================
              TIER 6: Enrolled Semester Courses (Bento Grid)
             ========================================================= */}
          <Section
            title="My Semester Courses"
            to="/courses"
            linkLabel="View All"
            className="mt-8"
          >
            {coursesLoading ? (
              <div className="space-y-3">
                <BrandSkeleton h={74} />
                <BrandSkeleton h={74} />
                <BrandSkeleton h={74} />
              </div>
            ) : recent.length > 0 ? (
              <div className="space-y-3">
                {recent.slice(0, 6).map((c) => (
                  <CourseRow
                    key={c.id}
                    id={c.id}
                    code={c.code}
                    name={c.name}
                    department={c.department}
                    level={c.level}
                    unreadUpdates={c.unread_updates ?? 0}
                    readinessScore={readinessByCourse[c.id]}
                    actionLabel={courseAction(weakTopicByCourse[c.id] ?? null, c.last_opened_at)}
                  />
                ))}
              </div>
            ) : (
              <EmptyCourses />
            )}
          </Section>

          {/* =========================================================
              TIER 7: Daily Practice Target & Weekly Pulse
             ========================================================= */}
          <Section title="Daily Practice Target" className="mt-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MissionBlock
                title="Today's Academic Target"
                subtitle="Consistent practice guarantees 1st-class CBT exam readiness"
                missions={
                  missionTasks.length > 0
                    ? missionTasks
                    : [
                        {
                          label: current
                            ? `Complete 1 CBT practice set in ${current.code}`
                            : "Complete 1 CBT practice set",
                          done: false,
                          link: current ? `/practice?course=${current.id}` : "/practice",
                        },
                      ]
                }
                completed={completedMissions}
                total={missionTasks.length || 1}
              />
              <WeeklyPulse
                quizzesCompleted={weekly?.quizzes_completed ?? 0}
                accuracy={weekly?.accuracy_pct ?? 0}
              />
            </div>
          </Section>

          {/* =========================================================
              TIER 8: Diagnostic Intelligence & Progress Summary
             ========================================================= */}
          <Section
            title="Recent Diagnostic Summary"
            to="/progress"
            linkLabel="Full Breakdown"
            className="mt-8 pb-10"
          >
            <ProgressCards />
          </Section>
        </Screen>
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
