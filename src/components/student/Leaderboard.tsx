import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, Loader2, GraduationCap, Flame, ShieldCheck, Users } from "lucide-react";
import { useStudentLeaderboard, useTutorLeaderboard, type StudentRow, type TutorRow } from "@/hooks/useLeaderboards";
import { useMyActivityBadge } from "@/hooks/useMyActivityBadge";
import { TeamLeaderboard } from "./TeamLeaderboard";

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
          <span>{row.quiz_accuracy}% accuracy</span>
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

export const Leaderboard = () => {
  const students = useStudentLeaderboard(20);
  const tutors = useTutorLeaderboard(20);
  const { data: me } = useMyActivityBadge();

  return (
    <div className="bg-card rounded-2xl border border-amber-100/70 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Celebrate the students and tutors building OverraPrep.</p>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="w-full mb-4 grid grid-cols-3 bg-amber-50/60">
          <TabsTrigger value="students">Top Students</TabsTrigger>
          <TabsTrigger value="tutors">Top Tutors</TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1">
            <Users className="w-3 h-3" /> Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-2.5">
          {students.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : (students.data?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No rankings yet — start studying to appear here.</p>
          ) : (
            students.data!.map((row, i) => <StudentCard key={row.user_id} row={row} rank={i + 1} />)
          )}
        </TabsContent>

        <TabsContent value="tutors" className="space-y-2.5">
          {tutors.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-amber-600" /></div>
          ) : (tutors.data?.length ?? 0) === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">No tutor rankings yet.</p>
          ) : (
            tutors.data!.map((row, i) => <TutorCard key={row.tutor_id} row={row} rank={i + 1} />)
          )}
        </TabsContent>

        <TabsContent value="teams">
          <TeamLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leaderboard;