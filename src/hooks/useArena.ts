import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ArenaKind = "daily" | "weekly";
export type ArenaStatus = "draft" | "scheduled" | "live" | "ended" | "settled";
export type ArenaEntryStatus = "in_progress" | "submitted" | "disqualified";

export interface ArenaChallenge {
  id: string;
  kind: ArenaKind;
  title: string;
  description: string | null;
  course_id: string | null;
  entry_token_cost: number;
  prize_pool_tokens: number;
  num_questions: number;
  time_limit_seconds: number;
  starts_at: string;
  ends_at: string;
  status: ArenaStatus;
  featured: boolean;
  payout_split: Record<string, number>;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArenaEntry {
  id: string;
  challenge_id: string;
  user_id: string;
  status: ArenaEntryStatus;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  tokens_spent: number;
  entered_at: string;
  submitted_at: string | null;
}

export interface ArenaLeaderRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  score: number;
  accuracy: number;
  time_taken_seconds: number;
  rank: number;
  submitted_at: string | null;
}

export interface ArenaGlobalRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  university: string | null;
  entries_count: number;
  total_score: number;
  total_winnings: number;
  rank: number;
}

const sb: any = supabase;

export function useArenaChallenges() {
  return useQuery({
    queryKey: ["arena-challenges"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_challenges")
        .select("*")
        .in("status", ["scheduled", "live", "ended", "settled"])
        .order("featured", { ascending: false })
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArenaChallenge[];
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useArenaChallenge(id?: string) {
  return useQuery({
    queryKey: ["arena-challenge", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_challenges")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as ArenaChallenge | null;
    },
    refetchInterval: (q) => {
      const c = q.state.data as ArenaChallenge | null;
      return c?.status === "live" ? 10_000 : false;
    },
  });
}

export function useMyArenaEntry(challengeId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["arena-my-entry", challengeId, user?.id],
    enabled: !!challengeId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_entries")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as ArenaEntry | null;
    },
  });
}

export function useMyArenaEntries(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["arena-my-entries", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_entries")
        .select("*, arena_challenges(id,title,kind,status,prize_pool_tokens)")
        .eq("user_id", user!.id)
        .order("entered_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as (ArenaEntry & { arena_challenges: ArenaChallenge })[];
    },
  });
}

export function useArenaLeaderboard(challengeId?: string, isLive = false) {
  return useQuery({
    queryKey: ["arena-leaderboard", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await sb.rpc("arena_leaderboard", {
        _challenge_id: challengeId,
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as ArenaLeaderRow[];
    },
    refetchInterval: isLive ? 10_000 : false,
  });
}

export function useArenaGlobalLeaderboard(
  scope: "daily" | "weekly" | "overall" = "weekly",
  courseId: string | null = null,
  university: string | null = null,
) {
  return useQuery({
    queryKey: ["arena-global-leaderboard", scope, courseId, university],
    queryFn: async () => {
      const { data, error } = await sb.rpc("arena_global_leaderboard", {
        _scope: scope,
        _course_id: courseId,
        _university: university,
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as ArenaGlobalRow[];
    },
    staleTime: 60_000,
  });
}

export function useArenaRewards(challengeId?: string) {
  return useQuery({
    queryKey: ["arena-rewards", challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_rewards")
        .select("*, profiles:profiles!arena_rewards_user_id_fkey(full_name, avatar_url)")
        .eq("challenge_id", challengeId)
        .order("rank", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEnterArena() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const { data, error } = await sb.rpc("arena_enter_challenge", { _challenge_id: challengeId });
      if (error) throw error;
      const res = data as { ok: boolean; error?: string; entry_id?: string; required?: number; balance?: number };
      if (!res?.ok) {
        const msg =
          res?.error === "insufficient_tokens"
            ? `Need ${res.required} tokens (you have ${res.balance ?? 0}).`
            : res?.error === "not_open"
              ? "This challenge isn't open right now."
              : res?.error === "auth_required"
                ? "Please sign in to enter."
                : "Could not enter challenge.";
        throw new Error(msg);
      }
      return res;
    },
    onSuccess: (_d, challengeId) => {
      qc.invalidateQueries({ queryKey: ["arena-my-entry", challengeId, user?.id] });
      qc.invalidateQueries({ queryKey: ["token-balance"] });
      qc.invalidateQueries({ queryKey: ["arena-challenge", challengeId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not enter"),
  });
}

export function useSubmitArenaEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      entry_id: string;
      answers: { question_id: string; selected: string | null; elapsed_ms: number }[];
      time_taken_seconds: number;
    }) => {
      const { data, error } = await sb.rpc("arena_submit_entry", {
        _entry_id: vars.entry_id,
        _answers: vars.answers,
        _time_taken_seconds: vars.time_taken_seconds,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error ?? "Could not submit");
      return res as { score: number; total: number; accuracy: number; time_taken_seconds: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arena-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["arena-my-entry"] });
      qc.invalidateQueries({ queryKey: ["arena-my-entries"] });
    },
  });
}

export function useArenaPlayQuestions(challengeId?: string, enabled = true) {
  return useQuery({
    queryKey: ["arena-play-questions", challengeId],
    enabled: !!challengeId && enabled,
    staleTime: Infinity,
    queryFn: async () => {
      // 1. Try primary RPC
      try {
        const { data, error } = await sb.rpc("arena_get_play_questions", {
          _challenge_id: challengeId,
        });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as Array<{
            ord: number;
            question_id: string;
            question_text: string;
            option_a: string;
            option_b: string;
            option_c: string;
            option_d: string;
            image_url: string | null;
          }>;
        }
      } catch (err) {
        console.warn("arena_get_play_questions RPC issue, attempting fallback:", err);
      }

      // 2. Fallback: query from questions table by course or active university questions
      try {
        const { data: challenge } = await sb
          .from("arena_challenges")
          .select("course_id, num_questions")
          .eq("id", challengeId)
          .maybeSingle();

        const limit = challenge?.num_questions || 10;
        let qQuery = sb
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, image_url")
          .limit(limit);

        if (challenge?.course_id) {
          qQuery = qQuery.eq("course_id", challenge.course_id);
        }

        const { data: qData } = await qQuery;
        if (qData && qData.length > 0) {
          return qData.map((q: any, i: number) => ({
            ord: i + 1,
            question_id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            image_url: q.image_url,
          }));
        }

        // Secondary fallback to any university questions
        const { data: anyQuestions } = await sb
          .from("questions")
          .select("id, question_text, option_a, option_b, option_c, option_d, image_url")
          .limit(limit);

        if (anyQuestions && anyQuestions.length > 0) {
          return anyQuestions.map((q: any, i: number) => ({
            ord: i + 1,
            question_id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            image_url: q.image_url,
          }));
        }
      } catch (err) {
        console.error("Fallback question retrieval failed:", err);
      }

      return [];
    },
  });
}

// --- Admin ---

export function useAdminArenaChallenges() {
  return useQuery({
    queryKey: ["admin-arena-challenges"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_challenges")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ArenaChallenge[];
    },
  });
}

export function useUpsertArenaChallenge() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<ArenaChallenge> & { id?: string }) => {
      const { id, ...rest } = payload as any;
      if (id) {
        const { error } = await sb.from("arena_challenges").update(rest).eq("id", id);
        if (error) throw error;
        return id as string;
      }
      const { data, error } = await sb
        .from("arena_challenges")
        .insert({ ...rest, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });
}

export function usePublishArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb.rpc("arena_publish_challenge", { _challenge_id: id });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error ?? "Publish failed");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
      toast.success("Challenge published");
    },
    onError: (e: any) => toast.error(e?.message ?? "Publish failed"),
  });
}

export function useSettleArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await sb.rpc("arena_settle_challenge", { _challenge_id: id });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) throw new Error(res?.error ?? "Settle failed");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-rewards"] });
      toast.success("Challenge settled");
    },
    onError: (e: any) => toast.error(e?.message ?? "Settle failed"),
  });
}

export function useEndArenaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("arena_challenges").update({ status: "ended" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-arena-challenges"] });
      qc.invalidateQueries({ queryKey: ["arena-challenges"] });
      toast.success("Challenge ended");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not end"),
  });
}

export function useDisqualifyArenaEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await sb.rpc("arena_disqualify_entry", { _entry_id: entryId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arena-leaderboard"] });
      toast.success("Entry disqualified and tokens refunded");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
}

/** Featured weekly challenge for dashboard spotlight. */
export function useFeaturedArenaChallenge() {
  return useQuery({
    queryKey: ["arena-featured"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("arena_challenges")
        .select("*")
        .in("status", ["scheduled", "live"])
        .order("featured", { ascending: false })
        .order("starts_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return (data?.[0] ?? null) as ArenaChallenge | null;
    },
    staleTime: 60_000,
  });
}

/** Realtime invalidation when entries change for a live challenge. */
export function useArenaRealtime(challengeId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!challengeId) return;
    const ch = (supabase as any)
      .channel(`arena-${challengeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "arena_entries", filter: `challenge_id=eq.${challengeId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["arena-leaderboard", challengeId] });
          qc.invalidateQueries({ queryKey: ["arena-challenge", challengeId] });
        },
      )
      .subscribe();
    return () => { try { (supabase as any).removeChannel(ch); } catch {} };
  }, [challengeId, qc]);
}
