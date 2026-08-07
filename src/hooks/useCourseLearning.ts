import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CourseTopic {
  id: string;
  name: string;
  description: string | null;
  order_index: number | null;
}

/** Topics for a course. RLS already scopes this to the student's environment. */
export function useCourseTopics(courseId?: string) {
  return useQuery({
    queryKey: ["course-topics", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, description, order_index")
        .eq("course_id", courseId!)
        .order("order_index", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CourseTopic[];
    },
  });
}

/** topic_id → number of approved practice questions. Real counts only. */
export function useTopicQuestionCounts(courseId?: string) {
  return useQuery({
    queryKey: ["topic-question-counts", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("course_topic_question_counts", {
        _course_id: courseId,
      });
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        map[r.topic_id] = Number(r.question_count) || 0;
      });
      return map;
    },
  });
}

export interface TopicActivity {
  topic: string;
  mastery_score: number;
  attempts: number;
  last_seen: string | null;
}

/**
 * The student's own practice history, by topic name. This is what powers
 * "continue where you stopped" everywhere in the app.
 */
export function useTopicActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topic-activity", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("topic_mastery")
        .select("topic, mastery_score, attempts, last_seen")
        .eq("user_id", user!.id)
        .order("last_seen", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as TopicActivity[];
    },
  });
}

/**
 * The most recently practised topic of a course, matched against that course's
 * own topic list so one course can never surface another course's activity.
 */
export function useLastStudiedTopic(courseId?: string) {
  const { data: topics = [] } = useCourseTopics(courseId);
  const { data: activity = [] } = useTopicActivity();

  return useMemo(() => {
    if (!topics.length || !activity.length) return null;
    const byName = new Map(topics.map((t) => [t.name.trim().toLowerCase(), t]));
    for (const a of activity) {
      const hit = byName.get((a.topic ?? "").trim().toLowerCase());
      if (hit) return { topic: hit, activity: a };
    }
    return null;
  }, [topics, activity]);
}

/** Records a finished topic practice run so continuation stays reliable. */
export function useRecordTopicPractice() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return async (topicName: string, correct: number, total: number) => {
    if (!user || !topicName || total <= 0) return;
    const score = Math.round((correct / total) * 100);
    const { data: existing } = await (supabase as any)
      .from("topic_mastery")
      .select("id, mastery_score, attempts")
      .eq("user_id", user.id)
      .eq("topic", topicName)
      .maybeSingle();

    if (existing) {
      const attempts = (existing.attempts ?? 0) + 1;
      // Rolling average keeps mastery honest instead of jumping on one run.
      const blended =
        ((Number(existing.mastery_score) || 0) * (attempts - 1) + score) / attempts;
      await (supabase as any)
        .from("topic_mastery")
        .update({ mastery_score: Math.round(blended), attempts, last_seen: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("topic_mastery").insert({
        user_id: user.id,
        topic: topicName,
        mastery_score: score,
        attempts: 1,
        last_seen: new Date().toISOString(),
      });
    }
    qc.invalidateQueries({ queryKey: ["topic-activity", user.id] });
  };
}

export interface PracticeQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  image_url: string | null;
}

/** Approved questions for one topic, shuffled client-side. */
export function useTopicQuestions(topicId?: string, take = 20) {
  return useQuery({
    queryKey: ["topic-questions", topicId, take],
    enabled: !!topicId,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, image_url")
        .eq("topic_id", topicId!)
        .eq("is_approved", true)
        .limit(120);
      if (error) throw error;
      const rows = (data ?? []) as PracticeQuestion[];
      for (let i = rows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rows[i], rows[j]] = [rows[j], rows[i]];
      }
      return rows.slice(0, take);
    },
  });
}
