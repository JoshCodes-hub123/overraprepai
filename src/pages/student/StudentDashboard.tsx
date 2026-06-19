import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";

import { TopAppBar } from "@/components/student/dashboard/v2/TopAppBar";
import { HeroGreeting } from "@/components/student/dashboard/v2/HeroGreeting";
import { TodayFocusCard } from "@/components/student/dashboard/v2/TodayFocusCard";
import { CourseRail } from "@/components/student/dashboard/v2/CourseRail";
import { QuickActions4 } from "@/components/student/dashboard/v2/QuickActions4";
import { OpportunitySnapshot } from "@/components/student/dashboard/v2/OpportunitySnapshot";
import { CommunityMomentCard } from "@/components/student/dashboard/v2/CommunityMomentCard";
import ArenaSpotlightCard from "@/components/arena/ArenaSpotlightCard";

if (typeof window !== "undefined") prefetchDashboardNeighbors();

/**
 * Student Dashboard V2 — premium, calm, mobile-first "what's next" screen.
 * Apple × Notion × Duolingo. White + gold + Inter only.
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
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
        <div className="min-h-screen bg-background pb-24 md:pb-12">
          <main className="container mx-auto px-4 pt-2 max-w-2xl space-y-5">
            <TopAppBar />
            <DashboardOfflineBanner onReattempt={onRefresh} />

            <HeroGreeting key={`hg-${refreshKey}`} />
            <TodayFocusCard key={`tf-${refreshKey}`} />
            <ArenaSpotlightCard key={`arena-${refreshKey}`} />
            <CourseRail key={`cr-${refreshKey}`} />
            <QuickActions4 />
            <OpportunitySnapshot key={`os-${refreshKey}`} />
            <CommunityMomentCard key={`cm-${refreshKey}`} />
          </main>
        </div>

        <OnboardingDialog
          isOpen={showOnboarding}
          onComplete={completeOnboarding}
          userRole="student"
          userName={profile?.full_name || undefined}
        />
      </PullToRefresh>
    </>
  );
};

export default StudentDashboard;
