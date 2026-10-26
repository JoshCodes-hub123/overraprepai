import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  Brain,
  TrendingUp,
  Coins,
  Target,
  FileText,
} from "lucide-react";

interface AnalyticsData {
  totalStudents: number;
  totalTutors: number;
  totalCourses: number;
  totalTopics: number;
  totalQuestions: number;
  approvedQuestions: number;
  totalQuizzes: number;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  totalTokensSpent: number;
  platformRevenue: number;
  topCourses: { code: string; name: string; attempts: number }[];
  recentActivity: { type: string; description: string; date: string }[];
}

export function PlatformAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Parallel fetch all counts
        const [
          studentsResult,
          tutorsResult,
          coursesResult,
          topicsResult,
          questionsResult,
          approvedQuestionsResult,
          quizzesResult,
          attemptsResult,
          commissionResult,
        ] = await Promise.all([
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "student"),
          supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "tutor"),
          supabase.from("courses").select("*", { count: "exact", head: true }),
          supabase.from("topics").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }),
          supabase.from("questions").select("*", { count: "exact", head: true }).eq("is_approved", true),
          supabase.from("quizzes").select("*", { count: "exact", head: true }),
          supabase.from("quiz_attempts").select("*"),
          supabase.from("platform_settings").select("value").eq("key", "tutor_commission_rate").single(),
        ]);

        const attempts = attemptsResult.data || [];
        const completedAttempts = attempts.filter((a) => a.completed_at);
        const totalCorrect = completedAttempts.reduce((sum, a) => sum + a.correct_answers, 0);
        const totalQuestions = completedAttempts.reduce((sum, a) => sum + a.total_questions, 0);
        const averageScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // Calculate revenue
        const { data: premiumQuizzes } = await supabase
          .from("quizzes")
          .select("id, token_cost, course_id")
          .eq("is_premium", true);

        let totalTokensSpent = 0;
        const courseAttempts: Record<string, number> = {};

        if (premiumQuizzes) {
          for (const quiz of premiumQuizzes) {
            const { count } = await supabase
              .from("quiz_attempts")
              .select("*", { count: "exact", head: true })
              .eq("quiz_id", quiz.id);
            totalTokensSpent += (count || 0) * quiz.token_cost;
          }
        }

        // Get top courses by attempts
        const { data: coursesData } = await supabase.from("courses").select("id, code, name");
        const topCourses: { code: string; name: string; attempts: number }[] = [];

        if (coursesData) {
          for (const course of coursesData) {
            const { data: courseQuizzes } = await supabase
              .from("quizzes")
              .select("id")
              .eq("course_id", course.id);

            let courseAttemptCount = 0;
            if (courseQuizzes) {
              for (const quiz of courseQuizzes) {
                const { count } = await supabase
                  .from("quiz_attempts")
                  .select("*", { count: "exact", head: true })
                  .eq("quiz_id", quiz.id);
                courseAttemptCount += count || 0;
              }
            }

            if (courseAttemptCount > 0) {
              topCourses.push({
                code: course.code,
                name: course.name,
                attempts: courseAttemptCount,
              });
            }
          }
        }

        topCourses.sort((a, b) => b.attempts - a.attempts);

        const commissionRate = parseInt(commissionResult.data?.value || "80");
        const platformRevenue = Math.round(totalTokensSpent * ((100 - commissionRate) / 100));

        // Get recent activity
        const { data: recentApps } = await supabase
          .from("tutor_applications")
          .select("full_name, created_at")
          .order("created_at", { ascending: false })
          .limit(3);

        const { data: recentAttempts } = await supabase
          .from("quiz_attempts")
          .select("started_at, quizzes(title)")
          .order("started_at", { ascending: false })
          .limit(3);

        const recentActivity: { type: string; description: string; date: string }[] = [];

        recentApps?.forEach((app) => {
          recentActivity.push({
            type: "application",
            description: `${app.full_name} applied as tutor`,
            date: app.created_at,
          });
        });

        recentAttempts?.forEach((attempt) => {
          recentActivity.push({
            type: "attempt",
            description: `Quiz attempted: ${(attempt.quizzes as any)?.title || "Unknown"}`,
            date: attempt.started_at,
          });
        });

        recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setData({
          totalStudents: studentsResult.count || 0,
          totalTutors: tutorsResult.count || 0,
          totalCourses: coursesResult.count || 0,
          totalTopics: topicsResult.count || 0,
          totalQuestions: questionsResult.count || 0,
          approvedQuestions: approvedQuestionsResult.count || 0,
          totalQuizzes: quizzesResult.count || 0,
          totalAttempts: attempts.length,
          completedAttempts: completedAttempts.length,
          averageScore,
          totalTokensSpent,
          platformRevenue,
          topCourses: topCourses.slice(0, 5),
          recentActivity: recentActivity.slice(0, 5),
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Failed to load analytics</p>;
  }

  return (
    <div className="space-y-6">
      {/* User Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            User Base &amp; Engagement
          </h3>
          <span className="text-xs text-muted-foreground">Aggregated across all faculties</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<Users className="w-4 h-4 text-muted-foreground" />}
            value={data.totalStudents.toLocaleString()}
            label="Enrolled Students"
          />
          <StatCard
            icon={<GraduationCap className="w-4 h-4 text-muted-foreground" />}
            value={data.totalTutors.toLocaleString()}
            label="Faculty Tutors"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4 text-muted-foreground" />}
            value={data.completedAttempts.toLocaleString()}
            label="Quizzes Completed"
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
            value={`${data.averageScore}%`}
            label="Mean Accuracy Rate"
          />
        </div>
      </div>

      {/* Content Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Curriculum &amp; Question Repository
          </h3>
          <span className="text-xs text-muted-foreground">Verified CBT past question items</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
            value={data.totalCourses.toLocaleString()}
            label="Active Courses"
          />
          <StatCard
            icon={<FileText className="w-4 h-4 text-muted-foreground" />}
            value={data.totalTopics.toLocaleString()}
            label="Syllabus Topics"
          />
          <StatCard
            icon={<Brain className="w-4 h-4 text-muted-foreground" />}
            value={`${data.approvedQuestions.toLocaleString()} / ${data.totalQuestions.toLocaleString()}`}
            label="Approved Questions"
          />
          <StatCard
            icon={<Target className="w-4 h-4 text-muted-foreground" />}
            value={data.totalQuizzes.toLocaleString()}
            label="CBT Mock Sets"
          />
        </div>
      </div>

      {/* Revenue Stats */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Token Economy &amp; Platform Revenue
          </h3>
          <span className="text-xs text-muted-foreground">Settlement ledger</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total Tokens Spent by Students</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {data.totalTokensSpent.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">tokens</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Quiz attempts and premium unlocks</p>
          </div>

          <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Net Platform Earnings</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
              {data.platformRevenue.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">tokens</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Retained after tutor commission splits</p>
          </div>
        </div>
      </div>

      {/* Top Courses & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Courses */}
        <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-foreground">Most Practiced Courses</h3>
            <span className="text-xs text-muted-foreground">By student attempts</span>
          </div>
          {data.topCourses.length === 0 ? (
            <p className="text-muted-foreground text-xs py-4 text-center">No course activity recorded yet</p>
          ) : (
            <div className="divide-y divide-border/60">
              {data.topCourses.map((course, index) => (
                <div
                  key={course.code}
                  className="flex items-center justify-between py-2.5 px-1 hover:bg-muted/30 transition-colors rounded-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground w-4 text-right">{index + 1}.</span>
                    <div className="truncate">
                      <p className="font-semibold text-xs text-foreground font-mono">{course.code}</p>
                      <p className="text-xs text-muted-foreground truncate">{course.name}</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground ml-3 shrink-0">
                    {course.attempts.toLocaleString()} <span className="text-[10px] text-muted-foreground font-normal">attempts</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Operational Activity */}
        <div className="bg-card rounded-xl border border-border/70 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-sm font-bold text-foreground">Audit &amp; Activity Stream</h3>
            <span className="text-xs text-muted-foreground">Live operations</span>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="text-muted-foreground text-xs py-4 text-center">No recent activity detected</p>
          ) : (
            <div className="divide-y divide-border/60">
              {data.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 py-2.5 px-1 hover:bg-muted/30 transition-colors rounded-md">
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      activity.type === "application" ? "bg-amber-500" : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-medium truncate">{activity.description}</p>
                    <p className="text-[10px] font-mono tabular-nums text-muted-foreground mt-0.5">
                      {new Date(activity.date).toLocaleDateString()} at{" "}
                      {new Date(activity.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/70 p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        {icon}
      </div>
      <p className="font-mono text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
    </div>
  );
}