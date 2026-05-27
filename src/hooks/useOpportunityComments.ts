import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface OppComment {
  id: string;
  opportunity_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
}

export function useOpportunityComments(opportunityId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["opportunity-comments", opportunityId],
    enabled: !!opportunityId,
    queryFn: async (): Promise<OppComment[]> => {
      const { data, error } = await supabase
        .from("opportunity_comments")
        .select("id, opportunity_id, author_id, parent_id, body, created_at")
        .eq("opportunity_id", opportunityId!)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      let profiles: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, profile_image_url")
          .in("id", ids);
        (ps ?? []).forEach((p: any) => {
          profiles[p.id] = {
            full_name: p.full_name,
            avatar_url: p.profile_image_url || p.avatar_url || null,
          };
        });
      }
      return rows.map((r) => ({
        ...r,
        author_name: profiles[r.author_id]?.full_name ?? "Student",
        author_avatar: profiles[r.author_id]?.avatar_url ?? null,
      }));
    },
  });

  // Realtime updates
  useEffect(() => {
    if (!opportunityId) return;
    const ch = supabase
      .channel(`opp-comments-${opportunityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunity_comments", filter: `opportunity_id=eq.${opportunityId}` },
        () => qc.invalidateQueries({ queryKey: ["opportunity-comments", opportunityId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [opportunityId, qc]);

  return query;
}

export function useAddOpportunityComment(opportunityId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: { body: string; parentId?: string | null }) => {
      if (!user) throw new Error("Sign in to comment");
      const body = vars.body.trim();
      if (!body) throw new Error("Comment is empty");
      if (body.length > 2000) throw new Error("Comment too long");
      const { error } = await supabase.from("opportunity_comments").insert({
        opportunity_id: opportunityId!,
        author_id: user.id,
        parent_id: vars.parentId ?? null,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity-comments", opportunityId] }),
    onError: (e: any) => toast.error(e.message || "Could not post comment"),
  });
}

export function useDeleteOpportunityComment(opportunityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunity_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity-comments", opportunityId] }),
    onError: (e: any) => toast.error(e.message || "Could not delete"),
  });
}

/* ---------- Reactions ---------- */

const EMOJIS = ["👍", "❤️", "🎯", "💡"] as const;
export type ReactionEmoji = typeof EMOJIS[number];
export const REACTION_EMOJIS = EMOJIS;

export function useOpportunityReactions(opportunityId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["opportunity-reactions", opportunityId],
    enabled: !!opportunityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_reactions")
        .select("emoji, user_id")
        .eq("opportunity_id", opportunityId!);
      if (error) throw error;
      const counts: Record<string, number> = {};
      let mine: ReactionEmoji | null = null;
      (data ?? []).forEach((r) => {
        counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
        if (user && r.user_id === user.id) mine = r.emoji as ReactionEmoji;
      });
      return { counts, mine };
    },
  });

  useEffect(() => {
    if (!opportunityId) return;
    const ch = supabase
      .channel(`opp-react-${opportunityId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunity_reactions", filter: `opportunity_id=eq.${opportunityId}` },
        () => qc.invalidateQueries({ queryKey: ["opportunity-reactions", opportunityId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [opportunityId, qc]);

  return query;
}

export function useToggleOpportunityReaction(opportunityId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (emoji: ReactionEmoji) => {
      if (!user) throw new Error("Sign in to react");
      // Check existing
      const { data: existing } = await supabase
        .from("opportunity_reactions")
        .select("id, emoji")
        .eq("opportunity_id", opportunityId!)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.emoji === emoji) {
        await supabase.from("opportunity_reactions").delete().eq("id", existing.id);
        return;
      }
      if (existing) {
        await supabase.from("opportunity_reactions").update({ emoji }).eq("id", existing.id);
        return;
      }
      const { error } = await supabase.from("opportunity_reactions").insert({
        opportunity_id: opportunityId!,
        user_id: user.id,
        emoji,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity-reactions", opportunityId] }),
    onError: (e: any) => toast.error(e.message || "Could not react"),
  });
}

/* ---------- View counter ---------- */

const VIEWED_KEY = "opp.viewed.v1";

export function trackOpportunityView(opportunityId: string) {
  try {
    const raw = sessionStorage.getItem(VIEWED_KEY);
    const set: string[] = raw ? JSON.parse(raw) : [];
    if (set.includes(opportunityId)) return;
    set.push(opportunityId);
    sessionStorage.setItem(VIEWED_KEY, JSON.stringify(set.slice(-50)));
    supabase.rpc("increment_opportunity_view", { p_opportunity_id: opportunityId }).then(() => {});
  } catch {
    /* noop */
  }
}