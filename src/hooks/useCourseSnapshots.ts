import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { resolveCourseSemester, type AcademicSemester } from "@/lib/cleanSlateManager";

export interface CourseSnapshot {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  description?: string | null;
  semester?: AcademicSemester;
  unread_updates: number;
  last_opened_at: string | null;
}

/** One round-trip snapshot of every active course available to the student (enrolled + studio curriculum). */
export function useCourseSnapshots() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["course-snapshots", user?.id],
    enabled: !!user,
    staleTime: 15_000,
    queryFn: async (): Promise<CourseSnapshot[]> => {
      const [rpcRes, dbCoursesRes, apiCoursesRes] = await Promise.all([
        (supabase as any)
          .rpc("get_course_snapshots", {
            _user_id: user!.id,
          })
          .catch(() => ({ data: [], error: null })),
        supabase
          .from("courses")
          .select("id, code, name, department, level, description, is_active")
          .eq("is_active", true),
        fetch("/api/courses")
          .then((r) => (r.ok ? r.json() : { courses: [] }))
          .catch(() => ({ courses: [] })),
      ]);

      const serverCourses = Array.isArray(apiCoursesRes?.courses)
        ? apiCoursesRes.courses
        : [];
      const dbCourses = Array.isArray(dbCoursesRes?.data) ? dbCoursesRes.data : [];
      const rpcSnapshots = Array.isArray(rpcRes?.data) ? rpcRes.data : [];

      const byId = new Map<string, CourseSnapshot>();

      // 1. Seed from server studio courses (/api/courses)
      for (const c of serverCourses) {
        if (!c || !c.id || c.is_active === false) continue;
        byId.set(c.id, {
          id: c.id,
          code: c.code || "COURSE",
          name: c.name || c.title || "Untitled Course",
          department: c.department || "General",
          level: c.level ? String(c.level).replace(/[^0-9]/g, "") || "100" : "100",
          description: c.description || null,
          semester: resolveCourseSemester(c),
          unread_updates: 0,
          last_opened_at: c.updated_at || c.created_at || null,
        });
      }

      // 2. Merge active DB courses
      for (const c of dbCourses as any[]) {
        if (!c || !c.id || c.is_active === false) continue;
        const existing = byId.get(c.id);
        byId.set(c.id, {
          id: c.id,
          code: c.code || existing?.code || "COURSE",
          name: c.name || existing?.name || "Untitled Course",
          department: c.department || existing?.department || "General",
          level: c.level
            ? String(c.level).replace(/[^0-9]/g, "") || "100"
            : existing?.level || "100",
          description: c.description ?? existing?.description ?? null,
          semester: resolveCourseSemester({
            code: c.code || existing?.code,
            description: c.description ?? existing?.description,
            semester: (c as any).semester ?? existing?.semester,
          }),
          unread_updates: existing?.unread_updates ?? 0,
          last_opened_at: existing?.last_opened_at ?? null,
        });
      }

      // 3. Overlay personalized student RPC snapshot data (unread_updates, last_opened_at)
      const validIds = new Set<string>(Array.from(byId.keys()));
      for (const snap of rpcSnapshots as any[]) {
        if (!snap || !snap.id) continue;
        if (validIds.size > 0 && !validIds.has(snap.id)) continue;
        const existing = byId.get(snap.id);
        byId.set(snap.id, {
          id: snap.id,
          code: snap.code || existing?.code || "COURSE",
          name: snap.name || existing?.name || "Untitled Course",
          department: snap.department || existing?.department || "General",
          level: snap.level
            ? String(snap.level).replace(/[^0-9]/g, "") || "100"
            : existing?.level || "100",
          description: existing?.description ?? (snap as any).description ?? null,
          semester:
            existing?.semester ||
            resolveCourseSemester({
              code: snap.code,
              description: (snap as any).description,
            }),
          unread_updates: snap.unread_updates ?? existing?.unread_updates ?? 0,
          last_opened_at: snap.last_opened_at ?? existing?.last_opened_at ?? null,
        });
      }

      return Array.from(byId.values()).sort((a, b) =>
        (a.code || "").localeCompare(b.code || "")
      );
    },
  });
}