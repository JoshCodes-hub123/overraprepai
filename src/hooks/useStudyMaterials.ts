import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useEnvironment from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";
import { resolveCourseSemester, type AcademicSemester } from "@/lib/cleanSlateManager";

/**
 * Student-facing view of all uploaded course documents across the Express server
 * store (`/api/materials`) and Supabase (`study_materials` + `lecture_notes`).
 */

export interface MaterialCourse {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  semester: AcademicSemester;
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

/** Courses in the student's environment that have uploaded materials (1st & 2nd semester). */
export function useMaterialCourses() {
  const { user } = useAuth();
  const { environment, institution } = useEnvironment();

  return useQuery({
    queryKey: ["material-courses", user?.id ?? "guest", environment, institution],
    staleTime: 20_000,
    queryFn: async (): Promise<MaterialCourse[]> => {
      const [apiCoursesRes, dbCoursesRes, apiMatsRes, dbStudyMatsRes, dbNotesRes] =
        await Promise.all([
          fetch("/api/courses")
            .then((r) => (r.ok ? r.json() : { courses: [] }))
            .catch(() => ({ courses: [] })),
          supabase
            .from("courses")
            .select("id, code, name, department, level, description, is_active")
            .eq("is_active", true)
            .order("code"),
          fetch("/api/materials")
            .then((r) => (r.ok ? r.json() : { materials: [] }))
            .catch(() => ({ materials: [] })),
          supabase.from("study_materials").select("id, course_id, file_url, title, description"),
          supabase.from("lecture_notes").select("id, course_id, file_url, title, description"),
        ]);

      const courseMap = new Map<
        string,
        {
          id: string;
          code: string;
          name: string;
          department: string | null;
          level: string | null;
          description: string | null;
          semester?: string | null;
        }
      >();

      for (const c of Array.isArray(apiCoursesRes?.courses) ? apiCoursesRes.courses : []) {
        if (!c?.id || c.is_active === false) continue;
        courseMap.set(c.id, {
          id: c.id,
          code: c.code || "COURSE",
          name: c.name || c.title || "Untitled Course",
          department: c.department || null,
          level: c.level ? String(c.level).replace(/[^0-9]/g, "") || null : null,
          description: c.description || null,
          semester: c.semester || null,
        });
      }

      for (const c of (dbCoursesRes.data ?? []) as any[]) {
        if (!c?.id || c.is_active === false) continue;
        const existing = courseMap.get(c.id);
        courseMap.set(c.id, {
          id: c.id,
          code: c.code || existing?.code || "COURSE",
          name: c.name || existing?.name || "Untitled Course",
          department: c.department || existing?.department || null,
          level: c.level
            ? String(c.level).replace(/[^0-9]/g, "") || null
            : existing?.level || null,
          description: c.description ?? existing?.description ?? null,
          semester: (c as any).semester ?? existing?.semester ?? null,
        });
      }

      // Deduplicate all uploaded materials per course across Server + study_materials + lecture_notes
      const seenPerCourse = new Map<string, Set<string>>();
      const fallbackCourseInfo = new Map<
        string,
        { code: string; name: string; description: string | null }
      >();

      const registerMaterial = (m: any) => {
        if (!m?.course_id) return;
        const cid = String(m.course_id);
        const dedupeKey = m.id || m.title || m.file_url;
        if (!seenPerCourse.has(cid)) seenPerCourse.set(cid, new Set());
        if (dedupeKey) seenPerCourse.get(cid)!.add(String(dedupeKey));
        if (!courseMap.has(cid) && !fallbackCourseInfo.has(cid)) {
          fallbackCourseInfo.set(cid, {
            code: m.course_code || m.courseCode || "COURSE",
            name: m.title || m.course_code || "Uploaded Course Materials",
            description: m.description || null,
          });
        }
      };

      for (const m of Array.isArray(apiMatsRes?.materials) ? apiMatsRes.materials : []) {
        registerMaterial(m);
      }
      for (const m of (dbStudyMatsRes.data ?? []) as any[]) {
        registerMaterial(m);
      }
      for (const m of (dbNotesRes.data ?? []) as any[]) {
        registerMaterial(m);
      }

      const result: MaterialCourse[] = [];
      for (const [cid, items] of seenPerCourse.entries()) {
        if (items.size === 0) continue;
        const c = courseMap.get(cid);
        const fb = fallbackCourseInfo.get(cid);
        const code = c?.code || fb?.code || "COURSE";
        const name = c?.name || fb?.name || code;
        const description = c?.description ?? fb?.description ?? null;
        result.push({
          id: cid,
          code,
          name,
          department: c?.department ?? null,
          level: c?.level ?? null,
          semester: resolveCourseSemester({
            id: cid,
            code,
            description,
            semester: c?.semester ?? null,
          }),
          count: items.size,
        });
      }

      return result.sort((a, b) => (a.code || "").localeCompare(b.code || ""));
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
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-materials", user?.id ?? "guest", courseId],
    enabled: !!courseId,
    staleTime: 20_000,
    queryFn: async (): Promise<{ course: { code: string; name: string } | null; groups: MaterialsByTopic[] }> => {
      // 1. Fetch course metadata (Supabase + Server Store) and syllabus topics
      const [courseRes, apiCoursesRes, topicsRes] = await Promise.all([
        supabase.from("courses").select("code, name").eq("id", courseId!).maybeSingle(),
        fetch("/api/courses")
          .then((r) => (r.ok ? r.json() : { courses: [] }))
          .catch(() => ({ courses: [] })),
        supabase.from("topics").select("id, name").eq("course_id", courseId!),
      ]);

      const srvCourse = (Array.isArray(apiCoursesRes?.courses) ? apiCoursesRes.courses : []).find(
        (c: any) => c?.id === courseId
      );
      const course =
        (courseRes.data as any) ??
        (srvCourse ? { code: srvCourse.code, name: srvCourse.name } : null);
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
        const key = m.id || m.title || m.file_url;
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
        const key = m.id || m.title || m.file_url;
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
        const key = m.id || m.title || m.file_url;
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
