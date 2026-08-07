import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { FeedbackPromptDialog } from "@/components/feedback/FeedbackPromptDialog";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";

import { Screen, Section, ListRow, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import ContinueBlock from "@/components/dashboard/mobile/ContinueBlock";
import QuickAccess, { quickAccessItems } from "@/components/dashboard/mobile/QuickAccess";

import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useTodayMission } from "@/hooks/useIntelligence";
import useEnvironment from "@/hooks/useEnvironment";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";

if (typeof window !== "undefined") prefetchDashboardNeighbors();

function timeAgo(iso: string | null) {
  if (!iso) return "Not opened yet";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * University home — one screen, one obvious next step.
 *
 * Order of thought: who am I → continue learning → what to practise today →
 * my courses → the three places I go most. Everything is scoped by the
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

  // "FUTA · Computer Engineering · 200L"
  const identity = useMemo(() => {
    const code = institution ?? (isInstitutionCode((profile as any)?.university) ? (profile as any).university : null);
    return [code ? INSTITUTIONS[code].short : null, department, level].filter(Boolean).join(" · ");
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

          {/* Academic identity — the first thing the student reads. */}
          <div className="pb-7 pt-7">
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-tight text-brand-ink">
              {firstName ? `Hello, ${firstName}` : "Welcome back"}
            </h1>
            <p className="mt-2 text-[14px] font-medium tracking-wide text-brand-ink-soft">
              {identity || "Finish setting up your campus profile"}
            </p>
          </div>

          <DashboardOfflineBanner onReattempt={onRefresh} />

          {/* The one primary action. */}
          {coursesLoading ? (
            <BrandSkeleton h={170} />
          ) : current ? (
            <ContinueBlock
              key={`continue-${refreshKey}`}
              eyebrow="Continue learning"
              title={current.name}
              meta={`${current.code} · ${timeAgo(current.last_opened_at)}`}
              cta="Continue"
              to={`/study-hub/${current.id}`}
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="Pick your courses to begin"
              description="Choose the courses you're taking this semester and your whole dashboard adapts to them."
              action={<BrandButton to="/courses">Choose courses</BrandButton>}
            />
          )}

          {/* Today's recommended practice — quiet, single line. */}
          <Section title="Today" className="mt-8">
            {nextTask ? (
              <ListRow
                to={nextTask.link}
                title={nextTask.label}
                meta="Recommended for you today"
                icon={<Sparkles className="h-5 w-5" />}
              />
            ) : (
              <ListRow
                to="/practice"
                title="Practice a past question set"
                meta="Recommended for you today"
                icon={<Sparkles className="h-5 w-5" />}
              />
            )}
          </Section>

          {/* Course progress — a list, not a wall of cards. */}
          <Section title="Your courses" to="/courses" linkLabel="Manage">
            {coursesLoading ? (
              <div className="space-y-2.5">
                <BrandSkeleton h={64} />
                <BrandSkeleton h={64} />
              </div>
            ) : recent.length === 0 ? (
              <EmptyState title="No courses yet" description="Add courses to track your progress." />
            ) : (
              <div className="space-y-2.5">
                {recent.slice(0, 5).map((c) => (
                  <ListRow
                    key={c.id}
                    to={`/study-hub/${c.id}`}
                    title={c.code}
                    meta={`${c.name} · ${timeAgo(c.last_opened_at)}`}
                    trailing={
                      c.unread_updates > 0 ? (
                        <span className="rounded-full bg-env-soft px-2 py-0.5 text-[11px] font-bold text-env">
                          {c.unread_updates} new
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
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
