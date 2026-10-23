import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";

const ROLE_HOME: Record<string, string> = {
  student: "/student/dashboard",
  tutor: "/tutor/dashboard",
  admin: "/admin/dashboard",
};

/**
 * Smart dashboard entry. Sends signed-in users straight to their real home
 * screen so login never stops on a role-selection page.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    // Wait until the role actually resolves
    if (!primaryRole) return;
    navigate(ROLE_HOME[primaryRole] || "/student/dashboard", { replace: true });
  }, [user, profile, primaryRole, isLoading, navigate]);


  return (
    <>
      <SEO
        title="Your study dashboard"
        description="Your personalized OverraPrep AI dashboard: track readiness, continue courses, and resume practice sessions."
        url="/dashboard"
        noindex
      />
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Opening your dashboard…</p>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
