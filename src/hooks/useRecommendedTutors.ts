import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface RecommendedTutor {
  tutor_id: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_image_url: string | null;
  department: string | null;
  course_id: string;
  course_code: string | null;
  course_name: string | null;
  avg_rating: number;
  rating_count: number;
  reason: string;
}

/**
 * Tutors who actually teach the courses this student is taking, ranked by how
 * much help the student's quiz performance suggests they need.
 */
export function useRecommendedTutors(limit = 8) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recommended-tutors", user?.id, limit],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("recommend_tutors_for_me", { _limit: limit });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        avg_rating: Number(r.avg_rating) || 0,
        rating_count: Number(r.rating_count) || 0,
      })) as RecommendedTutor[];
    },
  });
}
