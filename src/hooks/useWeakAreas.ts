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
  attempts: number;
  lastSeen: string | null;
}

/** Real practice history only — a topic must have been attempted to appear. */
function statusFor(score: number): WeakStatus | null {
  if (score < 50) return "Needs practice";
  if (score < 75) return "Needs review";
  if (score < 90) return "Improving";
  return null;
}

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
      const status = statusFor(Number(a.mastery_score) || 0);
      if (!status) continue;
      out.push({
        courseId: hit.course_id,
        courseCode: codeById.get(hit.course_id) ?? "",
        topicId: hit.id,
        topicName: hit.name,
        status,
        attempts: a.attempts ?? 0,
        lastSeen: a.last_seen,
      });
    }
    const order: Record<WeakStatus, number> = {
      "Needs practice": 0,
      "Needs review": 1,
      Improving: 2,
    };
    return out.sort((x, y) => order[x.status] - order[y.status]);
  }, [activity, topics, courses]);

  return {
    areas,
    isLoading: coursesLoading || activityLoading || topicsLoading,
  };
}
