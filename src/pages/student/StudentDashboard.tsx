import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { prefetchDashboardNeighbors } from "@/lib/routePrefetch";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import HeroQuestCard from "@/components/student/dashboard/HeroQuestCard";
import { CommandPalette, useCommandPaletteHotkey } from "@/components/student/CommandPalette";
import { TopHeader } from "@/components/student/dashboard/TopHeader";
import { TodayCard } from "@/components/student/dashboard/TodayCard";
import { SolutionHub } from "@/components/student/dashboard/SolutionHub";
import { CourseQuizzesSection } from "@/components/student/dashboard/CourseQuizzesSection";

// Warm likely-next route bundles when the dashboard mounts.
if (typeof window !== "undefined") prefetchDashboardNeighbors();

/**
 * Student dashboard — slim "one screen, one job" Home.
 * Five blocks only. Everything else lives in Study / Practice / People / Me hubs.
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
        description="Your academic home — your next step, your wallet, and your daily quest in one calm view."
        noindex={true}
        url="https://overraprep.com/student/dashboard"
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <PullToRefresh onRefresh={onRefresh}>
        <div className="min-h-screen bg-background pb-24 md:pb-12">
          <main className="container mx-auto px-4 pt-5 sm:pt-7 max-w-2xl">
            <DashboardOfflineBanner onReattempt={onRefresh} />

            {/* 1. Greeting + streak + bell */}
            <TopHeader key={`top-${refreshKey}`} />

            {/* 2. Solution Hub — Quizzes, AI Summary, AI Tutor (HERO) */}
            <SolutionHub />

            {/* 3. Quizzes from your courses — students came here for this */}
            <CourseQuizzesSection key={`cq-${refreshKey}`} />

            {/* 4. Wallet */}
            <TokenBalanceCard />

            {/* 5. Today — single primary CTA */}
            <TodayCard key={`today-${refreshKey}`} />

            {/* 6. 7-day hero quest — daily habit loop */}
            <HeroQuestCard />

            {/* 7. Exam countdown — only renders when an active goal exists */}
            <ExamCountdownCard />
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
