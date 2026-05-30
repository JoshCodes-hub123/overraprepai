import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { CompleteProfileCard } from "@/components/student/CompleteProfileCard";
import { StudyPackHero } from "@/components/student/StudyPackHero";
import HeroQuestCard from "@/components/student/dashboard/HeroQuestCard";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { ContinueLearning } from "@/components/student/ContinueLearning";
import { PickUpWhereYouLeftOff } from "@/components/student/PickUpWhereYouLeftOff";
import { TopHeader } from "@/components/student/dashboard/TopHeader";
import { TokenBalanceCard } from "@/components/student/dashboard/TokenBalanceCard";
import { QuickActionsGrid } from "@/components/student/dashboard/QuickActionsGrid";
import { KeyFeaturesStrip } from "@/components/student/dashboard/KeyFeaturesStrip";
import { OpportunityHubPreview } from "@/components/student/dashboard/OpportunityHubPreview";
import { StudentSpotlight } from "@/components/student/dashboard/StudentSpotlight";
import { ExamCountdownCard } from "@/components/student/dashboard/ExamCountdownCard";
import { CourseQuizzesSection } from "@/components/student/dashboard/CourseQuizzesSection";
import { ExploreFeaturesGrid } from "@/components/student/dashboard/ExploreFeaturesGrid";
import { OpportunityTicker } from "@/components/opportunities/OpportunityTicker";

// Warm likely-next route bundles when the dashboard mounts.
if (typeof window !== "undefined") prefetchDashboardNeighbors();

/**
 * Student dashboard — composed of self-loading sections. Each section
 * shows its own skeleton/empty state, so the page paints instantly even
 * for brand-new accounts or when an individual query fails silently.
 */
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteHotkey(setPaletteOpen);

  // Bounce unauthenticated visitors to the sign-in page.
  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Pull-to-refresh just bumps a key so child sections remount and re-fetch.
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = async () => {
    setRefreshKey((k) => k + 1);
    await new Promise((r) => setTimeout(r, 350));
  };

  const university = (profile as any)?.university || "FUTA";

  return (
    <>
      <SEO
        title="Student Dashboard"
        description="Your academic home — Study Pack AI, practice, and progress in one calm view."
        noindex={true}
        url="https://overraprep.com/student/dashboard"
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PullToRefresh onRefresh={onRefresh}>
        <div className="min-h-screen bg-background pb-24 md:pb-12">
          <main className="container mx-auto px-4 pt-5 sm:pt-7 max-w-3xl">
            <DashboardOfflineBanner onReattempt={onRefresh} />

            {/* 1. Greeting + streak + bell + avatar */}
            <TopHeader key={`top-${refreshKey}`} />

            {/* Token wallet hero — pinned to the very top */}
            <TokenBalanceCard />

            {/* 2. Hero — Study Pack AI (single intelligent entry point) */}
            <StudyPackHero />

            {/* 7-Day Hero Quest — daily momentum loop */}
            <HeroQuestCard />

            {/* Exam countdown — only renders when an active exam goal exists */}
            <ExamCountdownCard />

            {/* Quizzes grouped by the courses the student picked */}
            <CourseQuizzesSection key={`cq-${refreshKey}`} />

            {/* Pick up where you left off — unfinished audio / quiz */}
            <PickUpWhereYouLeftOff key={`pickup-${refreshKey}`} />

            {/* Key features spotlight — Overra AI, Study Hub, Theory Prep */}
            <KeyFeaturesStrip />

            {/* Every launch-critical feature, one tap away */}
            <ExploreFeaturesGrid />

            {/* 3. Quick actions — calm tiles */}
            <QuickActionsGrid />

            {/* 4. Continue learning — recent courses & study packs */}
            <ContinueLearning key={`cl-${refreshKey}`} />

            {/* 5. Profile completion nudge (only when needed) */}
            <CompleteProfileCard profile={profile} />

            {/* 6. Opportunity Hub (preview, scoped per-university) */}
            <OpportunityHubPreview key={`op-${refreshKey}`} university={university} />

            {/* 7. Student spotlight */}
            <StudentSpotlight key={`sp-${refreshKey}`} university={university} />
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
