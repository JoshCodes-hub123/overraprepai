import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Crown, Loader2, GraduationCap, Flame, ShieldCheck, Users, Info } from "lucide-react";
import { useStudentLeaderboard, useTutorLeaderboard, type StudentRow, type TutorRow, type LeaderboardScope } from "@/hooks/useLeaderboards";
import { useMyActivityBadge } from "@/hooks/useMyActivityBadge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TeamLeaderboard } from "./TeamLeaderboard";
import { BadgeDetailsModal } from "./BadgeDetailsModal";
import { ScoringActivityFeed } from "./ScoringActivityFeed";
import { StateEmpty, StateError } from "@/components/system/StateMessages";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-zinc-400" />;
  if (rank === 3) return <Award className="w-5 h-5 text-amber-700" />;
  return <span className="w-5 h-5 inline-flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
};

const rankBg = (rank: number) => {
  if (rank === 1) return "bg-amber-50/80 border-amber-200";
  if (rank === 2) return "bg-zinc-50 border-zinc-200";
  if (rank === 3) return "bg-amber-50/40 border-amber-200/60";
  return "bg-white border-amber-100/70";
};

function StudentCard({ row, rank }: { row: StudentRow; rank: number }) {
  return (
    <Link
      to={`/profile/${row.user_id}`}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition hover:shadow-md ${rankBg(rank)}`}
    >
      <div className="w-7 flex justify-center shrink-0">{rankIcon(rank)}</div>
      <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
        <AvatarImage src={row.avatar_url || undefined} />
        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
          {row.full_name?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate text-[14px]">{row.full_name || "Anonymous"}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground mt-0.5">
          {row.university && (
            <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
              <GraduationCap className="w-3 h-3" /> {row.university}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" /> {row.streak_days}d streak
          </span>
          <span>{Math.round(row.quiz_accuracy)}% accuracy</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg font-bold text-amber-700 tabular-nums">{Math.round(row.score)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">readiness</p>
      </div>
    </Link>
  );
}

function TutorCard({ row, rank }: { row: TutorRow; rank: number }) {
  return (
    <Link
      to={`/profile/${row.tutor_id}`}
      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition hover:shadow-md ${rankBg(rank)}`}
    >
      <div className="w-7 flex justify-center shrink-0">{rankIcon(rank)}</div>
      <Avatar className="w-11 h-11 border-2 border-white shadow-sm">
        <AvatarImage src={row.avatar_url || undefined} />
        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
          {row.full_name?.charAt(0)?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-foreground truncate text-[14px]">{row.full_name || "Tutor"}</p>
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-muted-foreground mt-0.5">
          <span>{row.uploads_count} uploads</span>
          <span>{row.followers_count} followers</span>
          <span>{row.students_impacted} students</span>
          {row.avg_rating != null && <span>★ {Number(row.avg_rating).toFixed(1)}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="font-display text-lg font-bold text-amber-700 tabular-nums">{Math.round(row.score)}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">impact</p>
      </div>
    </Link>
  );
}

interface CourseOption { id: string; label: string }

function useEnrolledCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseOption[]>([]);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("student_courses")
        .select("course_id, courses:course_id(id, code, name)")
        .eq("student_id", user.id)
        .limit(50);
      const rows: CourseOption[] = (data ?? [])
        .map((r: any) => r.courses ? { id: r.courses.id, label: `${r.courses.code ?? ""} ${r.courses.name ?? ""}`.trim() } : null)
        .filter(Boolean);
      setCourses(rows);
    })();
  }, [user]);
  return courses;
}

export const Leaderboard = () => {
  const [scope, setScope] = useState<LeaderboardScope>("overall");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const students = useStudentLeaderboard(20, scope, courseId);
  const tutors = useTutorLeaderboard(20);
  const { data: me } = useMyActivityBadge();
  const enrolledCourses = useEnrolledCourses();

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-amber-100/70 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-bold text-foreground">Leaderboard</h2>
            <p className="text-sm text-muted-foreground">Celebrate the students and tutors building OverraPrep.</p>
          </div>
          <button
            type="button"
            onClick={() => setBadgeOpen(true)}
            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            <Info className="w-3.5 h-3.5" /> Badges
          </button>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="w-full mb-4 grid grid-cols-3 bg-amber-50/60">
            <TabsTrigger value="students">Top Students</TabsTrigger>
            <TabsTrigger value="tutors">Top Tutors</TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-1">
              <Users className="w-3 h-3" /> Teams
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="space-y-3">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-amber-200 bg-amber-50/40 p-0.5">
                {(["weekly", "overall"] as LeaderboardScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                      scope === s ? "bg-amber-500 text-white shadow-sm" : "text-amber-800 hover:bg-amber-100/60"
                    }`}
                  >
                    {s === "weekly" ? "This week" : "All time"}
                  </button>
                ))}
              </div>

              <Select
                value={courseId ?? "all"}
                onValueChange={(v) => setCourseId(v === "all" ? null : v)}
              >
                <SelectTrigger className="h-8 text-xs w-auto min-w-[140px] rounded-full border-amber-200 bg-white">
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All courses</SelectItem>
                  {enrolledCourses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2.5">
              {students.isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
              ) : students.isError ? (
                <StateError
                  title="Couldn't load rankings"
                  message={(students.error as any)?.message || "Check your connection and try again."}
                  onRetry={() => students.refetch()}
                />
              ) : (students.data?.length ?? 0) === 0 ? (
                <StateEmpty
                  title="No rankings yet"
                  message="Try a different course or time range, or start a quiz to be the first on the board."
                />
              ) : (
                students.data!.map((row, i) => <StudentCard key={row.user_id} row={row} rank={i + 1} />)
              )}
              {me && me.rank > 0 && (() => {
                const { Icon, label, className } = me.badge;
                return (
                  <button
                    type="button"
                    onClick={() => setBadgeOpen(true)}
                    className={`w-full text-left mt-3 flex items-center gap-3 p-3.5 rounded-2xl border ${className}`}
                  >
                    <div className="w-7 flex justify-center shrink-0"><Icon className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[14px]">You · {label}</p>
                      <p className="text-[11.5px] opacity-80 mt-0.5">
                        Rank #{me.rank} of {me.total} · top {Math.max(1, 100 - me.percentile)}% · tap for details
                      </p>
                    </div>
                    <p className="font-display text-lg font-bold tabular-nums">{Math.round(me.score)}</p>
                  </button>
                );
              })()}
            </div>
          </TabsContent>

          <TabsContent value="tutors" className="space-y-2.5">
            {tutors.isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
            ) : tutors.isError ? (
              <StateError
                title="Couldn't load tutor rankings"
                message={(tutors.error as any)?.message || "Check your connection and try again."}
                onRetry={() => tutors.refetch()}
              />
            ) : (tutors.data?.length ?? 0) === 0 ? (
              <StateEmpty title="No tutor rankings yet" message="Tutors appear once they have students and content." />
            ) : (
              tutors.data!.map((row, i) => <TutorCard key={row.tutor_id} row={row} rank={i + 1} />)
            )}
          </TabsContent>

          <TabsContent value="teams">
            <TeamLeaderboard />
          </TabsContent>
        </Tabs>
      </div>

      <ScoringActivityFeed limit={20} />

      <BadgeDetailsModal open={badgeOpen} onOpenChange={setBadgeOpen} />
    </div>
  );
};

export default Leaderboard;
