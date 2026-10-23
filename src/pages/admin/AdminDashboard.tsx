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
import { AdminPersistentHeader } from "@/components/admin/AdminPersistentHeader";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminActionCenter } from "@/components/admin/AdminActionCenter";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  getBadge?: (stats: DashboardStats) => number | undefined;
}

interface CategoryDef {
  id: "analytics" | "users" | "finance" | "academic";
  label: string;
  icon: any;
  subTabs: SubTabDef[];
  getBadgeCount: (stats: DashboardStats) => number;
}

const CATEGORIES: CategoryDef[] = [
  {
    id: "analytics",
    label: "📊 Overview & Analytics",
    icon: BarChart3,
    subTabs: [
      { id: "overview", label: "Analytics", icon: BarChart3 },
      { id: "insights", label: "Insights", icon: TrendingUp },
      { id: "audit", label: "Audit Logs", icon: Shield },
      { id: "health", label: "System Health", icon: Activity },
    ],
    getBadgeCount: () => 0,
  },
  {
    id: "users",
    label: "👥 Users & Operations",
    icon: Users,
    subTabs: [
      { id: "users", label: "Student Directory", icon: Users },
      {
        id: "tutors",
        label: "Tutor Management",
        icon: GraduationCap,
        getBadge: (s) => (s.pendingApplications > 0 ? s.pendingApplications : undefined),
      },
      {
        id: "schools",
        label: "School Applications",
        icon: Building2,
        getBadge: (s) => (s.pendingSchools > 0 ? s.pendingSchools : undefined),
      },
      { id: "announcements", label: "Announcements", icon: Megaphone },
    ],
    getBadgeCount: (s) => (s.pendingApplications || 0) + (s.pendingSchools || 0),
  },
  {
    id: "finance",
    label: "💳 Finance & Monetization",
    icon: Coins,
    subTabs: [
      {
        id: "tokens",
        label: "Token Approvals",
        icon: Coins,
        getBadge: (s) => (s.pendingPurchases > 0 ? s.pendingPurchases : undefined),
      },
      {
        id: "withdrawals",
        label: "Tutor Withdrawals",
        icon: Banknote,
        getBadge: (s) => (s.pendingWithdrawals > 0 ? s.pendingWithdrawals : undefined),
      },
      { id: "settings", label: "Platform Settings", icon: Settings },
    ],
    getBadgeCount: (s) => (s.pendingPurchases || 0) + (s.pendingWithdrawals || 0),
  },
  {
    id: "academic",
    label: "📚 Academic & Moderation",
    icon: BookOpen,
    subTabs: [
      { id: "courses", label: "Course Moderation", icon: BookOpen },
      { id: "questions", label: "Question Moderation", icon: FileText },
      { id: "challenges", label: "Contests & Challenges", icon: Target },
    ],
    getBadgeCount: () => 0,
  },
];

const getCategoryForTab = (tab: string): "analytics" | "users" | "finance" | "academic" => {
  for (const cat of CATEGORIES) {
    if (cat.subTabs.some((t) => t.id === tab)) {
      return cat.id;
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
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
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

  // Active Category derived automatically from activeTab
  const currentCategory = useMemo(() => getCategoryForTab(activeTab), [activeTab]);
  const activeCategoryDef = useMemo(
    () => CATEGORIES.find((c) => c.id === currentCategory) || CATEGORIES[0],
    [currentCategory]
  );

  // Sync tab with URL query params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleCategoryClick = (catId: "analytics" | "users" | "finance" | "academic") => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat && cat.subTabs.length > 0) {
      if (!cat.subTabs.some((t) => t.id === activeTab)) {
        handleTabChange(cat.subTabs[0].id);
      }
    }
  };

  const handleDensityChange = (newDensity: "comfortable" | "compact") => {
    setDensity(newDensity);
    try {
      localStorage.setItem("admin_table_density", newDensity);
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
      <div className="min-h-screen bg-background" data-density={density}>
        {/* Global Command Palette Modal */}
        <AdminCommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          onSelectTab={handleTabChange}
        />

        {/* Glassmorphic Sticky Header */}
        <header className="bg-card/85 backdrop-blur-md border-b border-border/80 sticky top-0 z-50 shadow-xs">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16 gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                <RoleSidebarMenu role="admin" />
                <Link to="/" className="flex items-center group">
                  <img
                    src={logo}
                    alt="OverraPrep AI FUTA"
                    className="h-9 w-auto object-contain"
                  />
                </Link>
                <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold text-amber-700 bg-amber-50/70 border-amber-200">
                  Admin Console
                </Badge>
              </div>

              {/* Command Palette Trigger Button */}
              <div className="flex-1 max-w-xs md:max-w-md mx-2 hidden sm:block">
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
                    <span className="truncate">Search actions, users, courses…</span>
                  </div>
                  <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground shadow-2xs shrink-0">
                    <Command className="w-3 h-3" />K
                  </kbd>
                </button>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden h-8 w-8 rounded-lg"
                  onClick={() => setCommandPaletteOpen(true)}
                  title="Search & Command Palette (Cmd+K)"
                >
                  <Search className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <DashboardNav role="admin" />
        <DashboardBreadcrumb role="admin" />

        <main className="container mx-auto px-4 py-6">
          {/* Compact Sticky Action Center Bar (Replaces old stacked alert banners) */}
          <AdminActionCenter
            stats={{
              pendingPurchases: stats.pendingPurchases,
              pendingApplications: stats.pendingApplications,
              pendingSchools: stats.pendingSchools,
              pendingQuestions: 0,
            }}
            onSelectTab={handleTabChange}
          />

          {/* Persistent Academic Environment Bar */}
          <AdminPersistentHeader showNavStrip={true} />

          {/* Dashboard Hero */}
          <DashboardHero
            role="admin"
            fullName={profile?.full_name || "Admin"}
            avatarUrl={profile?.avatar_url}
            subtitle="Steward the platform — review tutors, moderate content, and oversee the institutional network."
            actions={
              <SuggestOpportunityDialog
                trigger={
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-white text-amber-700 hover:bg-amber-50 shadow-sm font-semibold text-sm px-4 py-2 border border-amber-200/60">
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
                  <span className="text-muted-foreground">Platform revenue:</span>
                  <span className="font-serif text-lg font-semibold text-foreground">{stats.platformRevenue} tokens</span>
                </div>
              </div>
            }
            className="mb-6"
          />

          <AdminKpiStrip />

          {/* Premium Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
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

          {/* Quick Actions Shortcuts */}
          <QuickActions
            subtitle="Triage the platform from one place"
            actions={[
              {
                icon: BookOpen,
                label: "Content & Syllabi Portal",
                description: "Outlines, lecture notes & CBT sets",
                to: "/admin/content",
                tone: "gold",
              },
              {
                icon: Upload,
                label: "Bulk Upload Questions",
                description: "Import Excel / CSV question banks",
                to: "/admin/bulk-upload",
                tone: "emerald",
              },
              {
                icon: Target,
                label: "Challenge Arena",
                description: "Competitions & prizes",
                to: "/admin/arena",
                tone: "violet",
              },
              {
                icon: TrendingUp,
                label: "Growth Engine",
                description: "Battles & campus cohorts",
                to: "/admin/growth",
                tone: "sapphire",
              },
            ]}
          />

          {/* Grouped Category Navigation & Density Controls */}
          <div className="mb-6 space-y-3">
            {/* Top Bar: 4 Clean Collapsed Workspace Categories */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-1.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md shadow-xs">
              {/* Category Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isCatActive = currentCategory === cat.id;
                  const badgeCount = cat.getBadgeCount(stats);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                        isCatActive
                          ? "bg-amber-500/10 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700 shadow-xs"
                          : "bg-transparent text-muted-foreground border-transparent hover:bg-muted/60 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon className={`w-4 h-4 shrink-0 ${isCatActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                        <span className="truncate">{cat.label}</span>
                      </div>
                      {badgeCount > 0 && (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-4 min-w-4 ml-1.5 font-bold">
                          {badgeCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Controls: Table Density Toggle + Fast Tab Dropdown */}
              <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                {/* Density Toggle */}
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 text-xs">
                  <span className="text-[11px] font-medium text-muted-foreground px-1.5 hidden sm:inline">Density:</span>
                  <button
                    onClick={() => handleDensityChange("comfortable")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      density === "comfortable"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Comfortable table row height"
                  >
                    <AlignJustify className="w-3 h-3" />
                    <span>Comfortable</span>
                  </button>
                  <button
                    onClick={() => handleDensityChange("compact")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      density === "compact"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Compact table row height for dense lists"
                  >
                    <Rows className="w-3 h-3" />
                    <span>Compact</span>
                  </button>
                </div>

                {/* Direct Dropdown for Fast Tab Jumping */}
                <Select value={activeTab} onValueChange={handleTabChange}>
                  <SelectTrigger className="h-9 w-36 text-xs bg-background/90 border-border/80">
                    <SelectValue placeholder="Jump to tab" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {CATEGORIES.map((cat) => (
                      <SelectGroup key={cat.id}>
                        <SelectLabel className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                          {cat.label}
                        </SelectLabel>
                        {cat.subTabs.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sub-Tabs strip for the active category */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
                {activeCategoryDef.subTabs.map((subTab) => {
                  const SubIcon = subTab.icon;
                  const isActive = activeTab === subTab.id;
                  const badgeVal = subTab.getBadge?.(stats);
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => handleTabChange(subTab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-background text-foreground font-semibold shadow-xs border border-border/80"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <SubIcon className={`w-3.5 h-3.5 ${isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                      <span>{subTab.label}</span>
                      {badgeVal && badgeVal > 0 ? (
                        <Badge variant="warning" className="text-[10px] px-1 py-0 h-4">
                          {badgeVal}
                        </Badge>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border rounded shadow-2xs">⌘K</kbd>
                <span>for instant command palette</span>
              </div>
            </div>
          </div>

          {/* Main Tab Contents */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
            {/* 1. Overview & Analytics Sub-Tabs */}
            <TabsContent value="overview">
              <PlatformAnalytics />
            </TabsContent>

            <TabsContent value="insights">
              <AdminInsights />
            </TabsContent>

            <TabsContent value="audit">
              <AuditLogs />
            </TabsContent>

            <TabsContent value="health">
              <HealthDashboard />
            </TabsContent>

            {/* 2. Users & Operations Sub-Tabs */}
            <TabsContent value="users">
              <UserDirectory scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="tutors">
              <TutorManagement />
            </TabsContent>

            <TabsContent value="schools">
              <SchoolApplicationsTab />
            </TabsContent>

            <TabsContent value="announcements">
              <AnnouncementsManagement />
            </TabsContent>

            {/* 3. Finance & Monetization Sub-Tabs */}
            <TabsContent value="tokens">
              <TokenPurchaseManagement />
            </TabsContent>

            <TabsContent value="withdrawals">
              <WithdrawalManagement />
            </TabsContent>

            <TabsContent value="settings">
              <PlatformSettings />
            </TabsContent>

            {/* 4. Academic & Moderation Sub-Tabs */}
            <TabsContent value="courses">
              <CourseModeration scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="questions">
              <QuestionModeration scope={adminEnv.scope} />
            </TabsContent>

            <TabsContent value="challenges">
              <ChallengeManagement />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </PullToRefresh>
  );
};

export default AdminDashboard;