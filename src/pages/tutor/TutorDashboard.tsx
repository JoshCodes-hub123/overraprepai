import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LogOut,
  Plus,
  Users,
  Coins,
  TrendingUp,
  FileText,
  Loader2,
  GraduationCap,
  BarChart3,
  User,
  Sparkles,
  Megaphone,
  HelpCircle,
  MessageCircle,
  Store,
  ArrowRight,
  AlertCircle,
  BookOpen,
  Image as ImageIcon,
} from "lucide-react";
import logo from "@/assets/logo.png";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { CreateCourseDialog } from "@/components/tutor/CreateCourseDialog";
import { EditQuizDialog } from "@/components/tutor/EditQuizDialog";
import { DeleteQuizDialog } from "@/components/tutor/DeleteQuizDialog";
import { WithdrawalRequestDialog } from "@/components/tutor/WithdrawalRequestDialog";
import QuestionReports from "@/components/tutor/QuestionReports";
import TutorAnalytics from "@/components/tutor/TutorAnalytics";
import QuizManagement from "@/components/tutor/QuizManagement";
import TutorAnnouncementsPanel from "@/components/tutor/TutorAnnouncementsPanel";
import { TutorCommunityManager } from "@/components/tutor/TutorCommunityManager";
import { OnboardingChecklist } from "@/components/tutor/OnboardingChecklist";
import { SkeletonDashboard } from "@/components/ui/premium-skeletons";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { PremiumStatCard } from "@/components/dashboard/PremiumStatCard";
import { SuggestOpportunityDialog } from "@/components/opportunities/SuggestOpportunityDialog";
import { PullToRefresh } from "@/components/native/PullToRefresh";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { LastUpdatedBadge } from "@/components/dashboard/LastUpdatedBadge";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
  topics_count: number;
  questions_count: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  token_cost: number;
  is_premium: boolean;
  question_count: number;
  duration_minutes: number;
  is_active: boolean;
  attempts_count: number;
  course: {
    code: string;
    name: string;
  };
}

interface EarningsData {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalStudents: number;
  totalAttempts: number;
}

const TutorDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, signOut, hasRole } = useAuth();
  const { showOnboarding, completeOnboarding } = useOnboarding(user?.id);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [earnings, setEarnings] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    totalStudents: 0,
    totalAttempts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showEditQuiz, setShowEditQuiz] = useState(false);
  const [showDeleteQuiz, setShowDeleteQuiz] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (!authLoading && user && !hasRole("tutor") && !hasRole("admin")) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate, hasRole]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch courses created by this tutor
        const { data: coursesData } = await supabase
          .from("courses")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false });

        if (coursesData) {
          // Get topics and questions count for each course
          const coursesWithCounts = await Promise.all(
            coursesData.map(async (course) => {
              const { count: topicsCount } = await supabase
                .from("topics")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id);

              const { count: questionsCount } = await supabase
                .from("questions")
                .select("*", { count: "exact", head: true })
                .eq("course_id", course.id);

              return {
                ...course,
                topics_count: topicsCount || 0,
                questions_count: questionsCount || 0,
              };
            })
          );
          setCourses(coursesWithCounts);
        }

        // Fetch quizzes created by this tutor
        const { data: quizzesData } = await supabase
          .from("quizzes")
          .select("*, courses(code, name)")
          .eq("tutor_id", user.id)
          .order("created_at", { ascending: false });

        if (quizzesData) {
          // Get attempts count for each quiz
          const quizzesWithAttempts = await Promise.all(
            quizzesData.map(async (quiz) => {
              const { count: attemptsCount } = await supabase
                .from("quiz_attempts")
                .select("*", { count: "exact", head: true })
                .eq("quiz_id", quiz.id);

              return {
                ...quiz,
                attempts_count: attemptsCount || 0,
                course: quiz.courses as { code: string; name: string },
              };
            })
          );
          setQuizzes(quizzesWithAttempts);

          // Calculate earnings
          let totalEarnings = 0;
          let thisMonthEarnings = 0;
          let totalAttempts = 0;
          const uniqueStudents = new Set<string>();
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          for (const quiz of quizzesWithAttempts) {
            if (quiz.is_premium && quiz.token_cost > 0) {
              const { data: attempts } = await supabase
                .from("quiz_attempts")
                .select("user_id, started_at")
                .eq("quiz_id", quiz.id);

              if (attempts) {
                attempts.forEach((attempt) => {
                  uniqueStudents.add(attempt.user_id);
                  totalAttempts++;
                  totalEarnings += quiz.token_cost;
                  
                  const attemptDate = new Date(attempt.started_at);
                  if (attemptDate >= startOfMonth) {
                    thisMonthEarnings += quiz.token_cost;
                  }
                });
              }
            }
          }

          setEarnings({
            totalEarnings,
            thisMonthEarnings,
            totalStudents: uniqueStudents.size,
            totalAttempts,
          });

          // Fetch actual earnings from tutor_earnings table
          const { data: earningsData } = await supabase
            .from("tutor_earnings")
            .select("tutor_share")
            .eq("tutor_id", user.id);

          if (earningsData) {
            const actualEarnings = earningsData.reduce((sum, e) => sum + e.tutor_share, 0);
            setWalletBalance(actualEarnings);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        pendingRefreshRef.current?.reject(error);
        pendingRefreshRef.current = null;
      } finally {
        setIsLoading(false);
        if (pendingRefreshRef.current) {
          setLastUpdated(Date.now());
          pendingRefreshRef.current.resolve();
          pendingRefreshRef.current = null;
        }
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user, refreshKey]);

  // Bridges the imperative pull-to-refresh promise to the effect-based fetch.
  const pendingRefreshRef = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(
    null
  );
  const refreshingRef = useRef(false);

  const refreshData = async () => {
    // Coalesce concurrent calls
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await new Promise<void>((resolve, reject) => {
        pendingRefreshRef.current = { resolve, reject };
        setRefreshKey((k) => k + 1);
        // Safety timeout in case the effect never reports back
        setTimeout(() => {
          if (pendingRefreshRef.current) {
            pendingRefreshRef.current.resolve();
            pendingRefreshRef.current = null;
          }
        }, 8000);
      });
    } finally {
      refreshingRef.current = false;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Tutor Dashboard"
        description="Manage your courses, create quizzes, and track your earnings on OverraPrep AI."
        noindex={true}
        url="https://overraprep.com/tutor/dashboard"
      />
      <PullToRefresh onRefresh={refreshData}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-50" role="banner">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center group">
              <img 
                src={logo} 
                alt="OverraPrep AI FUTA" 
                className="h-10 w-auto object-contain"
              />
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile/edit")} className="hidden sm:flex">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate("/profile/edit")} className="sm:hidden">
                <User className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut()} className="hidden sm:flex">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="sm:hidden">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <DashboardNav role="tutor" />
      <DashboardBreadcrumb role="tutor" />

      <main className="container mx-auto px-4 py-8">
        <DashboardOfflineBanner onReattempt={refreshData} />
        {/* Hero */}
        <DashboardHero
          role="tutor"
          fullName={profile?.full_name}
          avatarUrl={(profile as any)?.avatar_url || (profile as any)?.profile_image_url}
          coverUrl={(profile as any)?.cover_photo_url}
          institution="Federal University of Technology, Akure (FUTA)"
          meta={
            [
              (profile as any)?.department,
              (profile as any)?.tutor_code,
            ]
              .filter(Boolean)
              .join(" • ") || "Tutor on OverraPrep"
          }
          contact={{
            email: user?.email,
            phone: (profile as any)?.phone,
            location: (profile as any)?.state_of_origin || null,
            joined: (profile as any)?.created_at
              ? new Date((profile as any).created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
              : null,
          }}
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate("/tutor/courses")}
                className="bg-white text-amber-700 hover:bg-amber-50 shadow-md font-semibold rounded-full px-4 sm:px-5"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add to a course
              </Button>
              <SuggestOpportunityDialog
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/40 text-white hover:bg-white/20 hover:text-white shadow-md font-semibold rounded-full px-4 sm:px-5"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Post opportunity
                  </Button>
                }
              />
            </div>
          }
          footer={
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-600" />
                <span className="text-muted-foreground">This month</span>
                <span className="font-serif text-lg font-semibold text-foreground">{earnings.thisMonthEarnings}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                <span className="text-muted-foreground">Students</span>
                <span className="font-serif text-lg font-semibold text-foreground">{earnings.totalStudents}</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-muted-foreground">Attempts</span>
                <span className="font-serif text-lg font-semibold text-foreground">{earnings.totalAttempts}</span>
              </div>
              <LastUpdatedBadge timestamp={lastUpdated} className="ml-auto" />
            </div>
          }
          className="mb-6"
        />

        {/* Onboarding Checklist */}
        <OnboardingChecklist
          onCreateCourse={() => setShowCreateCourse(true)}
          onCreateQuiz={() => navigate("/tutor/courses")}
        />

        {/* Primary Actions (single, consolidated row) */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
          <Button onClick={() => navigate("/tutor/courses")} className="bg-amber-500 hover:bg-amber-600 text-white">
            <BookOpen className="w-4 h-4 mr-2" />
            Manage courses & upload quizzes
          </Button>
          <Button variant="outline" onClick={() => setShowCreateCourse(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New course
          </Button>
        </div>

        {/* Premium Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <PremiumStatCard
            icon={Coins}
            label="Total earnings"
            value={earnings.totalEarnings}
            tone="gold"
            hint="lifetime tokens"
            delay={0}
          />
          <PremiumStatCard
            icon={TrendingUp}
            label="This month"
            value={earnings.thisMonthEarnings}
            tone="emerald"
            delay={0.05}
          />
          <PremiumStatCard
            icon={Users}
            label="Students reached"
            value={earnings.totalStudents}
            tone="violet"
            delay={0.1}
          />
          <PremiumStatCard
            icon={BarChart3}
            label="Quiz attempts"
            value={earnings.totalAttempts}
            tone="sapphire"
            delay={0.15}
          />
        </div>

        {/* Quick Actions */}
        <QuickActions
          subtitle="Run your studio in three clicks"
          actions={[
            {
              icon: Plus,
              label: "Upload bulk quizzes",
              description: "Open a course → Quizzes tab to upload or AI-generate",
              onClick: () => navigate("/tutor/courses"),
              tone: "gold",
            },
            {
              icon: ImageIcon,
              label: "Question Cards",
              description: "Design branded shareable cards (PNG/PDF)",
              to: "/tutor/question-cards",
              tone: "violet",
            },
            {
              icon: AlertCircle,
              label: "Review Pending Reports",
              description: "Address student-flagged questions",
              onClick: () => {
                document
                  .getElementById("question-reports")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              },
              tone: "rose",
            },
            {
              icon: FileText,
              label: "Lecture Notes",
              description: "Upload PDFs, slides & materials",
              to: "/lecture-notes",
              tone: "emerald",
            },
            {
              icon: Users,
              label: "Inbox",
              description: "Chat with your students",
              to: "/messages",
              tone: "sapphire",
            },
            {
              icon: Sparkles,
              label: "Announcements",
              description: "Broadcast updates to students",
              to: "/announcements",
              tone: "violet",
            },
            {
              icon: User,
              label: "Q&A Board",
              description: "Answer student questions",
              to: "/qa",
              tone: "slate",
            },
            {
              icon: BookOpen,
              label: "My Curricula",
              description: "Build courses with topics + AI flashcards",
              to: "/tutor/curricula",
              tone: "gold",
            },
            {
              icon: BookOpen,
              label: "My Courses",
              description: "Pick courses you handle",
              to: "/tutor/courses",
              tone: "rose",
            },
            {
              icon: Users,
              label: "Community Wall",
              description: "Talk with the community",
              to: "/community-wall",
              tone: "sapphire",
            },
          ]}
        />

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Your Courses</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowCreateCourse(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Course
            </Button>
          </div>

          {courses.length === 0 ? (
            <div className="bg-muted/30 rounded-xl p-8 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-2">No courses yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first course to start adding questions and quizzes.
              </p>
              <Button onClick={() => setShowCreateCourse(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Course
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {course.code}
                      </span>
                      <h3 className="font-display font-semibold text-foreground mt-2">
                        {course.name}
                      </h3>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>{course.topics_count} topics</span>
                    <span>{course.questions_count} questions</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/tutor/courses/${course.id}/manage`)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add quizzes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate("/lecture-notes")}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Notes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Management Section */}
        <div className="mb-8">
          <QuizManagement />
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <TutorAnalytics />
        </div>

        {/* Announcements (Phase 8) */}
        <div className="mb-8">
          <TutorAnnouncementsPanel />
        </div>

        {/* Tutor Community */}
        <div className="mb-8">
          <TutorCommunityManager quizzes={quizzes} />
        </div>

        {/* Question Reports Section */}
        <div id="question-reports" className="mb-8 scroll-mt-24">
          <QuestionReports />
        </div>
      </main>

      {/* Dialogs */}
      <CreateCourseDialog
        open={showCreateCourse}
        onOpenChange={setShowCreateCourse}
        onSuccess={() => {
          setShowCreateCourse(false);
          refreshData();
        }}
      />
      {/* Quiz upload dialogs intentionally removed — all uploads happen inside a course's Quizzes tab. */}
      <WithdrawalRequestDialog
        open={showWithdrawal}
        onOpenChange={setShowWithdrawal}
        availableBalance={walletBalance}
        onSuccess={() => {
          setShowWithdrawal(false);
        }}
      />
      <EditQuizDialog
        open={showEditQuiz}
        onOpenChange={setShowEditQuiz}
        quiz={selectedQuiz}
        onSuccess={() => {
          setShowEditQuiz(false);
          setSelectedQuiz(null);
          refreshData();
        }}
      />
      <DeleteQuizDialog
        open={showDeleteQuiz}
        onOpenChange={setShowDeleteQuiz}
        quiz={selectedQuiz}
        onSuccess={() => {
          setShowDeleteQuiz(false);
          setSelectedQuiz(null);
          refreshData();
        }}
      />
      <OnboardingDialog
        isOpen={showOnboarding}
        onComplete={completeOnboarding}
        userRole="tutor"
        userName={profile?.full_name || undefined}
      />
    </div>
    </PullToRefresh>
    </>
  );
};

export default TutorDashboard;
