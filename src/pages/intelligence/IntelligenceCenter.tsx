import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, Trophy, Flame, Brain, Layers, Timer,
  ChevronRight, Award, Calendar, BookOpen, Target,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  useSuccessScore,
  useReadinessAll,
  useTodayMission,
  useWeeklyReport,
  useOpportunityMatches,
  useStudyCoach,
} from "@/hooks/useIntelligence";

const tierMeta: Record<string, { label: string; min: number; gradient: string }> = {
  Legend: { label: "Legend", min: 90, gradient: "from-amber-300 to-amber-500" },
  Champion: { label: "Champion", min: 80, gradient: "from-amber-300 to-amber-500" },
  Achiever: { label: "Achiever", min: 70, gradient: "from-amber-200 to-amber-400" },
  Scholar: { label: "Scholar", min: 60, gradient: "from-zinc-200 to-zinc-400" },
  Beginner: { label: "Beginner", min: 0, gradient: "from-zinc-200 to-zinc-300" },
};

const iconMap: Record<string, typeof Brain> = {
  brain: Brain, layers: Layers, timer: Timer,
};

function greet(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function IntelligenceCenter() {
  const { profile } = useAuth();
  const firstName = (profile?.full_name ?? "Student").split(" ")[0];
  const [hour, setHour] = useState(new Date().getHours());
  useEffect(() => { setHour(new Date().getHours()); }, []);

  const { data: score, isLoading: sLoad } = useSuccessScore();
  const { data: readiness, isLoading: rLoad } = useReadinessAll();
  const { data: mission } = useTodayMission();
  const { data: weekly } = useWeeklyReport();
  const { data: opps } = useOpportunityMatches(4);
  const { data: coachMsg, isLoading: coachLoad } = useStudyCoach();

  const tier = score?.tier ?? "Scholar";
  const ring = score?.score ?? 0;
  const meta = tierMeta[tier];

  const sortedReadiness = useMemo(
    () => [...(readiness ?? [])].sort((a, b) => b.readiness - a.readiness),
    [readiness],
  );

  return (
    <>
      <SEO
        title="Student Success Center"
        description="Your personal academic intelligence — readiness, success score, and what to do next."
        noindex
      />
      <div className="min-h-screen bg-background pb-24">
        <main className="container mx-auto max-w-2xl px-4 pt-6 space-y-6">
          {/* Header */}
          <header>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700">
              Student Success Center™
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {greet(hour)}, {firstName}
            </h1>
          </header>

          {/* AI Coach card */}
          <Card className="relative overflow-hidden border-amber-200/60 bg-gradient-to-br from-white to-amber-50/40 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Sparkles className="h-4 w-4 text-amber-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-amber-700">
                  AI Study Coach
                </p>
                {coachLoad ? (
                  <div className="mt-2 space-y-1.5">
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-4/5" />
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                    {coachMsg ?? `Welcome back, ${firstName}. Let's make today count.`}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Success Score Ring */}
          <Card className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - ring / 100) }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(45, 92%, 55%)" />
                      <stop offset="100%" stopColor="hsl(38, 88%, 45%)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {sLoad ? <Skeleton className="h-9 w-14" /> : (
                    <>
                      <span className="text-3xl font-semibold leading-none tabular-nums">{ring}</span>
                      <span className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
                    </>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Success Score
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-2xl font-semibold">{meta.label}</h2>
                  <Trophy className="h-5 w-5 text-amber-600" />
                </div>
                {score && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp
                      className={cn("h-3.5 w-3.5",
                        score.trend_pct >= 0 ? "text-emerald-600" : "text-rose-600 rotate-180",
                      )} />
                    <span>{score.trend_pct >= 0 ? "+" : ""}{score.trend_pct}% from last month</span>
                  </div>
                )}
                {score && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Active <span className="font-medium text-foreground">
                      {score.active_days_last_14}/14 days
                    </span>
                  </p>
                )}
              </div>
            </div>

            {score && (
              <div className="mt-5 grid grid-cols-3 gap-3 text-center text-[11px]">
                {[
                  { k: "Quiz", v: score.breakdown.quiz },
                  { k: "Consistency", v: score.breakdown.consistency },
                  { k: "Arena", v: score.breakdown.arena },
                  { k: "Community", v: score.breakdown.community },
                  { k: "Opportunities", v: score.breakdown.opportunity },
                  { k: "Courses", v: score.breakdown.course_coverage },
                ].map((b) => (
                  <div key={b.k} className="rounded-md border bg-card p-2">
                    <div className="text-xs font-semibold tabular-nums">{b.v}</div>
                    <div className="mt-0.5 text-muted-foreground">{b.k}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Today's Mission */}
          {mission && mission.tasks.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Today's Mission
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold">Three small wins</h3>
                </div>
                {mission.streak > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="h-3 w-3 text-amber-600" />
                    {mission.streak}-day streak
                  </Badge>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {mission.tasks.map((t, i) => {
                  const Icon = iconMap[t.icon] ?? Target;
                  return (
                    <Link
                      key={i}
                      to={t.link}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                        <Icon className="h-4 w-4 text-amber-700" />
                      </div>
                      <span className="flex-1 text-sm font-medium">{t.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Exam Readiness per course */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-700" />
              <h3 className="text-lg font-semibold">Exam Readiness</h3>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              AI prediction per enrolled course
            </p>
            <div className="mt-4 space-y-3">
              {rLoad && Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
              {!rLoad && sortedReadiness.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Enroll in a course and complete a quiz to unlock predictions.
                </p>
              )}
              {sortedReadiness.map((c) => (
                <Link
                  key={c.course_id}
                  to={`/student/course/${c.course_id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {c.course_code ?? c.course_name ?? "Course"}
                      </p>
                      {c.course_code && c.course_name && (
                        <p className="truncate text-xs text-muted-foreground">{c.course_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-lg font-semibold tabular-nums",
                        c.readiness >= 75 ? "text-emerald-700" :
                        c.readiness >= 55 ? "text-amber-700" : "text-rose-600",
                      )}>{c.readiness}%</span>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Predicted {c.predicted_grade} · {c.confidence}
                      </p>
                    </div>
                  </div>
                  <Progress value={c.readiness} className="mt-2 h-1.5" />
                  {c.weak_topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Focus on</span>
                      {c.weak_topics.slice(0, 2).map((w) => (
                        <Badge key={w.topic} variant="outline" className="text-[10px]">
                          {w.topic}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {c.recommendations.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      → {c.recommendations[0]}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </Card>

          {/* Weekly Report */}
          {weekly && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-700" />
                  <h3 className="text-lg font-semibold">This Week</h3>
                </div>
                {weekly.improvement_pct !== 0 && (
                  <Badge variant={weekly.improvement_pct > 0 ? "default" : "secondary"} className="gap-1">
                    <TrendingUp className={cn("h-3 w-3", weekly.improvement_pct < 0 && "rotate-180")} />
                    {weekly.improvement_pct > 0 ? "+" : ""}{weekly.improvement_pct}%
                  </Badge>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Hours studied" value={weekly.hours_studied} suffix="h" />
                <Stat label="Quizzes" value={weekly.quizzes_completed} />
                <Stat label="Challenges joined" value={weekly.challenges_joined} />
                <Stat label="Opportunities" value={weekly.opportunities_viewed} />
              </div>
            </Card>
          )}

          {/* Recommended Opportunities */}
          {opps && opps.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-700" />
                  <h3 className="text-lg font-semibold">Recommended for you</h3>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/student/opportunities">See all</Link>
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {opps.map((o) => (
                  <Link
                    key={o.id}
                    to={`/student/opportunity/${o.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-50">
                      <span className="text-sm font-semibold tabular-nums text-amber-700">
                        {o.match_score}%
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{o.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.organization ?? "—"}
                      </p>
                    </div>
                    {o.reasons.closing_soon && (
                      <Badge variant="destructive" className="text-[10px]">Closing soon</Badge>
                    )}
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-2xl font-semibold tabular-nums">
        {value}{suffix ?? ""}
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
