import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getActivityBadge, type ActivityBadge } from "@/lib/activityBadge";

export interface MyRank {
  rank: number;
  total: number;
  score: number;
  percentile: number;
  badge: ActivityBadge;
}

/**
 * Returns the current user's leaderboard rank, score, and computed activity badge.
 * Returns null (not loading) when the user isn't signed in.
 */
export function useMyActivityBadge() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-leaderboard-rank", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<MyRank | null> => {
      const { data, error } = await (supabase.rpc as any)("get_my_leaderboard_rank", {
        _user: user!.id,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const rank = Number(row?.rank ?? 0);
      const total = Number(row?.total ?? 0);
      const score = Number(row?.score ?? 0);
      const percentile = Number(row?.percentile ?? 0);
      return {
        rank,
        total,
        score,
        percentile,
        badge: getActivityBadge(score, rank > 0 ? rank : undefined),
      };
    },
  });
}
