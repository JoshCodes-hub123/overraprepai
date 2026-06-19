import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const sb = supabase as any;

export function useUniversityRankings() {
  return useQuery({
    queryKey: ["growth", "uni-rankings"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("growth_university_rankings");
      if (error) throw error;
      return (data ?? []) as Array<{ university: string; active_students: number; avg_quiz: number; arena_count: number; score: number }>;
    },
  });
}

export function useDepartmentRankings(university?: string) {
  return useQuery({
    queryKey: ["growth", "dept-rankings", university ?? null],
    queryFn: async () => {
      const { data, error } = await sb.rpc("growth_department_rankings", { _university: university ?? null });
      if (error) throw error;
      return (data ?? []) as Array<{ university: string; department: string; active_students: number; avg_quiz: number; score: number }>;
    },
  });
}

export function useCampusImpact() {
  return useQuery({
    queryKey: ["growth", "impact"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("growth_campus_impact");
      if (error) throw error;
      return (data ?? []) as Array<{ university: string; active_students: number; challenge_participation: number; avg_success: number; community_activity: number; impact_score: number }>;
    },
  });
}

export function useAmbassadorLeaderboard(period: "all" | "month" = "all") {
  return useQuery({
    queryKey: ["growth", "amb-lb", period],
    queryFn: async () => {
      const { data, error } = await sb.rpc("growth_ambassador_leaderboard", { _period: period });
      if (error) throw error;
      return (data ?? []) as Array<{ user_id: string; full_name: string | null; university: string | null; tier: string; total_referrals: number; total_onboarded: number; score: number }>;
    },
  });
}

export function useCampusBattles() {
  return useQuery({
    queryKey: ["growth", "battles"],
    queryFn: async () => {
      const { data, error } = await sb.from("campus_battles").select("*").order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useBattleDetail(id?: string) {
  return useQuery({
    queryKey: ["growth", "battle", id],
    enabled: !!id,
    queryFn: async () => {
      const [b, s] = await Promise.all([
        sb.from("campus_battles").select("*").eq("id", id).maybeSingle(),
        sb.from("campus_battle_scores").select("*").eq("battle_id", id),
      ]);
      if (b.error) throw b.error;
      return { battle: b.data, scores: (s.data ?? []) as any[] };
    },
  });
}

export function useMyReferralSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["growth", "my-ref", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb.rpc("growth_my_referral_summary");
      if (error) throw error;
      return data as { total: number; active: number; tokens: number; milestones: string[]; next: { name: string; at: number; progress: number } };
    },
  });
}

export function useClaimMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: "hero_badge" | "premium_reward" | "campus_ambassador") => {
      const { data, error } = await sb.rpc("growth_claim_milestone", { _milestone: m });
      if (error) throw error;
      return data as boolean;
    },
    onSuccess: (ok) => {
      if (ok) {
        toast.success("Milestone claimed!");
        qc.invalidateQueries({ queryKey: ["growth", "my-ref"] });
      } else {
        toast.error("Not enough successful referrals yet.");
      }
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRecomputeBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.rpc("growth_recompute_battle", { _battle_id: id });
      if (error) throw error;
    },
    onSuccess: (_d, id) => qc.invalidateQueries({ queryKey: ["growth", "battle", id] }),
  });
}

export function useSettleBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.rpc("growth_settle_battle", { _battle_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Battle settled");
      qc.invalidateQueries({ queryKey: ["growth"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePromoteAmbassador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tier }: { userId: string; tier: string }) => {
      const { error } = await sb.rpc("growth_promote_ambassador", { _user_id: userId, _tier: tier });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ambassador promoted");
      qc.invalidateQueries({ queryKey: ["growth", "amb-lb"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateBattle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await sb.from("campus_battles").insert({ ...payload, status: "live" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Battle created");
      qc.invalidateQueries({ queryKey: ["growth", "battles"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function logShareEvent(kind: string, channel?: string, target_id?: string) {
  // fire and forget
  sb.from("growth_share_events").insert({ kind, channel, target_id }).then(() => {});
}
