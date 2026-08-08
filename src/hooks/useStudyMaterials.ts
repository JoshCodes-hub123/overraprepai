import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useEnvironment from "@/hooks/useEnvironment";

/**
 * Student-facing view of the SAME `study_materials` rows admins and tutors
 * upload. Nothing is duplicated: we only read, scoped to the student's own
 * environment (RLS enforces the same rule server-side).
 */

export interface MaterialCourse {
  id: string;
  code: string;
  name: string;
  count: number;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  file_url: string;
  topic_id: string | null;
  created_at: string;
  owner_name?: string | null;
}

/** Courses (JAMB: subjects) in the student's environment that have materials. */
export function useMaterialCourses() {
  const { environment, institution } = useEnvironment();

  return useQuery({
    queryKey: ["material-courses", environment, institution],
    staleTime: 60_000,
    queryFn: async (): Promise<MaterialCourse[]> => {
      let q = (supabase as any)
        .from("courses")
        .select("id, code, name")
        .eq("is_active", true)
        .eq("environment_type", environment)
        .order("code");
      if (environment === "university" && institution) q = q.eq("university", institution);
      const { data: courses, error } = await q;
      if (error) throw error;

      const ids = (courses ?? []).map((c: any) => c.id);
      if (ids.length === 0) return [];

      const { data: mats } = await supabase
        .from("study_materials")
        .select("course_id")
        .in("course_id", ids);

      const counts: Record<string, number> = {};
      (mats ?? []).forEach((m: any) => {
        counts[m.course_id] = (counts[m.course_id] ?? 0) + 1;
      });

      return (courses ?? [])
        .map((c: any) => ({ id: c.id, code: c.code, name: c.name, count: counts[c.id] ?? 0 }))
        .filter((c: MaterialCourse) => c.count > 0);
    },
  });
}

export interface MaterialsByTopic {
  topicId: string | null;
  topicName: string;
  items: StudyMaterial[];
}

/** All materials for one course, grouped by their real topic. */
export function useCourseMaterials(courseId?: string) {
  return useQuery({
    queryKey: ["course-materials", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ course: { code: string; name: string } | null; groups: MaterialsByTopic[] }> => {
      const [{ data: course }, { data: mats }, { data: topics }] = await Promise.all([
        supabase.from("courses").select("code, name").eq("id", courseId!).maybeSingle(),
        supabase
          .from("study_materials")
          .select("id, title, description, file_type, file_size, file_url, topic_id, created_at, owner_id")
          .eq("course_id", courseId!)
          .order("created_at", { ascending: false }),
        supabase.from("topics").select("id, name").eq("course_id", courseId!),
      ]);

      const ownerIds = Array.from(new Set((mats ?? []).map((m: any) => m.owner_id).filter(Boolean)));
      let owners: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        owners = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }

      const topicName = new Map((topics ?? []).map((t: any) => [t.id, t.name]));
      const grouped = new Map<string, MaterialsByTopic>();
      for (const m of (mats ?? []) as any[]) {
        const key = m.topic_id ?? "__none";
        if (!grouped.has(key)) {
          grouped.set(key, {
            topicId: m.topic_id ?? null,
            topicName: (m.topic_id && topicName.get(m.topic_id)) || "General",
            items: [],
          });
        }
        grouped.get(key)!.items.push({ ...m, owner_name: owners[m.owner_id] ?? null });
      }

      return {
        course: (course as any) ?? null,
        groups: Array.from(grouped.values()),
      };
    },
  });
}
