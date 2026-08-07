import { useMemo } from "react";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useTopicActivity } from "@/hooks/useCourseLearning";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WeakStatus = "Needs practice" | "Needs review" | "Improving";

export interface WeakArea {
  courseId: string;
  courseCode: string;
  topicId: string | null;
  topicName: string;
  status: WeakStatus;
  /** Practice sessions recorded for this topic. */
  attempts: number;
  /** Real counted questions answered in this topic. */
  attempted: number;
  incorrect: number;
  /** Only present when there is enough data to be meaningful. */
  accuracy: number | null;
  /** True when we have too few questions to judge accuracy. */
  lowData: boolean;
  /** Plain-language next action, derived from the counts above. */
  recommendation: string;
  lastSeen: string | null;
}

/** Minimum answered questions before we quote an accuracy figure. */
const ACCURACY_THRESHOLD = 5;

/**
 * Weak areas derived strictly from the student's own `topic_mastery` rows,
 * matched against topics of courses they are actually enrolled in. RLS scopes
 * both sides, so no other student's or environment's data can appear.
 */
export function useWeakAreas() {
  const { data: courses = [], isLoading: coursesLoading } = useCourseSnapshots();
  const { data: activity = [], isLoading: activityLoading } = useTopicActivity();

  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);

  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["weak-area-topics", courseIds.join(",")],
    enabled: courseIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name, course_id")
        .in("course_id", courseIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const areas = useMemo<WeakArea[]>(() => {
    if (!activity.length || !topics.length) return [];
    const codeById = new Map(courses.map((c) => [c.id, c.code]));
    const byName = new Map<string, { id: string; name: string; course_id: string }>();
    topics.forEach((t: any) => byName.set(String(t.name).trim().toLowerCase(), t));

    const out: WeakArea[] = [];
    for (const a of activity) {
      const hit = byName.get((a.topic ?? "").trim().toLowerCase());
      if (!hit) continue;

      const attempted = a.questions_attempted;
      const incorrect = a.questions_incorrect;
      // Evidence-based only: a topic appears because real mistakes were recorded.
      if (incorrect <= 0) continue;

      const lowData = attempted < ACCURACY_THRESHOLD;
      const accuracy =
        !lowData && attempted > 0
          ? Math.round(((attempted - incorrect) / attempted) * 100)
          : null;

      const missRate = attempted > 0 ? incorrect / attempted : 1;
      const status: WeakStatus =
        missRate >= 0.5 ? "Needs practice" : missRate >= 0.25 ? "Needs review" : "Improving";

      const recommendation = lowData
        ? "Practise a few more questions here so we can read this topic properly."
        : missRate >= 0.5
        ? "Review the topic first, then practise again."
        : "Practise this topic again to lock it in.";

      out.push({
        courseId: hit.course_id,
        courseCode: codeById.get(hit.course_id) ?? "",
        topicId: hit.id,
        topicName: hit.name,
        status,
        attempts: a.attempts ?? 0,
        attempted,
        incorrect,
        accuracy,
        lowData,
        recommendation,
        lastSeen: a.last_seen,
      });
    }
    const order: Record<WeakStatus, number> = {
      "Needs practice": 0,
      "Needs review": 1,
      Improving: 2,
    };
    return out.sort(
      (x, y) => order[x.status] - order[y.status] || y.incorrect - x.incorrect,
    );
  }, [activity, topics, courses]);

  return {
    areas,
    isLoading: coursesLoading || activityLoading || topicsLoading,
  };
}
