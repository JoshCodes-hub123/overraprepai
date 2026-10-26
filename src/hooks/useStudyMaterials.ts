import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useEnvironment from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const { environment, institution } = useEnvironment();

  return useQuery({
    queryKey: ["material-courses", user?.id, environment, institution],
    enabled: !!user && !!institution,
    staleTime: 60_000,
    queryFn: async (): Promise<MaterialCourse[]> => {
      let q = (supabase as any)
        .from("courses")
        .select("id, code, name")
        .eq("is_active", true)
        .eq("environment_type", "university")
        .order("code");
      if (institution) q = q.eq("university", institution);
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
/** All materials for one course, grouped by their real topic. */
export function useCourseMaterials(courseId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-materials", user?.id ?? "guest", courseId],
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ course: { code: string; name: string } | null; groups: MaterialsByTopic[] }> => {
      // 1. Fetch course metadata and syllabus topics
      const [courseRes, topicsRes] = await Promise.all([
        supabase.from("courses").select("code, name").eq("id", courseId!).maybeSingle(),
        supabase.from("topics").select("id, name").eq("course_id", courseId!),
      ]);

      const course = (courseRes.data as any) ?? null;
      const topics = topicsRes.data ?? [];

      // 2. Fetch materials from local server store (always available & reliable for admin uploads)
      let serverMaterials: any[] = [];
      try {
        const sRes = await fetch(`/api/courses/${encodeURIComponent(courseId!)}/materials`);
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson.ok && Array.isArray(sJson.materials)) {
            serverMaterials = sJson.materials;
          }
        }
      } catch (err) {
        console.warn("Could not fetch server materials:", err);
      }

      // 3. Fetch from study_materials table
      let dbStudyMaterials: any[] = [];
      try {
        const { data, error } = await supabase
          .from("study_materials")
          .select("id, title, description, file_type, file_size, file_url, topic_id, created_at, owner_id")
          .eq("course_id", courseId!)
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          dbStudyMaterials = data;
        }
      } catch (err) {
        console.warn("study_materials fetch notice:", err);
      }

      // 4. Fetch from lecture_notes table
      let dbLectureNotes: any[] = [];
      try {
        const { data, error } = await supabase
          .from("lecture_notes")
          .select("id, title, description, file_type, file_size_bytes, file_url, topic_id, created_at, tutor_id")
          .eq("course_id", courseId!)
          .order("created_at", { ascending: false });
        if (!error && Array.isArray(data)) {
          dbLectureNotes = data.map((ln) => ({
            id: ln.id,
            title: ln.title,
            description: ln.description,
            file_type: ln.file_type || "pdf",
            file_size: ln.file_size_bytes || 0,
            file_url: ln.file_url,
            topic_id: ln.topic_id,
            created_at: ln.created_at,
            owner_id: ln.tutor_id,
          }));
        }
      } catch (err) {
        console.warn("lecture_notes fetch notice:", err);
      }

      // 5. Merge and deduplicate all items by URL or ID
      const mergedMap = new Map<string, StudyMaterial>();

      // Add server materials first
      for (const m of serverMaterials) {
        const key = m.file_url || m.id;
        mergedMap.set(key, {
          id: m.id,
          title: m.title,
          description: m.description ?? null,
          file_type: m.file_type || "pdf",
          file_size: m.file_size || 0,
          file_url: m.file_url,
          topic_id: m.topic_id ?? null,
          created_at: m.created_at || new Date().toISOString(),
          owner_name: m.owner_name || "Course Administrator",
        });
      }

      // Add database study materials
      for (const m of dbStudyMaterials) {
        const key = m.file_url || m.id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: m.id,
            title: m.title,
            description: m.description ?? null,
            file_type: m.file_type || "pdf",
            file_size: m.file_size || 0,
            file_url: m.file_url,
            topic_id: m.topic_id ?? null,
            created_at: m.created_at,
            owner_name: "Course Instructor",
          });
        }
      }

      // Add database lecture notes
      for (const m of dbLectureNotes) {
        const key = m.file_url || m.id;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, {
            id: m.id,
            title: m.title,
            description: m.description ?? null,
            file_type: m.file_type || "pdf",
            file_size: m.file_size || 0,
            file_url: m.file_url,
            topic_id: m.topic_id ?? null,
            created_at: m.created_at,
            owner_name: "Course Instructor",
          });
        }
      }

      const allMaterials = Array.from(mergedMap.values());

      // 6. Group materials by topic
      const topicName = new Map((topics ?? []).map((t: any) => [t.id, t.name]));
      const grouped = new Map<string, MaterialsByTopic>();

      for (const m of allMaterials) {
        const key = m.topic_id ?? "__general";
        if (!grouped.has(key)) {
          grouped.set(key, {
            topicId: m.topic_id ?? null,
            topicName: (m.topic_id && topicName.get(m.topic_id)) || "General Course Notes & Syllabi",
            items: [],
          });
        }
        grouped.get(key)!.items.push(m);
      }

      return {
        course,
        groups: Array.from(grouped.values()),
      };
    },
  });
}
