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
import CourseRow from "@/components/dashboard/mobile/CourseRow";
import WeeklyPulse from "@/components/dashboard/mobile/WeeklyPulse";
import AskOverraBlock from "@/components/dashboard/mobile/AskOverraBlock";
import QuickAccess, { quickAccessItems } from "@/components/dashboard/mobile/QuickAccess";

import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTodayMission, useWeeklyReport, useReadinessAll } from "@/hooks/useIntelligence";
import useEnvironment from "@/hooks/useEnvironment";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";
// One shared source of truth for "what should this student do next".
import { courseActionLabel as courseAction } from "@/lib/nextStep";

if (typeof window !== "undefined") prefetchDashboardNeighbors();

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}



/**
 * University student home.
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

  const nextTask = mission?.tasks?.find((t) => !t.done);

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
            <h1 className="text-[27px] font-bold leading-[1.15] tracking-tight text-brand-ink">
              {greetingFor()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            {identityParts.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold tracking-tight text-brand-ink-soft">
                {identityParts.map((part, i) => (
                  <span key={part} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-env" />}
                    <span>{part}</span>
                  </span>
                ))}
              </p>
            )}
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

          {/* What should I do today. */}
          <Section title="Today's mission" className="mt-8">
            {nextTask ? (
              <MissionBlock
                title={nextTask.label}
                meta="Recommended for you today"
                cta="Start now"
                to={nextTask.link}
              />
            ) : mission && mission.completed_today > 0 ? (
              <MissionBlock
                title="Today's mission is done"
                meta="Anything extra is a bonus — keep it light."
                cta="Practice anyway"
                to="/practice"
              />
            ) : (
              <MissionBlock
                title={current ? `Practise a ${current.code} question set` : "Practise a past question set"}
                meta="A short, focused session is enough for today."
                cta="Start practice"
                to={current ? `/practice?course=${current.id}` : "/practice"}
              />
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
                    to={`/courses/${c.id}`}
                    code={c.code}
                    name={c.name}
                    action={courseAction(weakTopicByCourse[c.id] ?? null, c.last_opened_at)}
                    badge={c.unread_updates > 0 ? `${c.unread_updates} new` : undefined}
                  />
                ))}
              </div>
            </Section>
          ) : null}

          {/* Quiet, real confidence — only when the week actually has activity. */}
          {weekly?.ok && (weekly.quizzes_completed ?? 0) > 0 && (
            <Section title="This week">
              <WeeklyPulse
                quizzes={weekly.quizzes_completed}
                accuracyPct={weekly.accuracy_pct}
              />
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
