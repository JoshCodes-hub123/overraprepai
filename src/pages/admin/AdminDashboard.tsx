import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  LogOut,
  Users,
  GraduationCap,
  FileText,
  Settings,
  BarChart3,
  TrendingUp,
  Coins,
  Brain,
  Banknote,
  Shield,
  Target,
  BookOpen,
  Building2,
  Activity,
  Megaphone,
  Upload,
  Search,
  Command,
  AlignJustify,
  Rows,
  Sparkles,
  ChevronRight,
  Bell,
  RefreshCw,
  ExternalLink,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
} from "lucide-react";
import logo from "@/assets/logo.png";
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
import { SuggestOpportunityDialog } from "@/components/opportunities/SuggestOpportunityDialog";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { scopeCourseQuery, scopeEmbeddedCourseQuery } from "@/lib/environmentScope";
import { EnvironmentSwitcher } from "@/components/admin/EnvironmentSwitcher";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import { RoleSidebarMenu } from "@/components/layout/RoleSidebarMenu";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

interface SubTabDef {
  id: string;
  label: string;
  icon: any;
  description: string;
  getBadge?: (stats: DashboardStats) => number | undefined;
}

interface DomainDef {
  id: "analytics" | "users" | "finance" | "academic";
  label: string;
  shortLabel: string;
  icon: any;
  subTabs: SubTabDef[];
  getBadgeCount: (stats: DashboardStats) => number;
}

const DOMAINS: DomainDef[] = [
  {
    id: "analytics",
    label: "Governance & Analytics",
    shortLabel: "Analytics",
    icon: BarChart3,
    subTabs: [
      { id: "overview", label: "Executive Analytics", description: "Real-time student metrics, quiz engagement, top courses", icon: BarChart3 },
      { id: "insights", label: "AI Insights", description: "Predictive cohort metrics & learning trends", icon: TrendingUp },
      { id: "audit", label: "Audit Trail", description: "Cryptographic activity logs & security events", icon: Shield },
      { id: "health", label: "System Health", description: "Database integrity, API response times, uptime", icon: Activity },
    ],
    getBadgeCount: () => 0,
  },
  {
    id: "users",
    label: "Users & Community",
    shortLabel: "Users",
    icon: Users,
    subTabs: [
      { id: "users", label: "Student Directory", description: "Comprehensive roster, wallet balances & study activity", icon: Users },
      {
        id: "tutors",
        label: "Tutor Management",
        description: "Application vetting, profiles, faculty assignments",
        icon: GraduationCap,
        getBadge: (s) => (s.pendingApplications > 0 ? s.pendingApplications : undefined),
      },
      {
        id: "schools",
        label: "Institutional Partners",
        description: "School onboarding, department licenses, affiliations",
        icon: Building2,
        getBadge: (s) => (s.pendingSchools > 0 ? s.pendingSchools : undefined),
      },
      { id: "announcements", label: "Campus Broadcasts", description: "Targeted updates, exam timetables & alerts", icon: Megaphone },
    ],
    getBadgeCount: (s) => (s.pendingApplications || 0) + (s.pendingSchools || 0),
  },
  {
    id: "finance",
    label: "Finance & Treasury",
    shortLabel: "Finance",
    icon: Coins,
    subTabs: [
      {
        id: "tokens",
        label: "Token Approvals",
        description: "Verify manual bank transfers and credit student wallets",
        icon: Coins,
        getBadge: (s) => (s.pendingPurchases > 0 ? s.pendingPurchases : undefined),
      },
      {
        id: "withdrawals",
        label: "Tutor Payouts",
        description: "Disburse earnings and review settlement requests",
        icon: Banknote,
        getBadge: (s) => (s.pendingWithdrawals > 0 ? s.pendingWithdrawals : undefined),
      },
      { id: "settings", label: "Fee & Platform Settings", description: "Commission splits, token conversion rates & rules", icon: Settings },
    ],
    getBadgeCount: (s) => (s.pendingPurchases || 0) + (s.pendingWithdrawals || 0),
  },
  {
    id: "academic",
    label: "Curriculum & Moderation",
    shortLabel: "Curriculum",
    icon: BookOpen,
    subTabs: [
      { id: "courses", label: "Course Catalog", description: "Syllabi, departments, active course outlines", icon: BookOpen },
      { id: "questions", label: "Question Moderation", description: "Past question verification, latex reviews & CBT sets", icon: FileText },
      { id: "challenges", label: "Contests & Arena", description: "Timed battlegrounds, campus prizes & leaderboards", icon: Target },
    ],
    getBadgeCount: () => 0,
  },
];

const getDomainForTab = (tab: string): "analytics" | "users" | "finance" | "academic" => {
  for (const domain of DOMAINS) {
    if (domain.subTabs.some((t) => t.id === tab)) {
      return domain.id;
    }
  }
  return "analytics";
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [triageDrawerOpen, setTriageDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dynamic table density toggle: Comfortable vs Compact
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    try {
      return (localStorage.getItem("admin_table_density") as any) || "comfortable";
    } catch {
      return "comfortable";
    }
  });

  const adminEnv = useAdminEnvironment();

  const currentDomain = useMemo(() => getDomainForTab(activeTab), [activeTab]);
  const activeDomainDef = useMemo(
    () => DOMAINS.find((c) => c.id === currentDomain) || DOMAINS[0],
    [currentDomain]
  );
  const activeTabDef = useMemo(
    () => activeDomainDef.subTabs.find((t) => t.id === activeTab) || activeDomainDef.subTabs[0],
    [activeDomainDef, activeTab]
  );

  const totalPendingActionItems =
    stats.pendingPurchases +
    stats.pendingApplications +
    stats.pendingWithdrawals +
    stats.pendingSchools;

  // Sync tab with URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleDomainClick = (domainId: "analytics" | "users" | "finance" | "academic") => {
    const domain = DOMAINS.find((c) => c.id === domainId);
    if (domain && domain.subTabs.length > 0) {
      if (!domain.subTabs.some((t) => t.id === activeTab)) {
        handleTabChange(domain.subTabs[0].id);
      }
    }
  };

  const handleDensityToggle = () => {
    const nextDensity = density === "comfortable" ? "compact" : "comfortable";
    setDensity(nextDensity);
    try {
      localStorage.setItem("admin_table_density", nextDensity);
    } catch {
      // ignore
    }
  };

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
      const scopeProfiles = (q: any) => {
        let out = q.eq("environment_type", envScope.environment_type);
        if (envScope.environment_type === "university" && envScope.university) {
          out = out.eq("university", envScope.university);
        }
        return out;
      };

      try {
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
        console.error("Error fetching admin stats:", error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    if (user && hasRole("admin")) {
      fetchStats();
    }
  }, [user, hasRole, refreshKey, adminEnv.scope.environment_type, adminEnv.scope.university]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
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
      <div className="min-h-screen bg-neutral-50/60 dark:bg-neutral-950 font-body text-foreground" data-density={density}>
        {/* Global Command Palette (⌘K) */}
        <AdminCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onSelectTab={handleTabChange}
        />

        {/* 1. TOP COMMAND BAR */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-15 gap-4">
              {/* Left: Brand & Breadcrumbs */}
              <div className="flex items-center gap-3 shrink-0">
                <RoleSidebarMenu role="admin" />
                <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
                  <img
                    src={logo}
                    alt="Overra"
                    className="h-8 w-auto object-contain"
                  />
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-bold text-base tracking-tight text-foreground">
                      Overra
                    </span>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900">
                      OS
                    </span>
                  </div>
                </Link>

                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground ml-2 pl-3 border-l border-border/70">
                  <span>Console</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="font-medium text-foreground">{activeDomainDef.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <span className="text-muted-foreground">{activeTabDef.label}</span>
                </div>
              </div>

              {/* Center: Command Palette Trigger */}
              <div className="flex-1 max-w-md hidden sm:block">
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted/40 text-xs text-muted-foreground transition-colors group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    <span className="truncate">Search students, tutors, courses, actions...</span>
                  </div>
                  <kbd className="inline-flex items-center gap-0.5 rounded border border-border/80 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shrink-0">
                    <Command className="w-3 h-3" />K
                  </kbd>
                </button>
              </div>

              {/* Right: Actions, Campus Switcher, Triage Badge & Profile */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Mobile Search Trigger */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setCommandPaletteOpen(true)}
                  title="Search & Command Palette (Cmd+K)"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Campus Scope Selector */}
                <EnvironmentSwitcher
                  current={adminEnv.current}
                  options={adminEnv.options}
                  onSelect={adminEnv.select}
                  className="h-8 text-xs px-2.5 rounded-lg border-border/70 bg-card hover:bg-muted/50 text-foreground"
                />

                {/* Triage / Action Center Trigger Button */}
                <Button
                  variant={totalPendingActionItems > 0 ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => setTriageDrawerOpen(true)}
                  className={`h-8 text-xs font-medium gap-1.5 rounded-lg border ${
                    totalPendingActionItems > 0
                      ? "border-amber-400/50 bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                  title="Open Action Queue"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Triage</span>
                  {totalPendingActionItems > 0 && (
                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white leading-tight">
                      {totalPendingActionItems}
                    </span>
                  )}
                </Button>

                {/* Quick Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold gap-1 rounded-lg border-border/80 bg-background hover:bg-muted/50 hidden md:inline-flex"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 text-xs font-medium">
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Platform Actions
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/bulk-upload" className="flex items-center gap-2 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Bulk Upload Questions</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/courses" className="flex items-center gap-2 cursor-pointer">
                        <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Manage Course Catalog</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/challenges" className="flex items-center gap-2 cursor-pointer">
                        <Target className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Create Contest &amp; Arena</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/broadcast" className="flex items-center gap-2 cursor-pointer">
                        <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Send Campus Broadcast</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="p-1">
                      <SuggestOpportunityDialog
                        trigger={
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-foreground hover:bg-muted rounded-md text-left transition-colors">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>Post Student Opportunity</span>
                          </button>
                        }
                      />
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Density Switcher */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDensityToggle}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title={`Toggle density: currently ${density}`}
                >
                  {density === "comfortable" ? (
                    <AlignJustify className="w-4 h-4" />
                  ) : (
                    <Rows className="w-4 h-4" />
                  )}
                </Button>

                {/* Refresh Trigger */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Refresh statistics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>

                {/* User Menu & Sign Out */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-neutral-900 text-amber-300 dark:bg-neutral-100 dark:text-neutral-900 font-bold flex items-center justify-center text-xs">
                        {profile?.full_name?.charAt(0) || "A"}
                      </div>
                      <span className="text-xs font-semibold max-w-[80px] truncate hidden xl:inline-block">
                        {profile?.full_name?.split(" ")[0] || "Admin"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 text-xs">
                    <DropdownMenuLabel>
                      <div className="font-semibold text-foreground">{profile?.full_name || "Admin"}</div>
                      <div className="text-[11px] text-muted-foreground">{user?.email}</div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile/edit" className="cursor-pointer">
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/student/dashboard" className="cursor-pointer">
                        Switch to Student View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* 2. EXECUTIVE METRIC RIBBON */}
        <section className="border-b border-border/70 bg-card/60 backdrop-blur-xs py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Metric 1: Students */}
              <button
                type="button"
                onClick={() => handleTabChange("users")}
                className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-background/80 hover:border-border hover:bg-muted/30 transition-all text-left shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Enrolled Students
                  </span>
                  <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {stats.totalStudents.toLocaleString()}
                  </span>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    Scope: {adminEnv.current.label}
                  </div>
                </div>
              </button>

              {/* Metric 2: Tutors */}
              <button
                type="button"
                onClick={() => handleTabChange("tutors")}
                className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-background/80 hover:border-border hover:bg-muted/30 transition-all text-left shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Verified Tutors
                  </span>
                  <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {stats.totalTutors.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] truncate mt-0.5">
                    {stats.pendingApplications > 0 ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {stats.pendingApplications} awaiting review
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Applications up to date</span>
                    )}
                  </div>
                </div>
              </button>

              {/* Metric 3: Academic Content */}
              <button
                type="button"
                onClick={() => handleTabChange("questions")}
                className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-background/80 hover:border-border hover:bg-muted/30 transition-all text-left shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Question Bank
                  </span>
                  <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {stats.totalQuestions.toLocaleString()}
                  </span>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {stats.totalCourses} courses · {stats.totalQuizAttempts.toLocaleString()} CBT attempts
                  </div>
                </div>
              </button>

              {/* Metric 4: Platform Treasury */}
              <button
                type="button"
                onClick={() => handleTabChange("tokens")}
                className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-background/80 hover:border-border hover:bg-muted/30 transition-all text-left shadow-2xs"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Platform Revenue
                  </span>
                  <Coins className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                    {stats.platformRevenue.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] truncate mt-0.5">
                    {stats.pendingPurchases > 0 ? (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        {stats.pendingPurchases} token receipts pending
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Token settlements cleared</span>
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. WORKSPACE DOMAIN & SUB-TAB NAVIGATION */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="space-y-4 mb-6">
            {/* Top Domain Segment Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Primary 4 Domains */}
              <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border/70 w-full sm:w-auto overflow-x-auto no-scrollbar">
                {DOMAINS.map((domain) => {
                  const Icon = domain.icon;
                  const isCurrent = currentDomain === domain.id;
                  const badgeCount = domain.getBadgeCount(stats);

                  return (
                    <button
                      key={domain.id}
                      onClick={() => handleDomainClick(domain.id)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                        isCurrent
                          ? "bg-background text-foreground shadow-2xs border border-border/70"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-amber-500" : "text-muted-foreground"}`} />
                      <span>{domain.label}</span>
                      {badgeCount > 0 && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fast Jump Shortcut Prompt */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
                <span>Jump with</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border/70 rounded shadow-2xs">⌘K</kbd>
                <span>or toggle views below</span>
              </div>
            </div>

            {/* Sub-Tab Strip for the active Domain */}
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 flex-wrap">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {activeDomainDef.subTabs.map((subTab) => {
                  const SubIcon = subTab.icon;
                  const isActive = activeTab === subTab.id;
                  const badgeVal = subTab.getBadge?.(stats);

                  return (
                    <button
                      key={subTab.id}
                      onClick={() => handleTabChange(subTab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0 border ${
                        isActive
                          ? "bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950 font-semibold border-transparent shadow-xs"
                          : "bg-background text-muted-foreground border-border/70 hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      <SubIcon className="w-3.5 h-3.5" />
                      <span>{subTab.label}</span>
                      {badgeVal && badgeVal > 0 ? (
                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? "bg-amber-400 text-neutral-950"
                            : "bg-amber-500 text-white"
                        }`}>
                          {badgeVal}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* View Descriptor */}
              <div className="text-xs text-muted-foreground hidden sm:block truncate">
                {activeTabDef.description}
              </div>
            </div>
          </div>

          {/* 4. TAB CONTENTS */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            {/* 1. Governance & Analytics */}
            <TabsContent value="overview" className="outline-hidden m-0">
              <PlatformAnalytics />
            </TabsContent>

            <TabsContent value="insights" className="outline-hidden m-0">
              <AdminInsights />
            </TabsContent>

            <TabsContent value="audit" className="outline-hidden m-0">
              <AuditLogs />
            </TabsContent>

            <TabsContent value="health" className="outline-hidden m-0">
              <HealthDashboard />
            </TabsContent>

            {/* 2. Users & Operations */}
            <TabsContent value="users" className="outline-hidden m-0">
              <UserDirectory scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="tutors" className="outline-hidden m-0">
              <TutorManagement />
            </TabsContent>

            <TabsContent value="schools" className="outline-hidden m-0">
              <SchoolApplicationsTab />
            </TabsContent>

            <TabsContent value="announcements" className="outline-hidden m-0">
              <AnnouncementsManagement />
            </TabsContent>

            {/* 3. Finance & Treasury */}
            <TabsContent value="tokens" className="outline-hidden m-0">
              <TokenPurchaseManagement />
            </TabsContent>

            <TabsContent value="withdrawals" className="outline-hidden m-0">
              <WithdrawalManagement />
            </TabsContent>

            <TabsContent value="settings" className="outline-hidden m-0">
              <PlatformSettings />
            </TabsContent>

            {/* 4. Curriculum & Moderation */}
            <TabsContent value="courses" className="outline-hidden m-0">
              <CourseModeration scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="questions" className="outline-hidden m-0">
              <QuestionModeration scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="challenges" className="outline-hidden m-0">
              <ChallengeManagement />
            </TabsContent>
          </Tabs>
        </main>

        {/* 5. QUICK TRIAGE DRAWER (ACTION CENTER) */}
        <Sheet open={triageDrawerOpen} onOpenChange={setTriageDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md font-body">
            <SheetHeader className="border-b border-border/70 pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle className="font-display text-lg font-bold">
                  Operational Triage Queue
                </SheetTitle>
              </div>
              <SheetDescription className="text-xs">
                Items requiring immediate administrator action and clearance across {adminEnv.current.label}.
              </SheetDescription>
            </SheetHeader>

            <div className="py-4 space-y-3">
              {/* Task 1: Token Purchases */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-xs text-foreground">Token Purchases</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                    stats.pendingPurchases > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {stats.pendingPurchases} Pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Students uploaded manual payment proof for AI tokens.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTriageDrawerOpen(false);
                    handleTabChange("tokens");
                  }}
                  className="w-full text-xs h-8 justify-between"
                >
                  <span>Review Payment Receipts</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Task 2: Tutor Applications */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-violet-500" />
                    <span className="font-semibold text-xs text-foreground">Tutor Applications</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                    stats.pendingApplications > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {stats.pendingApplications} Pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Undergraduate &amp; postgraduate tutors submitted verification credentials.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTriageDrawerOpen(false);
                    handleTabChange("tutors");
                  }}
                  className="w-full text-xs h-8 justify-between"
                >
                  <span>Review Tutor Dossiers</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Task 3: Tutor Withdrawals */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <span className="font-semibold text-xs text-foreground">Tutor Withdrawals</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                    stats.pendingWithdrawals > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {stats.pendingWithdrawals} Pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Tutor earnings settlement requests awaiting bank disbursement.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTriageDrawerOpen(false);
                    handleTabChange("withdrawals");
                  }}
                  className="w-full text-xs h-8 justify-between"
                >
                  <span>Process Settlements</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Task 4: School Applications */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span className="font-semibold text-xs text-foreground">Institutional Applications</span>
                  </div>
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full ${
                    stats.pendingSchools > 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {stats.pendingSchools} Pending
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Schools and departments requesting institutional portal access.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTriageDrawerOpen(false);
                    handleTabChange("schools");
                  }}
                  className="w-full text-xs h-8 justify-between"
                >
                  <span>Review School Applications</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </PullToRefresh>
  );
};

export default AdminDashboard;