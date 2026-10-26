import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Trophy,
  Flame,
  Target,
  Crown,
  Medal,
  Award,
  Search,
  ArrowUpRight,
  ArrowRight,
  Users,
  ShieldCheck,
  SlidersHorizontal,
  Info,
  BarChart3,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGlobalRankings,
  type GlobalStudentRanking,
  type RankingCategory,
} from "@/hooks/useGlobalRankings";
import {
  useTutorLeaderboard,
  type LeaderboardScope,
  type TutorRow,
} from "@/hooks/useLeaderboards";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";
import { TeamLeaderboard } from "@/components/student/TeamLeaderboard";
import { ScoringActivityFeed } from "@/components/student/ScoringActivityFeed";
import { BadgeDetailsModal } from "@/components/student/BadgeDetailsModal";
import { StateEmpty, StateError } from "@/components/system/StateMessages";

interface CourseOption {
  id: string;
  label: string;
}

function useEnrolledCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseOption[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("student_courses")
        .select("course_id, courses:course_id(id, code, name)")
        .eq("student_id", user.id)
        .limit(50);
      if (!active) return;
      const rows: CourseOption[] = (data ?? [])
        .map((r: any) =>
          r.courses
            ? {
                id: r.courses.id,
                label: `${r.courses.code ?? ""} ${r.courses.name ?? ""}`.trim(),
              }
            : null,
        )
        .filter(Boolean);
      setCourses(rows);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return courses;
}

function sortStudentsByCategory(
  list: GlobalStudentRanking[],
  category: RankingCategory,
): GlobalStudentRanking[] {
  return [...list].sort((a, b) => {
    if (category === "streaks") {
      if (b.streak_days !== a.streak_days) return b.streak_days - a.streak_days;
      if (b.longest_streak !== a.longest_streak)
        return b.longest_streak - a.longest_streak;
      return b.score - a.score;
    }
    if (category === "quizzes") {
      const aQuizIndex = a.quiz_accuracy * 0.65 + Math.min(35, a.quizzes_completed * 1.4);
      const bQuizIndex = b.quiz_accuracy * 0.65 + Math.min(35, b.quizzes_completed * 1.4);
      if (Math.abs(bQuizIndex - aQuizIndex) > 0.5) return bQuizIndex - aQuizIndex;
      if (b.quiz_accuracy !== a.quiz_accuracy) return b.quiz_accuracy - a.quiz_accuracy;
      return b.quizzes_completed - a.quizzes_completed;
    }
    // overall
    if (b.score !== a.score) return b.score - a.score;
    if (b.quiz_accuracy !== a.quiz_accuracy) return b.quiz_accuracy - a.quiz_accuracy;
    return b.streak_days - a.streak_days;
  });
}

function RankMedallion({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-mono text-xs font-bold">
        <Crown className="w-4 h-4 text-amber-600" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-100 text-neutral-700 font-mono text-xs font-bold">
        <Medal className="w-4 h-4 text-neutral-600" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-orange-100/80 text-orange-800 font-mono text-xs font-bold">
        <Award className="w-4 h-4 text-orange-700" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 font-mono text-xs font-bold text-muted-foreground tabular-nums">
      #{rank}
    </span>
  );
}

function TutorRankingRow({ row, rank }: { row: TutorRow; rank: number }) {
  return (
    <Link
      to={`/u/${row.tutor_id}`}
      className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/80 bg-card hover:border-amber-300 transition-colors"
    >
      <RankMedallion rank={rank} />
      <Avatar className="w-10 h-10 border border-border">
        <AvatarImage src={resolveAvatarUrl(row)} alt={row.full_name || "Tutor"} />
        <AvatarFallback className="bg-amber-100 text-amber-900 font-semibold text-xs">
          {row.full_name?.charAt(0)?.toUpperCase() || "T"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-sm text-foreground truncate">
            {row.full_name || "Verified Tutor"}
          </p>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground mt-0.5 tabular-nums">
          <span>{row.uploads_count} uploads</span>
          <span aria-hidden="true">·</span>
          <span>{row.students_impacted} students guided</span>
          <span aria-hidden="true">·</span>
          <span>{row.followers_count} followers</span>
          {row.avg_rating != null && (
            <>
              <span aria-hidden="true">·</span>
              <span>★ {Number(row.avg_rating).toFixed(1)}</span>
            </>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-mono text-base font-bold text-amber-700 tabular-nums">
          {Math.round(row.score)}
        </p>
        <p className="text-[11px] text-muted-foreground">impact pts</p>
      </div>
    </Link>
  );
}

export function GlobalRankingsView() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"students" | "tutors" | "teams">(
    "students",
  );
  const [category, setCategory] = useState<RankingCategory>("overall");
  const [scope, setScope] = useState<LeaderboardScope>("overall");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [universityFilter, setUniversityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [comparedUserId, setComparedUserId] = useState<string | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);

  const rankingsQuery = useGlobalRankings(scope, courseId);
  const tutorsQuery = useTutorLeaderboard(20);
  const enrolledCourses = useEnrolledCourses();

  const allStudents = rankingsQuery.data?.students ?? [];
  const benchmarks = rankingsQuery.data?.benchmarks;

  // Available universities for filtering
  const universities = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStudents) {
      if (s.university) set.add(s.university.toUpperCase());
    }
    return Array.from(set).sort();
  }, [allStudents]);

  // Ranked & filtered list
  const rankedStudents = useMemo(() => {
    const filtered = allStudents.filter((s) => {
      if (
        universityFilter !== "all" &&
        s.university.toUpperCase() !== universityFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.full_name.toLowerCase().includes(q);
        const matchUni = s.university.toLowerCase().includes(q);
        const matchDept = (s.department || "").toLowerCase().includes(q);
        return matchName || matchUni || matchDept;
      }
      return true;
    });
    return sortStudentsByCategory(filtered, category);
  }, [allStudents, universityFilter, searchQuery, category]);

  // Global rank map (independent of search query so a student sees their true rank in the selected category)
  const categoryOrderedAll = useMemo(
    () => sortStudentsByCategory(allStudents, category),
    [allStudents, category],
  );

  const currentUserEntry = useMemo(() => {
    if (!user?.id) return categoryOrderedAll[0] ?? null;
    return (
      categoryOrderedAll.find((s) => s.user_id === user.id || s.isCurrentUser) ??
      categoryOrderedAll[0] ??
      null
    );
  }, [categoryOrderedAll, user?.id]);

  const currentUserRank = useMemo(() => {
    if (!currentUserEntry) return 1;
    const idx = categoryOrderedAll.findIndex(
      (s) => s.user_id === currentUserEntry.user_id,
    );
    return idx >= 0 ? idx + 1 : 1;
  }, [categoryOrderedAll, currentUserEntry]);

  // Peer selected for head-to-head comparison
  const comparedPeer = useMemo(() => {
    if (comparedUserId) {
      const found = allStudents.find((s) => s.user_id === comparedUserId);
      if (found) return found;
    }
    // Default to #1 student (or #2 if the current user is #1)
    const firstOther = categoryOrderedAll.find(
      (s) => s.user_id !== currentUserEntry?.user_id,
    );
    return firstOther ?? categoryOrderedAll[0] ?? null;
  }, [comparedUserId, allStudents, categoryOrderedAll, currentUserEntry]);

  const comparedPeerRank = useMemo(() => {
    if (!comparedPeer) return 1;
    const idx = categoryOrderedAll.findIndex(
      (s) => s.user_id === comparedPeer.user_id,
    );
    return idx >= 0 ? idx + 1 : 1;
  }, [categoryOrderedAll, comparedPeer]);

  const topThree = useMemo(() => rankedStudents.slice(0, 3), [rankedStudents]);

  const percentile = useMemo(() => {
    const total = Math.max(categoryOrderedAll.length, 1);
    return Math.max(1, Math.round((currentUserRank / total) * 100));
  }, [currentUserRank, categoryOrderedAll.length]);

  // Compute actionable recommendation from comparison
  const comparisonInsight = useMemo(() => {
    if (!currentUserEntry || !comparedPeer) return null;
    const streakDiff = comparedPeer.streak_days - currentUserEntry.streak_days;
    const accDiff = comparedPeer.quiz_accuracy - currentUserEntry.quiz_accuracy;
    const quizDiff =
      comparedPeer.quizzes_completed - currentUserEntry.quizzes_completed;

    if (streakDiff <= 0 && accDiff <= 0 && quizDiff <= 0) {
      return `You currently lead ${comparedPeer.full_name.split(" ")[0]} across study streak, quiz accuracy, and total quizzes completed. Complete 1 CBT practice session today to lock in your margin.`;
    }

    const actions: string[] = [];
    if (streakDiff > 0) {
      actions.push(`extend your daily streak by ${streakDiff}d`);
    }
    if (accDiff > 0) {
      actions.push(`lift quiz accuracy by +${accDiff}%`);
    }
    if (quizDiff > 0) {
      actions.push(`complete ${quizDiff} more practice quiz${quizDiff === 1 ? "" : "zes"}`);
    }

    return `To overtake ${comparedPeer.full_name.split(" ")[0]} (#${comparedPeerRank}), ${actions.join(" and ")}.`;
  }, [currentUserEntry, comparedPeer, comparedPeerRank]);

  return (
    <div className="space-y-6">
      {/* =================================================================
          1. PERSONAL GLOBAL STANDING & COHORT BENCHMARK SUMMARY
         ================================================================= */}
      {currentUserEntry && (
        <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-white p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-amber-200/60">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-800">
                <span>Your Global Standing</span>
                <span aria-hidden="true">·</span>
                <span>{currentUserEntry.university}</span>
                {currentUserEntry.department && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{currentUserEntry.department}</span>
                  </>
                )}
                {currentUserEntry.level && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{currentUserEntry.level}</span>
                  </>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-extrabold text-foreground mt-1 tracking-tight">
                Ranked <span className="text-amber-600 font-mono tabular-nums">#{currentUserRank}</span> of{" "}
                <span className="font-mono tabular-nums">{categoryOrderedAll.length}</span> Active Scholars
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Top {percentile}% in{" "}
                {category === "streaks"
                  ? "Consecutive Study Streaks"
                  : category === "quizzes"
                  ? "Quiz Progress & Accuracy"
                  : "Overall Academic Readiness"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/student/analytics")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300/80 bg-white hover:bg-amber-50 text-xs font-semibold text-foreground transition-colors whitespace-nowrap shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                <span>My Study Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/practice")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <span>Take Quiz to Climb</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4-Column Personal vs Global Cohort Telemetry Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
            <div>
              <p className="text-xs text-muted-foreground">Study Streak</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-foreground tabular-nums">
                  {currentUserEntry.streak_days}d
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  best {currentUserEntry.longest_streak}d
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                Cohort avg: {benchmarks?.avgStreak ?? 9}d · Top 10%:{" "}
                {benchmarks?.top10PercentStreak ?? 21}d
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Quiz Accuracy</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-foreground tabular-nums">
                  {currentUserEntry.quiz_accuracy}%
                </span>
                <span
                  className={`text-xs font-semibold tabular-nums ${
                    currentUserEntry.quiz_accuracy >= (benchmarks?.avgAccuracy ?? 75)
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {currentUserEntry.quiz_accuracy >= (benchmarks?.avgAccuracy ?? 75)
                    ? `+${currentUserEntry.quiz_accuracy - (benchmarks?.avgAccuracy ?? 75)}% vs avg`
                    : `${currentUserEntry.quiz_accuracy - (benchmarks?.avgAccuracy ?? 75)}% vs avg`}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                Cohort avg: {benchmarks?.avgAccuracy ?? 78}% · Top 10%:{" "}
                {benchmarks?.top10PercentAccuracy ?? 91}%
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Quiz Progress</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-foreground tabular-nums">
                  {currentUserEntry.quizzes_completed}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  quizzes ({currentUserEntry.questions_answered} Qs)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                Cohort avg: {benchmarks?.avgQuizzesCompleted ?? 14} quizzes
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Performance Index</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-amber-600 tabular-nums">
                  {currentUserEntry.score}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  / 100 pts
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                Cohort avg: {benchmarks?.avgScore ?? 76} pts
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================
          2. HEAD-TO-HEAD PEER COMPARISON ENGINE (YOU VS. SELECTED STUDENT)
         ================================================================= */}
      {currentUserEntry && comparedPeer && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/80">
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                Head-to-Head Performance Comparison
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select any student in the rankings table below to compare study streaks and quiz progress against yours.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Comparing with:
              </span>
              <Select
                value={comparedPeer.user_id}
                onValueChange={(val) => setComparedUserId(val)}
              >
                <SelectTrigger className="h-9 text-xs min-w-[200px] rounded-xl border-border bg-background font-medium">
                  <SelectValue placeholder="Choose student" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOrderedAll
                    .filter((s) => s.user_id !== currentUserEntry.user_id)
                    .map((s, idx) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        #{idx + 1 <= currentUserRank ? idx + 1 : idx + 2} · {s.full_name} ({s.university})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Two-student header bar */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-border/60">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="w-10 h-10 border border-amber-300 shrink-0">
                <AvatarImage
                  src={resolveAvatarUrl(currentUserEntry)}
                  alt={currentUserEntry.full_name}
                />
                <AvatarFallback className="bg-amber-100 text-amber-900 font-bold text-xs">
                  {currentUserEntry.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {currentUserEntry.full_name} (You)
                </p>
                <p className="text-xs text-muted-foreground truncate tabular-nums">
                  Rank #{currentUserRank} · {currentUserEntry.university}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 min-w-0 text-right">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {comparedPeer.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate tabular-nums">
                  Rank #{comparedPeerRank} · {comparedPeer.university}
                </p>
              </div>
              <Avatar className="w-10 h-10 border border-border shrink-0">
                <AvatarImage
                  src={resolveAvatarUrl(comparedPeer)}
                  alt={comparedPeer.full_name}
                />
                <AvatarFallback className="bg-neutral-100 text-neutral-800 font-bold text-xs">
                  {comparedPeer.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Metric Comparison Rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-4">
            {/* 1. Study Streak Comparison */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  {currentUserEntry.streak_days}d streak (best {currentUserEntry.longest_streak}d)
                </span>
                <span className="font-medium text-muted-foreground">
                  Study Streak
                </span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {comparedPeer.streak_days}d streak (best {comparedPeer.longest_streak}d)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 h-2">
                <div className="bg-neutral-100 rounded-l-full overflow-hidden flex justify-end">
                  <div
                    className="bg-amber-500 h-full rounded-l-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (currentUserEntry.streak_days /
                            Math.max(
                              currentUserEntry.streak_days,
                              comparedPeer.streak_days,
                              1,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <div className="bg-neutral-100 rounded-r-full overflow-hidden">
                  <div
                    className="bg-neutral-700 h-full rounded-r-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (comparedPeer.streak_days /
                            Math.max(
                              currentUserEntry.streak_days,
                              comparedPeer.streak_days,
                              1,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Quiz Accuracy Comparison */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  {currentUserEntry.quiz_accuracy}%
                </span>
                <span className="font-medium text-muted-foreground">
                  Quiz Accuracy
                </span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {comparedPeer.quiz_accuracy}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 h-2">
                <div className="bg-neutral-100 rounded-l-full overflow-hidden flex justify-end">
                  <div
                    className="bg-amber-500 h-full rounded-l-full"
                    style={{ width: `${currentUserEntry.quiz_accuracy}%` }}
                  />
                </div>
                <div className="bg-neutral-100 rounded-r-full overflow-hidden">
                  <div
                    className="bg-neutral-700 h-full rounded-r-full"
                    style={{ width: `${comparedPeer.quiz_accuracy}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Quizzes & Questions Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  {currentUserEntry.quizzes_completed} quizzes · {currentUserEntry.questions_answered} Qs
                </span>
                <span className="font-medium text-muted-foreground">
                  Quiz Volume
                </span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {comparedPeer.quizzes_completed} quizzes · {comparedPeer.questions_answered} Qs
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 h-2">
                <div className="bg-neutral-100 rounded-l-full overflow-hidden flex justify-end">
                  <div
                    className="bg-amber-500 h-full rounded-l-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (currentUserEntry.quizzes_completed /
                            Math.max(
                              currentUserEntry.quizzes_completed,
                              comparedPeer.quizzes_completed,
                              1,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <div className="bg-neutral-100 rounded-r-full overflow-hidden">
                  <div
                    className="bg-neutral-700 h-full rounded-r-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (comparedPeer.quizzes_completed /
                            Math.max(
                              currentUserEntry.quizzes_completed,
                              comparedPeer.quizzes_completed,
                              1,
                            )) *
                            100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 4. Overall Readiness Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-amber-700 tabular-nums">
                  {currentUserEntry.score} pts ({currentUserEntry.cards_reviewed} cards)
                </span>
                <span className="font-medium text-muted-foreground">
                  Overall Score
                </span>
                <span className="font-mono font-bold text-foreground tabular-nums">
                  {comparedPeer.score} pts ({comparedPeer.cards_reviewed} cards)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 h-2">
                <div className="bg-neutral-100 rounded-l-full overflow-hidden flex justify-end">
                  <div
                    className="bg-amber-500 h-full rounded-l-full"
                    style={{ width: `${Math.min(100, currentUserEntry.score)}%` }}
                  />
                </div>
                <div className="bg-neutral-100 rounded-r-full overflow-hidden">
                  <div
                    className="bg-neutral-700 h-full rounded-r-full"
                    style={{ width: `${Math.min(100, comparedPeer.score)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {comparisonInsight && (
            <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
              <span>{comparisonInsight}</span>
              <Link
                to={`/u/${comparedPeer.user_id}`}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0"
              >
                <span>View {comparedPeer.full_name.split(" ")[0]}'s Profile</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

      {/* =================================================================
          3. GLOBAL RANKINGS WORKSPACE (STUDENTS / TUTORS / TEAMS)
         ================================================================= */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        {/* Top Mode Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "students"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student Rankings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tutors")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "tutors"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Top Tutors
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("teams")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "teams"
                  ? "bg-white text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Study Teams
            </button>
          </div>

          <button
            type="button"
            onClick={() => setBadgeModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Info className="w-3.5 h-3.5" />
            <span>How Scoring & Tiers Work</span>
          </button>
        </div>

        {activeTab === "students" && (
          <div className="space-y-5">
            {/* Ranking Dimension Tabs + Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Dimension Segmented Control */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-amber-50/80 border border-amber-200/70 w-fit">
                <button
                  type="button"
                  onClick={() => setCategory("overall")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    category === "overall"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-amber-900 hover:bg-amber-100/70"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Overall Performance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("streaks")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    category === "streaks"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-amber-900 hover:bg-amber-100/70"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Study Streaks</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("quizzes")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    category === "quizzes"
                      ? "bg-amber-500 text-white shadow-2xs"
                      : "text-amber-900 hover:bg-amber-100/70"
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Quiz Progress</span>
                </button>
              </div>

              {/* Timeframe + University + Course + Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-border bg-neutral-50 p-0.5">
                  {(["overall", "weekly"] as LeaderboardScope[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        scope === s
                          ? "bg-white text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "weekly" ? "This Week" : "All Time"}
                    </button>
                  ))}
                </div>

                <Select
                  value={universityFilter}
                  onValueChange={(v) => setUniversityFilter(v)}
                >
                  <SelectTrigger className="h-8 text-xs w-auto min-w-[130px] rounded-xl border-border bg-background">
                    <SelectValue placeholder="All Universities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Universities</SelectItem>
                    {universities.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {enrolledCourses.length > 0 && (
                  <Select
                    value={courseId ?? "all"}
                    onValueChange={(v) => setCourseId(v === "all" ? null : v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-auto min-w-[135px] rounded-xl border-border bg-background">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {enrolledCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <div className="relative flex-1 sm:flex-initial sm:w-52">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student or dept..."
                    className="w-full h-8 pl-8 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>
            </div>

            {/* Top 3 Podium (shown when not searching) */}
            {!searchQuery.trim() && topThree.length >= 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                {topThree.map((student, idx) => {
                  const rank = idx + 1;
                  const isSelected = comparedPeer?.user_id === student.user_id;
                  return (
                    <div
                      key={student.user_id}
                      className={`flex flex-col justify-between p-4 rounded-2xl border transition-colors ${
                        rank === 1
                          ? "border-amber-300 bg-amber-50/50"
                          : "border-border/80 bg-neutral-50/40"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <RankMedallion rank={rank} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {student.university}
                            {student.level ? ` · ${student.level}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          <Avatar className="w-11 h-11 border border-amber-200">
                            <AvatarImage
                              src={resolveAvatarUrl(student)}
                              alt={student.full_name}
                            />
                            <AvatarFallback className="bg-amber-100 text-amber-900 font-bold text-sm">
                              {student.full_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              to={`/u/${student.user_id}`}
                              className="font-display font-bold text-sm text-foreground hover:text-amber-700 truncate block"
                            >
                              {student.full_name}
                              {student.isCurrentUser ? " (You)" : ""}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.department || "University Scholar"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                          <span>{student.streak_days}d streak</span>
                          <span aria-hidden="true">·</span>
                          <span>{student.quiz_accuracy}% accuracy</span>
                          <span aria-hidden="true">·</span>
                          <span>{student.quizzes_completed} quizzes</span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="font-mono text-lg font-extrabold text-amber-700 tabular-nums">
                              {category === "streaks"
                                ? `${student.streak_days}d`
                                : category === "quizzes"
                                ? `${student.quiz_accuracy}%`
                                : `${student.score} pts`}
                            </span>
                          </div>
                          {!student.isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => setComparedUserId(student.user_id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                                isSelected
                                  ? "bg-amber-500 text-white"
                                  : "bg-white border border-border text-foreground hover:border-amber-300"
                              }`}
                            >
                              {isSelected ? "Comparing" : "Compare"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* High-Density Rankings Table */}
            {rankingsQuery.isLoading ? (
              <div className="space-y-2.5 py-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-neutral-100 animate-pulse"
                  />
                ))}
              </div>
            ) : rankingsQuery.isError ? (
              <StateError
                title="Couldn't load global rankings"
                message={
                  (rankingsQuery.error as any)?.message ||
                  "Check your connection and try again."
                }
                onRetry={() => rankingsQuery.refetch()}
              />
            ) : rankedStudents.length === 0 ? (
              <StateEmpty
                title="No students match your filter"
                message="Try clearing your search or switching university filters."
              />
            ) : (
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-semibold text-muted-foreground">
                      <th className="py-2.5 pl-3 pr-2 w-12">Rank</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3 text-right">Study Streak</th>
                      <th className="py-2.5 px-3 text-right hidden sm:table-cell">
                        Quiz Progress
                      </th>
                      <th className="py-2.5 px-3 text-right">Quiz Accuracy</th>
                      <th className="py-2.5 px-3 text-right">Overall Score</th>
                      <th className="py-2.5 pl-2 pr-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {rankedStudents.map((student, index) => {
                      const rank = index + 1;
                      const isCompared =
                        comparedPeer?.user_id === student.user_id;
                      const isMe = Boolean(student.isCurrentUser);

                      return (
                        <tr
                          key={student.user_id}
                          className={`transition-colors ${
                            isMe
                              ? "bg-amber-50/70"
                              : isCompared
                              ? "bg-neutral-50"
                              : "hover:bg-neutral-50/70"
                          }`}
                        >
                          <td className="py-3 pl-3 pr-2 whitespace-nowrap">
                            <RankMedallion rank={rank} />
                          </td>

                          <td className="py-3 px-3 min-w-[180px]">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-9 h-9 border border-border shrink-0">
                                <AvatarImage
                                  src={resolveAvatarUrl(student)}
                                  alt={student.full_name}
                                />
                                <AvatarFallback className="bg-amber-100 text-amber-900 text-xs font-bold">
                                  {student.full_name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <Link
                                  to={`/u/${student.user_id}`}
                                  className="font-semibold text-foreground hover:text-amber-700 truncate block text-[13.5px]"
                                >
                                  {student.full_name}
                                  {isMe ? " (You)" : ""}
                                </Link>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                                  <span>{student.university}</span>
                                  {student.department && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="truncate max-w-[140px]">
                                        {student.department}
                                      </span>
                                    </>
                                  )}
                                  {student.level && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{student.level}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Study Streak Column */}
                          <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                            <div className="font-mono font-bold text-foreground">
                              {student.streak_days}d
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              best {student.longest_streak}d
                            </div>
                          </td>

                          {/* Quiz Progress Column */}
                          <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums hidden sm:table-cell">
                            <div className="font-mono font-semibold text-foreground">
                              {student.quizzes_completed} quizzes
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {student.questions_answered} questions
                            </div>
                          </td>

                          {/* Quiz Accuracy Column */}
                          <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                            <div className="inline-flex flex-col items-end">
                              <span className="font-mono font-bold text-foreground">
                                {student.quiz_accuracy}%
                              </span>
                              <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${student.quiz_accuracy}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Overall Score Column */}
                          <td className="py-3 px-3 text-right whitespace-nowrap tabular-nums">
                            <span className="font-mono text-base font-extrabold text-amber-700">
                              {student.score}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-1">
                              pts
                            </span>
                          </td>

                          {/* Compare Action */}
                          <td className="py-3 pl-2 pr-3 text-right whitespace-nowrap">
                            {isMe ? (
                              <span className="text-xs font-semibold text-amber-700">
                                Your Row
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setComparedUserId(student.user_id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                                  isCompared
                                    ? "bg-amber-500 text-white"
                                    : "border border-border bg-white hover:border-amber-300 text-foreground"
                                }`}
                              >
                                {isCompared ? "Comparing" : "Compare"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "tutors" && (
          <div className="space-y-2.5">
            {tutorsQuery.isLoading ? (
              <div className="space-y-2.5 py-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-neutral-100 animate-pulse"
                  />
                ))}
              </div>
            ) : tutorsQuery.isError ? (
              <StateError
                title="Couldn't load tutor rankings"
                message={
                  (tutorsQuery.error as any)?.message ||
                  "Check your connection and try again."
                }
                onRetry={() => tutorsQuery.refetch()}
              />
            ) : (tutorsQuery.data?.length ?? 0) === 0 ? (
              <StateEmpty
                title="No tutor rankings yet"
                message="Tutors appear once they publish study materials and guide students."
              />
            ) : (
              tutorsQuery.data!.map((row, idx) => (
                <TutorRankingRow key={row.tutor_id} row={row} rank={idx + 1} />
              ))
            )}
          </div>
        )}

        {activeTab === "teams" && <TeamLeaderboard />}
      </section>

      {/* =================================================================
          4. LIVE SCORING ACTIVITY FEED
         ================================================================= */}
      <ScoringActivityFeed limit={15} />

      <BadgeDetailsModal
        open={badgeModalOpen}
        onOpenChange={setBadgeModalOpen}
      />
    </div>
  );
}

export default GlobalRankingsView;
