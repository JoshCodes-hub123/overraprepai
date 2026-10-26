import { useNavigate } from "react-router-dom";
import { BarChart3, Target } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { AppScreen } from "@/components/app-shell/AppScreen";
import { Button } from "@/components/ui/button";
import { GlobalRankingsView } from "@/components/student/rankings/GlobalRankingsView";

const LeaderboardPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="Global Rankings — OverraPrep AI"
        description="Compare your study streaks, quiz accuracy, and academic progress against students across universities."
      />
      <AppScreen
        back
        title="Global Rankings"
        subtitle="Compare your study streaks, quiz accuracy, and readiness score against other scholars"
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/student/analytics")}
              className="h-8 px-3 text-xs font-semibold rounded-xl hidden sm:inline-flex whitespace-nowrap shrink-0"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
              Study Analytics
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/practice")}
              className="h-8 px-3 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white whitespace-nowrap shrink-0"
            >
              <Target className="w-3.5 h-3.5 mr-1.5" />
              Practice CBT
            </Button>
          </div>
        }
      >
        <div className="max-w-5xl mx-auto pb-16">
          <GlobalRankingsView />
        </div>
      </AppScreen>
    </>
  );
};

export default LeaderboardPage;
