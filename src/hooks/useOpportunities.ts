import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OpportunityCategory =
  | "internship" | "scholarship" | "hackathon"
  | "competition" | "tech_program" | "career";

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  description: string;
  deadline: string | null;
  apply_url: string | null;
  cover_image_url: string | null;
  university: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  view_count?: number;
  comment_count?: number;
  bookmark_count?: number;
}

/** Subscribe a component to realtime invalidation for opportunities/comments/bookmarks. */
export function useOpportunitiesRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("opportunities-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, () => {
        qc.invalidateQueries({ queryKey: ["opportunities"] });
        qc.invalidateQueries({ queryKey: ["opportunity"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunity_bookmarks" }, () => {
        qc.invalidateQueries({ queryKey: ["opportunity-bookmarks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

export function useOpportunities(filters?: { category?: OpportunityCategory; limit?: number }) {
  return useQuery({
    queryKey: ["opportunities", filters],
    queryFn: async () => {
      let q = (supabase.from as any)("opportunities")
        .select("*")
        .eq("status", "published")
        .order("deadline", { ascending: true, nullsFirst: false });
      if (filters?.category) q = q.eq("category", filters.category);
      if (filters?.limit) q = q.limit(filters.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Opportunity[];
    },
  });
}

export function useOpportunity(id: string | undefined) {
  return useQuery({
    queryKey: ["opportunity", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("opportunities")
        .select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as Opportunity | null;
    },
  });
}

export function useOpportunityBookmarks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["opportunity-bookmarks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("opportunity_bookmarks")
        .select("opportunity_id").eq("user_id", user!.id);
      return new Set<string>((data ?? []).map((r: any) => r.opportunity_id));
    },
  });
}

export function useToggleOpportunityBookmark() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      if (!user) throw new Error("Sign in to bookmark");
      if (current) {
        await (supabase.from as any)("opportunity_bookmarks").delete()
          .eq("opportunity_id", id).eq("user_id", user.id);
      } else {
        await (supabase.from as any)("opportunity_bookmarks")
          .insert({ opportunity_id: id, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["opportunity-bookmarks"] }),
  });
}