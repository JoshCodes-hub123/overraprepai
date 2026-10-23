import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { useAcademicIdentity } from "@/hooks/useAcademicIdentity";
import { useTopicActivity } from "@/hooks/useCourseLearning";
import { INSTITUTIONS } from "@/config/environments";

export interface CoachSuggestion {
  /** e.g. "CHE 102" (university) or "Chemistry" (JAMB) */
  scope: string;
  /** e.g. "Chemical Equilibrium" — omitted when we don't know a real topic */
  topic: string | null;
  /** The prompt sent to Overra when tapped */
  prompt: string;
  /** Short label shown on the row */
  label: string;
  courseId?: string;
  topicId?: string;
}

/**
 * The student's REAL academic context for the AI Coach home screen.
 *
 * Everything here comes from the database through RLS — enrolled courses, real
 * topics, real practice history. Nothing is fabricated: when we don't know a
 * topic we simply don't suggest one.
 */
export function useCoachContext() {
  const { user, profile } = useAuth();
  const { isJamb, institution } = useEnvironment();
  const identity = useAcademicIdentity();
  const { data: activity = [] } = useTopicActivity();

  // Enrolled courses (university only). RLS keeps this inside the student's
  // own institution, so a FUTA student can never see OAU courses here.
  const { data: courses = [] } = useQuery({
    queryKey: ["coach-courses", user?.id],
    enabled: !!user && !isJamb,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_courses")
        .select("course_id, courses(id, code, name)")
        .eq("student_id", user!.id)
        .limit(20);
      return (data ?? [])
        .map((r: any) => r.courses)
        .filter(Boolean) as { id: string; code: string; name: string }[];
    },
  });

  // Real topics belonging to those courses, so a suggestion can pair a course
  // with a topic that genuinely exists in it.
  const courseIds = courses.map((c) => c.id);
  const { data: topics = [] } = useQuery({
    queryKey: ["coach-topics", courseIds.join(",")],
    enabled: courseIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, course_id")
        .in("course_id", courseIds)
        .limit(200);
      return (data ?? []) as { id: string; name: string; course_id: string }[];
    },
  });

  /** "FUTA · Computer Engineering · 200L" */
  const contextLine = useMemo(() => {
    return identity.text || (institution ? INSTITUTIONS[institution].short : "");
  }, [identity.text, institution]);

  /**
   * Up to two suggestions built strictly from real course/topic data:
   * 1. the topic the student most recently practised (with its real course)
   * 2. another real course/topic pair they haven't just been doing
   */
  const suggestions: CoachSuggestion[] = useMemo(() => {
    if (!courses.length) return [];

    const byCourse = new Map(courses.map((c) => [c.id, c]));
    const out: CoachSuggestion[] = [];

    // 1. Most recent real practice activity, matched to a real topic row.
    const recent = activity.find((a) =>
      topics.some((t) => t.name.trim().toLowerCase() === (a.topic ?? "").trim().toLowerCase()),
    );
    if (recent) {
      const t = topics.find(
        (x) => x.name.trim().toLowerCase() === (recent.topic ?? "").trim().toLowerCase(),
      )!;
      const c = byCourse.get(t.course_id);
      if (c) {
        out.push({
          scope: c.code,
          topic: t.name,
          label: "Explain this topic to me simply",
          prompt: `Explain ${t.name} in ${c.code} to me simply.`,
          courseId: c.id,
          topicId: t.id,
        });
      }
    }

    // 2. A different real course + one of its real topics.
    const other = topics.find(
      (t) => t.course_id !== out[0]?.courseId && byCourse.has(t.course_id),
    );
    if (other) {
      const c = byCourse.get(other.course_id)!;
      out.push({
        scope: c.code,
        topic: other.name,
        label: "Give me 5 practice questions",
        prompt: `Give me 5 practice questions on ${other.name} in ${c.code}.`,
        courseId: c.id,
        topicId: other.id,
      });
    }

    // 3. Fall back to a course with no known topic — still real, just coarser.
    if (!out.length) {
      const c = courses[0];
      out.push({
        scope: c.code,
        topic: null,
        label: "Where should I start in this course?",
        prompt: `I'm studying ${c.code} (${c.name}). Where should I start?`,
        courseId: c.id,
      });
    }

    return out.slice(0, 2);
  }, [courses, topics, activity]);

  return { contextLine, courses, topics, suggestions, isJamb: false, jambSubjects: [] };
}

export default useCoachContext;
