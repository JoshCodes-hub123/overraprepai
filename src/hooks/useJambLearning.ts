import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * JAMB learning data.
 *
 * Everything here is filtered on `environment_type = 'jamb'`, so university
 * content can never appear in this world — the same isolation the university
 * side already relies on, read from the other side of the boundary.
 */

export interface JambSubject {
  id: string;
  name: string;
  description: string | null;
  level: string | null;
}

/** All active JAMB subjects that exist in the platform. */
export function useJambSubjects() {
  return useQuery({
    queryKey: ["jamb-subjects"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subjects")
        .select("id, name, description, level")
        .eq("environment_type", "jamb")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as JambSubject[];
    },
  });
}

/**
 * The student's own four UTME subjects, matched to real subject rows where we
 * have them. Subjects with no content yet are still listed (honestly marked as
 * "not available yet" by the screen) instead of silently disappearing.
 */
export function useMyJambSubjects() {
  const { profile } = useAuth();
  const { data: all = [], isLoading } = useJambSubjects();

  const chosen: string[] = useMemo(() => {
    const p = profile as any;
    return Array.isArray(p?.jamb_subjects) ? p.jamb_subjects.filter(Boolean) : [];
  }, [profile]);

  const rows = useMemo(() => {
    const byName = new Map(all.map((s) => [s.name.trim().toLowerCase(), s]));
    return chosen.map((name) => ({
      name,
      subject: byName.get(name.trim().toLowerCase()) ?? null,
    }));
  }, [chosen, all]);

  return { rows, chosen, isLoading };
}

export interface JambTopic {
  id: string;
  name: string;
  description: string | null;
  order_index: number | null;
}

/** Topics belonging to one JAMB subject. */
export function useSubjectTopics(subjectId?: string) {
  return useQuery({
    queryKey: ["jamb-subject-topics", subjectId],
    enabled: !!subjectId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, description, order_index")
        .eq("subject_id", subjectId!)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JambTopic[];
    },
  });
}

/** One JAMB subject row. */
export function useJambSubject(subjectId?: string) {
  return useQuery({
    queryKey: ["jamb-subject", subjectId],
    enabled: !!subjectId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("subjects")
        .select("id, name, description, level")
        .eq("id", subjectId!)
        .eq("environment_type", "jamb")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as JambSubject | null;
    },
  });
}

/** topic_id → approved question count, counted for real (no estimates). */
export function useSubjectQuestionCounts(subjectId?: string) {
  const { data: topics = [] } = useSubjectTopics(subjectId);
  const ids = topics.map((t) => t.id);

  return useQuery({
    queryKey: ["jamb-topic-question-counts", subjectId, ids.length],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("topic_id")
        .in("topic_id", ids)
        .eq("is_approved", true)
        .limit(5000);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        map[r.topic_id] = (map[r.topic_id] ?? 0) + 1;
      });
      return map;
    },
  });
}
