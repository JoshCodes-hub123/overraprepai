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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-topics", user?.id, courseId],
    enabled: !!user && !!courseId,
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topic-question-counts", user?.id, courseId],
    enabled: !!user && !!courseId,
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
  /** Total questions answered in this topic across all sessions. */
  questions_attempted: number;
  /** Total questions answered incorrectly in this topic. */
  questions_incorrect: number;
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
        .select("topic, mastery_score, attempts, last_seen, questions_attempted, questions_incorrect")
        .eq("user_id", user!.id)
        .order("last_seen", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        questions_attempted: Number(r.questions_attempted) || 0,
        questions_incorrect: Number(r.questions_incorrect) || 0,
      })) as TopicActivity[];
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
    const incorrect = Math.max(0, total - correct);
    const { data: existing } = await (supabase as any)
      .from("topic_mastery")
      .select("id, mastery_score, attempts, questions_attempted, questions_incorrect")
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
        .update({
          mastery_score: Math.round(blended),
          attempts,
          last_seen: new Date().toISOString(),
          questions_attempted: (Number(existing.questions_attempted) || 0) + total,
          questions_incorrect: (Number(existing.questions_incorrect) || 0) + incorrect,
        })
        .eq("id", existing.id);
    } else {
      await (supabase as any).from("topic_mastery").insert({
        user_id: user.id,
        topic: topicName,
        mastery_score: score,
        attempts: 1,
        last_seen: new Date().toISOString(),
        questions_attempted: total,
        questions_incorrect: incorrect,
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topic-questions", user?.id, topicId, take],
    enabled: !!user && !!topicId,
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

export interface CourseProgress {
  /** Topics in this course the student has actually practised. */
  studied: number;
  /** Practised topics with at least one recorded mistake. */
  needsReview: number;
  total: number;
  /** Real counted questions answered in this course. */
  attempted: number;
  correct: number;
  incorrect: number;
}

/**
 * Lightweight, honest course progress. Counts only topics with a real
 * `topic_mastery` row, so a fresh course shows nothing rather than zeros.
 */
export function useCourseProgress(courseId?: string): CourseProgress {
  const { data: topics = [] } = useCourseTopics(courseId);
  const { data: activity = [] } = useTopicActivity();

  return useMemo(() => {
    const empty = {
      studied: 0,
      needsReview: 0,
      total: topics.length,
      attempted: 0,
      correct: 0,
      incorrect: 0,
    };
    if (!topics.length || !activity.length) return empty;
    const byName = new Map(
      activity.map((a) => [(a.topic ?? "").trim().toLowerCase(), a]),
    );
    let studied = 0;
    let needsReview = 0;
    let attempted = 0;
    let incorrect = 0;
    for (const t of topics) {
      const hit = byName.get(t.name.trim().toLowerCase());
      if (!hit) continue;
      studied += 1;
      attempted += hit.questions_attempted;
      incorrect += hit.questions_incorrect;
      if (hit.questions_incorrect > 0) needsReview += 1;
    }
    return {
      studied,
      needsReview,
      total: topics.length,
      attempted,
      incorrect,
      correct: Math.max(0, attempted - incorrect),
    };
  }, [topics, activity]);
}

export interface CourseProgressSummary {
  studied: number;
  total: number;
  percent: number;
}

/**
 * Batch progress calculation for all enrolled courses on the dashboard in a single query.
 * Matches course topics with topic_mastery rows to return real studied/total counts.
 */
export function useEnrolledCoursesProgress(courseIds: string[]) {
  const { user } = useAuth();
  const { data: activity = [] } = useTopicActivity();
  const stableIdsKey = courseIds.filter(Boolean).slice().sort().join(",");

  return useQuery({
    queryKey: ["enrolled-courses-progress", user?.id, stableIdsKey],
    enabled: !!user && courseIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, CourseProgressSummary>> => {
      const validIds = courseIds.filter(Boolean);
      if (validIds.length === 0) return {};

      const { data: topics, error } = await supabase
        .from("topics")
        .select("id, name, course_id")
        .in("course_id", validIds);

      if (error) {
        console.warn("Could not batch load course topics for progress:", error);
        return {};
      }

      const activityMap = new Set(
        activity.map((a) => (a.topic ?? "").trim().toLowerCase())
      );

      const result: Record<string, CourseProgressSummary> = {};

      for (const cid of validIds) {
        result[cid] = { studied: 0, total: 0, percent: 0 };
      }

      for (const t of topics ?? []) {
        if (!result[t.course_id]) {
          result[t.course_id] = { studied: 0, total: 0, percent: 0 };
        }
        result[t.course_id].total += 1;
        if (activityMap.has(t.name.trim().toLowerCase())) {
          result[t.course_id].studied += 1;
        }
      }

      for (const cid of validIds) {
        const item = result[cid];
        if (item.total > 0) {
          item.percent = Math.round((item.studied / item.total) * 100);
        }
      }

      return result;
    },
  });
}

