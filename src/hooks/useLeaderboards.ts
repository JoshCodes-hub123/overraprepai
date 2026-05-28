import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StudentRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  score: number;
  quiz_accuracy: number;
  cards_reviewed: number;
  streak_days: number;
  ai_activity: number;
  engagement: number;
}

export interface TutorRow {
  tutor_id: string;
  full_name: string | null;
  avatar_url: string | null;
  uploads_count: number;
  students_impacted: number;
  followers_count: number;
  avg_rating: number | null;
  score: number;
}

export type LeaderboardScope = "weekly" | "overall";

export function useStudentLeaderboard(
  limit = 20,
  scope: LeaderboardScope = "overall",
  courseId: string | null = null,
) {
  return useQuery({
    queryKey: ["leaderboard-students", limit, scope, courseId],
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_student_leaderboard_filtered",
        { _limit: limit, _scope: scope, _course_id: courseId },
      );
      if (error) throw error;
      return (data ?? []) as StudentRow[];
    },
  });
}

export function useTutorLeaderboard(limit = 20) {
  return useQuery({
    queryKey: ["leaderboard-tutors", limit],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_tutor_leaderboard", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as TutorRow[];
    },
  });
}

export interface ScoringActivityRow {
  id: string;
  actor_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  verb: string;
  object_type: string;
  course_id: string | null;
  meta: Record<string, any> | null;
  created_at: string;
}

export function useRecentScoringActivity(limit = 25) {
  return useQuery({
    queryKey: ["scoring-activity", limit],
    staleTime: 1000 * 30,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_recent_scoring_activity", {
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as ScoringActivityRow[];
    },
  });
}
