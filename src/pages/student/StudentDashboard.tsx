import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { FeedbackPromptDialog } from "@/components/feedback/FeedbackPromptDialog";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";

import { Screen, Section, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import NextStepHero from "@/components/dashboard/mobile/NextStepHero";
import MissionBlock from "@/components/dashboard/mobile/MissionBlock";
import CourseRow, { EmptyCourses } from "@/components/dashboard/mobile/CourseRow";
import WeeklyPulse from "@/components/dashboard/mobile/WeeklyPulse";
import AskOverraBlock from "@/components/dashboard/mobile/AskOverraBlock";
import QuickAccess, { quickAccessItems } from "@/components/dashboard/mobile/QuickAccess";
import DashboardSearch from "@/components/dashboard/mobile/DashboardSearch";
import OpportunityStrip from "@/components/dashboard/mobile/OpportunityStrip";
import TopArticlesStrip from "@/components/dashboard/mobile/TopArticlesStrip";

import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTodayMission, useWeeklyReport, useReadinessAll } from "@/hooks/useIntelligence";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePosts } from "@/hooks/usePosts";
import useEnvironment from "@/hooks/useEnvironment";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";
import { courseActionLabel as courseAction } from "@/lib/nextStep";

if (typeof window !== "undefined") prefetchDashboardNeighbors();

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * University student home — redesigned as a bento-gold-minimalist dashboard.
 *
 * Answers, in order: who am I · what should I study next · what should I do
 * today · what am I taking · where do I get help. Everything is scoped by the
 * student's own profile and RLS, so a FUTA student never sees OAU, UI,
 * FUTEsIyin or JAMB content.
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
  const { data: opportunities = [] } = useOpportunities({ limit: 8 });
  const { data: articles = [] } = usePosts({ type: "article", limit: 6 });

  /** course_id → weakest real topic, when the intelligence layer knows one. */
  const weakTopicByCourse = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of readiness) {
      const topic = r.weak_topics?.[0]?.topic;
      if (r.course_id && topic) map[r.course_id] = topic;
    }
    return map;
  }, [readiness]);

  // "FUTA · Computer Engineering · 200L" — only the parts that actually exist.
  const identityParts = useMemo(() => {
    const code = institution ?? (isInstitutionCode((profile as any)?.university) ? (profile as any).university : null);
    const lvl = level ? (/l$/i.test(String(level)) ? String(level) : `${level}L`) : null;
    return [code ? INSTITUTIONS[code].short : null, department, lvl]
      .map((p) => (typeof p === "string" ? p.trim() : p))
      .filter((p): p is string => Boolean(p));
  }, [institution, profile, department, level]);

  const firstName = profile?.full_name?.split(" ")[0];

  const recent = useMemo(
    () =>
      [...courses].sort((a, b) => {
        const ta = a.last_opened_at ? new Date(a.last_opened_at).getTime() : 0;
        const tb = b.last_opened_at ? new Date(b.last_opened_at).getTime() : 0;
        return tb - ta;
      }),
    [courses],
  );
  const current = recent[0];

  const missionTasks = useMemo(
    () => (mission?.tasks ?? []).map((t) => ({ label: t.label, done: t.done, link: t.link })),
    [mission],
  );
  const completedMissions = missionTasks.filter((t) => t.done).length;

  return (
    <>
      <SEO
        title="Student Dashboard"
        description="Your calm academic home — know exactly what to do next."
        noindex
        url="https://overraprep.com/student/dashboard"
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <FeedbackPromptDialog />
      <PullToRefresh onRefresh={onRefresh}>
        <Screen>
          <BrandTopBar />

          {/* Who am I. */}
          <div className="pb-6 pt-6">
            <h1 className="font-display text-[28px] font-bold leading-[1.1] tracking-tight text-brand-ink">
              {greetingFor()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            {identityParts.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold tracking-tight text-brand-ink-soft">
                {identityParts.map((part, i) => (
                  <span key={part} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-env" />}
                    <span>{part}</span>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="mb-6">
            <DashboardSearch onOpen={() => setPaletteOpen(true)} />
          </div>

          <DashboardOfflineBanner onReattempt={onRefresh} />

          {/* What should I study next. */}
          {coursesLoading ? (
            <BrandSkeleton h={190} />
          ) : current ? (
            <NextStepHero
              key={`next-${refreshKey}`}
              eyebrow="Your next step"
              kicker={current.code}
              title={current.name}
              context={courseAction(weakTopicByCourse[current.id] ?? null, current.last_opened_at)}
              cta="Continue"
              to={`/courses/${current.id}`}
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="Pick your courses to begin"
              description="Choose the courses you're taking this semester and your whole dashboard adapts to them."
              action={<BrandButton to="/courses">Choose courses</BrandButton>}
            />
          )}

          {/* Today's mission + Weekly pulse as a bento grid. */}
          <Section title="Today" className="mt-8">
            {mission ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MissionBlock
                  title="Daily mission"
                  subtitle="Small steps, big results"
                  missions={missionTasks}
                  completed={completedMissions}
                  total={missionTasks.length || 1}
                />
                <WeeklyPulse
                  quizzesCompleted={weekly?.quizzes_completed ?? 0}
                  accuracy={weekly?.accuracy_pct ?? 0}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MissionBlock
                  title="Daily mission"
                  subtitle="A short, focused session is enough for today."
                  missions={[
                    {
                      label: current
                        ? `Practise a ${current.code} question set`
                        : "Practise a past question set",
                      done: false,
                      link: current ? `/practice?course=${current.id}` : "/practice",
                    },
                  ]}
                  completed={0}
                  total={1}
                />
                <WeeklyPulse quizzesCompleted={0} accuracy={0} />
              </div>
            )}
          </Section>

          {/* What am I taking. */}
          {coursesLoading ? (
            <Section title="Your courses" to="/courses" linkLabel="See all">
              <div className="space-y-2.5">
                <BrandSkeleton h={78} />
                <BrandSkeleton h={78} />
              </div>
            </Section>
          ) : recent.length > 0 ? (
            <Section title="Your courses" to="/courses" linkLabel="See all">
              <div className="space-y-2.5">
                {recent.slice(0, 4).map((c) => (
                  <CourseRow
                    key={c.id}
                    id={c.id}
                    code={c.code}
                    name={c.name}
                    department={c.department}
                    level={c.level}
                    unreadUpdates={c.unread_updates ?? 0}
                    actionLabel={courseAction(weakTopicByCourse[c.id] ?? null, c.last_opened_at)}
                  />
                ))}
              </div>
            </Section>
          ) : (
            <Section title="Your courses">
              <EmptyCourses />
            </Section>
          )}

          {/* Scholarships & opportunities — fresh, scannable, never noisy. */}
          {opportunities.length > 0 && (
            <Section title="Today's opportunities" to="/opportunities" linkLabel="See all">
              <OpportunityStrip items={opportunities.slice(0, 8)} />
            </Section>
          )}

          {/* Top articles today — image-led, light on text. */}
          {articles.length > 0 && (
            <Section title="Top articles today" to="/posts" linkLabel="See all">
              <TopArticlesStrip items={articles.slice(0, 6)} />
            </Section>
          )}

          {/* Where do I get help. */}
          <Section title="Ask Overra">
            <AskOverraBlock />
          </Section>

          <Section title="Go to">
            <QuickAccess items={quickAccessItems("Practice", "CBT drills for your courses")} />
          </Section>
        </Screen>
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
