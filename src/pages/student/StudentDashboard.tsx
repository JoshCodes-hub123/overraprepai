import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import TomorrowExamCard from "@/components/student/dashboard/v2/TomorrowExamCard";
import GNS106GermanCard from "@/components/student/dashboard/v2/GNS106GermanCard";
import QuickJumpMenu from "@/components/student/dashboard/v2/QuickJumpMenu";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import PickUpWhereYouLeftOff from "@/components/student/PickUpWhereYouLeftOff";

import { TopAppBar } from "@/components/student/dashboard/v2/TopAppBar";
import { HeroGreeting } from "@/components/student/dashboard/v2/HeroGreeting";
import { TodayFocusCard } from "@/components/student/dashboard/v2/TodayFocusCard";
import { CourseRail } from "@/components/student/dashboard/v2/CourseRail";
import { QuickActions4 } from "@/components/student/dashboard/v2/QuickActions4";
import { OpportunitySnapshot } from "@/components/student/dashboard/v2/OpportunitySnapshot";
import { CommunityMomentCard } from "@/components/student/dashboard/v2/CommunityMomentCard";
import ArenaSpotlightCard from "@/components/arena/ArenaSpotlightCard";
import IntelligenceWidget from "@/components/intelligence/IntelligenceWidget";
import NextBestAction from "@/components/student/dashboard/v2/NextBestAction";
import SectionLabel from "@/components/student/dashboard/v2/SectionLabel";
import QuizzesPreviewRail from "@/components/student/dashboard/v2/QuizzesPreviewRail";

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

            {/* Greeting + tomorrow's exam + next best action */}
            <div className="space-y-4 sm:space-y-5 mt-3">
              <HeroGreeting key={`hg-${refreshKey}`} />
              <TomorrowExamCard />
              <GNS106GermanCard />
              <PickUpWhereYouLeftOff key={`pu-${refreshKey}`} />
              <QuickJumpMenu />
              <NextBestAction key={`nba-${refreshKey}`} />
            </div>

            {/* Two-column grid on lg+ */}
            <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
              {/* Primary column */}
              <div className="lg:col-span-2 space-y-6 sm:space-y-7 min-w-0">
                <section aria-labelledby="sec-today" className="space-y-3">
                  <SectionLabel
                    eyebrow="Today"
                    title="Your focus right now"
                    hint="A short, intentional plan beats a long, scattered one."
                  />
                  <IntelligenceWidget key={`iw-${refreshKey}`} />
                  <TodayFocusCard key={`tf-${refreshKey}`} />
                </section>

                <section aria-labelledby="sec-learn" className="space-y-3">
                  <SectionLabel
                    eyebrow="Learn"
                    title="Continue your courses"
                    hint="Pick up where you left off."
                    to="/study-hub"
                  />
                  <CourseRail key={`cr-${refreshKey}`} />
                </section>

                <QuizzesPreviewRail key={`qpr-${refreshKey}`} />



                <section aria-labelledby="sec-tools" className="space-y-3">
                  <SectionLabel
                    eyebrow="Tools"
                    title="Quick actions"
                    hint="Practice, summarize, ask the AI tutor."
                  />
                  <QuickActions4 />
                </section>
              </div>

              {/* Side column */}
              <aside className="space-y-6 sm:space-y-7 min-w-0">
                <section aria-labelledby="sec-arena" className="space-y-3">
                  <SectionLabel
                    eyebrow="Compete"
                    title="Arena spotlight"
                    to="/arena"
                  />
                  <ArenaSpotlightCard key={`arena-${refreshKey}`} />
                </section>

                <section aria-labelledby="sec-opps" className="space-y-3">
                  <SectionLabel
                    eyebrow="Grow"
                    title="Opportunities for you"
                    hint="Matched to your profile."
                    to="/opportunities"
                  />
                  <OpportunitySnapshot key={`os-${refreshKey}`} />
                </section>

                <section aria-labelledby="sec-community" className="space-y-3">
                  <SectionLabel
                    eyebrow="Community"
                    title="What's happening"
                    to="/community"
                  />
                  <CommunityMomentCard key={`cm-${refreshKey}`} />
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
