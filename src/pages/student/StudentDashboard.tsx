import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import WhatsNextCard from "@/components/student/dashboard/v2/WhatsNextCard";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";

import { TopAppBar } from "@/components/student/dashboard/v2/TopAppBar";
import SectionLabel from "@/components/student/dashboard/v2/SectionLabel";
import { SectionErrorBoundary } from "@/components/student/dashboard/v2/SectionErrorBoundary";

// Lazy-load below-the-fold sections to keep initial dashboard paint fast.
const CourseRail = lazy(() => import("@/components/student/dashboard/v2/CourseRail"));
const QuizzesPreviewRail = lazy(() => import("@/components/student/dashboard/v2/QuizzesPreviewRail"));
const QuickActions4 = lazy(() =>
  import("@/components/student/dashboard/v2/QuickActions4").then((m) => ({ default: m.QuickActions4 })),
);
const ExploreTabs = lazy(() => import("@/components/student/dashboard/v2/ExploreTabs"));

const RailFallback = ({ h = 140 }: { h?: number }) => (
  <div className="rounded-2xl bg-amber-50/40 animate-pulse" style={{ height: h }} />
);


if (typeof window !== "undefined") prefetchDashboardNeighbors();

/**
 * Student Dashboard V2 — premium, calm, mobile-first "what's next" screen.
 * Sectioned layout with a single "Next Best Action" hero up top, then
 * Today → Courses → Opportunities → Community. Highly responsive:
 * single column on phones, two-column grid from lg.
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
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

  return (
    <>
      <SEO
        title="Student Dashboard"
        description="Your calm academic home — know exactly what to do next."
        noindex={true}
        url="https://overraprep.com/student/dashboard"
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PullToRefresh onRefresh={onRefresh}>
        <div className="relative min-h-screen pb-28 md:pb-12 bg-gradient-to-b from-amber-50/60 via-white to-white overflow-hidden">
          {/* Ambient gold glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
            <div className="absolute -top-32 -right-24 w-[320px] sm:w-[420px] h-[320px] sm:h-[420px] rounded-full bg-amber-200/40 blur-3xl" />
            <div className="absolute top-1/3 -left-32 w-[280px] sm:w-[360px] h-[280px] sm:h-[360px] rounded-full bg-orange-100/50 blur-3xl" />
          </div>

          <main className="relative container mx-auto px-3 sm:px-4 lg:px-6 pt-3 max-w-2xl lg:max-w-6xl">
            <TopAppBar />
            <div className="mt-3">
              <DashboardOfflineBanner onReattempt={onRefresh} />
            </div>

            {/* One smart "what's next" hero */}
            <div className="mt-3">
              <WhatsNextCard key={`wn-${refreshKey}`} />
            </div>

            {/* Two-column grid on lg+ */}
            <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Primary column */}
              <div className="lg:col-span-2 space-y-6 sm:space-y-7 min-w-0">


                <section aria-labelledby="sec-learn" className="space-y-3">
                  <SectionLabel
                    eyebrow="Learn"
                    title="Continue your courses"
                    hint="Pick up where you left off."
                    to="/study-hub"
                  />
                  <Suspense fallback={<RailFallback h={180} />}>
                    <CourseRail key={`cr-${refreshKey}`} />
                  </Suspense>
                </section>

                <Suspense fallback={<RailFallback h={220} />}>
                  <QuizzesPreviewRail key={`qpr-${refreshKey}`} />
                </Suspense>



                <section aria-labelledby="sec-tools" className="space-y-3">
                  <SectionLabel
                    eyebrow="Tools"
                    title="Quick actions"
                    hint="Practice, summarize, ask the AI tutor."
                  />
                  <Suspense fallback={<RailFallback h={120} />}>
                    <QuickActions4 />
                  </Suspense>
                </section>
              </div>

              {/* Side column */}
              <aside className="space-y-6 sm:space-y-7 min-w-0">
                <section aria-labelledby="sec-explore" className="space-y-3">
                  <SectionLabel
                    eyebrow="Explore"
                    title="Compete · Grow · Community"
                    hint="One tap into Arena, Opportunities or the feed."
                  />
                  <Suspense fallback={<RailFallback h={240} />}>
                    <ExploreTabs refreshKey={refreshKey} />
                  </Suspense>
                </section>
              </aside>
            </div>
          </main>
        </div>
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
