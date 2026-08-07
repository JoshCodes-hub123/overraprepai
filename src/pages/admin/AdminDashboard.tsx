import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LogOut,
  Users,
  GraduationCap,
  FileText,
  Settings,
  BarChart3,
  Loader2,
  TrendingUp,
  Coins,
  Brain,
  Wallet,
  Banknote,
  Shield,
  Target,
  BookOpen,
  Building2,
  Activity,
  Megaphone,
  Upload,
} from "lucide-react";
import logo from "@/assets/logo.png";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { TutorManagement } from "@/components/admin/TutorManagement";
import { CourseModeration } from "@/components/admin/CourseModeration";
import { QuestionModeration } from "@/components/admin/QuestionModeration";
import { PlatformSettings } from "@/components/admin/PlatformSettings";
import { PlatformAnalytics } from "@/components/admin/PlatformAnalytics";
import { TokenPurchaseManagement } from "@/components/admin/TokenPurchaseManagement";
import { UserDirectory } from "@/components/admin/UserDirectory";
import { WithdrawalManagement } from "@/components/admin/WithdrawalManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { HealthDashboard } from "@/components/admin/HealthDashboard";
import { ChallengeManagement } from "@/components/admin/ChallengeManagement";
import { AdminInsights } from "@/components/admin/AdminInsights";
import { AnnouncementsManagement } from "@/components/admin/AnnouncementsManagement";
import SchoolApplicationsTab from "@/pages/admin/SchoolApplications";
import { SkeletonDashboard } from "@/components/ui/premium-skeletons";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { SuggestOpportunityDialog } from "@/components/opportunities/SuggestOpportunityDialog";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import AdminKpiStrip from "@/components/admin/AdminKpiStrip";
import { scopeCourseQuery, scopeEmbeddedCourseQuery } from "@/lib/environmentScope";
import { EnvironmentSwitcher } from "@/components/admin/EnvironmentSwitcher";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { RoleSidebarMenu } from "@/components/layout/RoleSidebarMenu";

interface DashboardStats {
  totalStudents: number;
  totalTutors: number;
  totalCourses: number;
  totalQuestions: number;
  totalQuizAttempts: number;
  pendingApplications: number;
  pendingPurchases: number;
  pendingWithdrawals: number;
  pendingSchools: number;
  totalRevenue: number;
  platformRevenue: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTutors: 0,
    totalCourses: 0,
    totalQuestions: 0,
    totalQuizAttempts: 0,
    pendingApplications: 0,
    pendingPurchases: 0,
    pendingWithdrawals: 0,
    pendingSchools: 0,
    totalRevenue: 0,
    platformRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const adminEnv = useAdminEnvironment();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate, hasRole]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !hasRole("admin")) return;

      const envScope = adminEnv.scope;
      // Profiles carry the environment on themselves (no course relation).
      const scopeProfiles = (q: any) => {
        let out = q.eq("environment_type", envScope.environment_type);
        if (envScope.environment_type === "university" && envScope.university) {
          out = out.eq("university", envScope.university);
        }
        return out;
      };

      try {
        // Fetch all counts in parallel
        const [
          studentsResult,
          tutorsResult,
          coursesResult,
          questionsResult,
          attemptsResult,
          applicationsResult,
          purchasesResult,
          withdrawalsResult,
          commissionResult,
          schoolsResult,
        ] = await Promise.all([
          scopeProfiles(
            supabase.from("profiles").select("*", { count: "exact", head: true }),
          ),
          supabase
            .from("user_roles")
            .select("*", { count: "exact", head: true })
            .eq("role", "tutor"),
          scopeCourseQuery(
            supabase.from("courses").select("*", { count: "exact", head: true }),
            envScope,
          ),
          scopeEmbeddedCourseQuery(
            supabase
              .from("questions")
              .select("*, courses!inner(environment_type, university)", { count: "exact", head: true }),
            envScope,
          ),
          scopeEmbeddedCourseQuery(
            supabase
              .from("quiz_attempts")
              .select("*, quizzes!inner(courses!inner(environment_type, university))", {
                count: "exact",
                head: true,
              }),
            envScope,
            "quizzes.courses",
          ),
          supabase
            .from("tutor_applications")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("token_purchase_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("withdrawal_requests")
            .select("*", { count: "exact", head: true })
            .in("status", ["pending", "approved"]),
          supabase
            .from("platform_settings")
            .select("value")
            .eq("key", "tutor_commission_rate")
            .single(),
          supabase
            .from("schools")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
        ]);

        // Calculate revenue from premium quiz attempts
        const { data: premiumQuizzes } = await scopeEmbeddedCourseQuery(
          supabase
            .from("quizzes")
            .select("id, token_cost, courses!inner(environment_type, university)")
            .eq("is_premium", true),
          envScope,
        );

        let totalRevenue = 0;
        if (premiumQuizzes) {
          for (const quiz of premiumQuizzes) {
            const { count } = await supabase
              .from("quiz_attempts")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);
            totalRevenue += (count || 0) * quiz.token_cost;
          }
        }

        const commissionRate = parseInt(commissionResult.data?.value || "80");
        const platformRevenue = Math.round(totalRevenue * ((100 - commissionRate) / 100));

        setStats({
          totalStudents: studentsResult.count || 0,
          totalTutors: tutorsResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          totalQuizAttempts: attemptsResult.count || 0,
          pendingApplications: applicationsResult.count || 0,
          pendingPurchases: purchasesResult.count || 0,
          pendingWithdrawals: withdrawalsResult.count || 0,
          pendingSchools: schoolsResult.count || 0,
          totalRevenue,
          platformRevenue,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user && hasRole("admin")) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasRole, refreshKey, adminEnv.scope.environment_type, adminEnv.scope.university]);

  const handleRefresh = async () => {
    setRefreshKey((k) => k + 1);
    await new Promise((r) => setTimeout(r, 500));
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <RoleSidebarMenu role="admin" />
              <Link to="/" className="flex items-center group">
                <img 
                  src={logo} 
                  alt="OverraPrep AI FUTA" 
                  className="h-10 w-auto object-contain"
                />
              </Link>
            </div>



            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <DashboardNav role="admin" />
      <DashboardBreadcrumb role="admin" />

      <main className="container mx-auto px-4 py-8">
        {/* Academic environment — admins manage one isolated environment at a time */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Managing environment
            </p>
            <p className="text-sm font-bold truncate">
              {adminEnv.isJamb
                ? "JAMB / UTME — separate from all university content"
                : `${adminEnv.current.label} — isolated campus environment`}
            </p>
          </div>
          <EnvironmentSwitcher
            current={adminEnv.current}
            options={adminEnv.options}
            onSelect={adminEnv.select}
          />
        </div>

        {/* Hero */}
        <DashboardHero
          role="admin"
          fullName={profile?.full_name || "Admin"}
          avatarUrl={profile?.avatar_url}
          subtitle="Steward the platform — review tutors, moderate content, and watch the empire grow."
          actions={
            <SuggestOpportunityDialog
              trigger={
                <button className="inline-flex items-center gap-1.5 rounded-full bg-white text-amber-700 hover:bg-amber-50 shadow-md font-semibold text-sm px-4 py-2">
                  + Post opportunity
                </button>
              }
            />
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-muted-foreground">All systems operational</span>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">Platform revenue</span>
                <span className="font-serif text-lg font-semibold text-foreground">{stats.platformRevenue}</span>
              </div>
            </div>
          }
          className="mb-6"
        />

        <AdminKpiStrip />

        {/* Premium Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <PremiumStatCard
            icon={Users}
            label="Students"
            value={stats.totalStudents}
            tone="sapphire"
            delay={0}
          />
          <PremiumStatCard
            icon={GraduationCap}
            label="Tutors"
            value={stats.totalTutors}
            tone="violet"
            delay={0.05}
          />
          <PremiumStatCard
            icon={Brain}
            label="Quiz attempts"
            value={stats.totalQuizAttempts}
            tone="emerald"
            delay={0.1}
          />
          <PremiumStatCard
            icon={Coins}
            label="Platform revenue"
            value={stats.platformRevenue}
            tone="gold"
            hint="tokens earned"
            delay={0.15}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions
          subtitle="Triage the platform from one place"
          actions={[
            {
              icon: FileText,
              label: "Review Reports",
              description: "Inspect flagged questions & content reports",
              onClick: () => setActiveTab("questions"),
              tone: "rose",
              badge: stats.pendingPurchases > 0 ? stats.pendingPurchases : undefined,
            },
            {
              icon: GraduationCap,
              label: "Approve Tutors",
              description: "Review pending tutor applications",
              onClick: () => setActiveTab("tutors"),
              tone: "violet",
              badge: stats.pendingApplications > 0 ? stats.pendingApplications : undefined,
            },
            {
              icon: Building2,
              label: "Manage Schools",
              description: "Approve and oversee school accounts",
              onClick: () => setActiveTab("schools"),
              tone: "emerald",
              badge: stats.pendingSchools > 0 ? stats.pendingSchools : undefined,
            },
            {
              icon: FileText,
              label: "Manage Courses",
              description: "Create & edit courses",
              to: "/admin/courses",
              tone: "sapphire",
            },
            {
              icon: Target,
              label: "Challenge Arena",
              description: "Create competitions & settle prizes",
              to: "/admin/arena",
              tone: "violet",
            },
            {
              icon: Upload,
              label: "Bulk Upload Questions",
              description: "Import Excel / CSV / Word question banks",
              to: "/admin/bulk-upload",
              tone: "gold",
            },
            {
              icon: Target,
              label: "Growth Engine",
              description: "Battles, ambassadors & analytics",
              to: "/admin/growth",
              tone: "violet",
            },
          ]}
        />

        {stats.pendingApplications > 0 && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-accent" />
              <div>
                <p className="font-medium text-foreground">
                  {stats.pendingApplications} pending tutor application{stats.pendingApplications > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">Review and approve new tutors</p>
              </div>
            </div>
            <Button variant="accent" onClick={() => setActiveTab("tutors")}>
              Review Now
            </Button>
          </div>
        )}

        {stats.pendingSchools > 0 && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {stats.pendingSchools} pending school application{stats.pendingSchools > 1 ? "s" : ""}
                </p>
                <p className="text-sm text-muted-foreground">Review and approve new schools</p>
              </div>
            </div>
            <Button onClick={() => navigate("/admin/schools")}>
              Review Now
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="mb-6 inline-flex w-max md:w-auto md:flex-wrap">
              <TabsTrigger value="overview" className="flex items-center gap-2 text-xs md:text-sm">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-2 text-xs md:text-sm">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Insights</span>
                <span className="sm:hidden">📈</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 text-xs md:text-sm">
                <Users className="w-4 h-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="tutors" className="flex items-center gap-2 text-xs md:text-sm">
                <GraduationCap className="w-4 h-4" />
                Tutors
              </TabsTrigger>
              <TabsTrigger value="tokens" className="flex items-center gap-2 text-xs md:text-sm">
                <Coins className="w-4 h-4" />
                Tokens {stats.pendingPurchases > 0 && `(${stats.pendingPurchases})`}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2 text-xs md:text-sm">
                <Banknote className="w-4 h-4" />
                <span className="hidden sm:inline">Withdrawals</span>
                <span className="sm:hidden">Payouts</span>
                {stats.pendingWithdrawals > 0 && ` (${stats.pendingWithdrawals})`}
              </TabsTrigger>
              <TabsTrigger value="courses" className="flex items-center gap-2 text-xs md:text-sm">
                <BookOpen className="w-4 h-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="questions" className="flex items-center gap-2 text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Questions</span>
                <span className="sm:hidden">Q&A</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2 text-xs md:text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden">⚙️</span>
              </TabsTrigger>
              <TabsTrigger value="schools" className="flex items-center gap-2 text-xs md:text-sm">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Schools</span>
                <span className="sm:hidden">Sch</span>
                {stats.pendingSchools > 0 && ` (${stats.pendingSchools})`}
              </TabsTrigger>
              <TabsTrigger value="challenges" className="flex items-center gap-2 text-xs md:text-sm">
                <Target className="w-4 h-4" />
                <span className="hidden sm:inline">Challenges</span>
                <span className="sm:hidden">🏆</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center gap-2 text-xs md:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Audit Logs</span>
                <span className="sm:hidden">Logs</span>
              </TabsTrigger>
              <TabsTrigger value="health" className="flex items-center gap-2 text-xs md:text-sm">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Health</span>
                <span className="sm:hidden">❤</span>
              </TabsTrigger>
              <TabsTrigger value="announcements" className="flex items-center gap-2 text-xs md:text-sm">
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline">Announce</span>
                <span className="sm:hidden">📣</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview">
            <PlatformAnalytics />
          </TabsContent>

          <TabsContent value="insights">
            <AdminInsights />
          </TabsContent>

          <TabsContent value="users">
            <UserDirectory scope={adminEnv.scope} />
          </TabsContent>

          <TabsContent value="tutors">
            <TutorManagement />
          </TabsContent>

          <TabsContent value="tokens">
            <TokenPurchaseManagement />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalManagement />
          </TabsContent>

          <TabsContent value="courses">
            <CourseModeration scope={adminEnv.scope} />
          </TabsContent>

          <TabsContent value="questions">
            <QuestionModeration scope={adminEnv.scope} />
          </TabsContent>

          <TabsContent value="settings">
            <PlatformSettings />
          </TabsContent>

          <TabsContent value="challenges">
            <ChallengeManagement />
          </TabsContent>

          <TabsContent value="schools">
            <SchoolApplicationsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>

          <TabsContent value="health">
            <HealthDashboard />
          </TabsContent>

          <TabsContent value="announcements">
            <AnnouncementsManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
    </PullToRefresh>
  );
};

export default AdminDashboard;