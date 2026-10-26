import { useNavigate } from "react-router-dom";
import { Trophy, Target, BookOpen } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { StudyAnalyticsDashboard } from "@/components/student/analytics/StudyAnalyticsDashboard";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

export default function StudyAnalytics() {
  const navigate = useNavigate();
  const { preferences } = useDashboardPreferences();

  return (
    <>
      <SEO
        title="Study Analytics — OverraPrep AI"
        description="Track your academic performance progress over time, quiz accuracy trends, and daily study streaks."
        noindex
      />

      <AppScreen
        back
        title="Study Analytics"
        subtitle="Performance progress over time, quiz accuracy trends, and daily study streaks"
        right={
          <div className="flex items-center gap-2">
            {preferences.showGlobalRankings && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/leaderboard")}
                className="h-8 px-3 text-xs font-semibold rounded-xl hidden sm:inline-flex whitespace-nowrap shrink-0"
              >
                <Trophy className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Global Rankings
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/student/mastery")}
              className="h-8 px-3 text-xs font-semibold rounded-xl hidden md:inline-flex whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Weak-Area Diagnostics
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/practice")}
              className="h-8 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 whitespace-nowrap shrink-0"
            >
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Practice CBT
            </Button>
          </div>
        }
      >
        <div className="max-w-6xl mx-auto pb-16">
          <StudyAnalyticsDashboard />
        </div>
      </AppScreen>
    </>
  );
}
