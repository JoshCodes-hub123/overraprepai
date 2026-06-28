import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, PlayCircle, ChevronRight, Compass } from "lucide-react";

type CourseRow = { id: string; code: string; name: string };
type QuizRow = { id: string; title: string; course_id: string };

/**
 * Compact "Quick Jump" menu — courses the student is enrolled in (or top
 * popular ones for new users) plus their latest published practice quizzes.
 * Goal: zero hunting. One tap from dashboard to the right quiz.
 */
const QuickJumpMenu = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["quick-jump", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const sb = supabase as any;
      const { data: enrolled } = await sb
        .from("student_courses")
        .select("course_id")
        .eq("student_id", user!.id)
        .limit(20);
      const enrolledIds: string[] = (enrolled ?? []).map((r: any) => r.course_id);

      let courses: CourseRow[] = [];
      if (enrolledIds.length) {
        const { data: rows } = await sb
          .from("courses")
          .select("id, code, name")
          .in("id", enrolledIds)
          .limit(6);
        courses = (rows ?? []) as CourseRow[];
      }
      if (courses.length === 0) {
        const { data: rows } = await sb
          .from("courses")
          .select("id, code, name")
          .order("created_at", { ascending: false })
          .limit(6);
        courses = (rows ?? []) as CourseRow[];
      }

      const courseIds = courses.map((c) => c.id);
      let quizzesByCourse: Record<string, QuizRow[]> = {};
      if (courseIds.length) {
        const { data: quizzes } = await sb
          .from("quizzes")
          .select("id, title, course_id")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(30);
        for (const q of (quizzes ?? []) as QuizRow[]) {
          (quizzesByCourse[q.course_id] ||= []).push(q);
        }
      }
      return { courses, quizzesByCourse };
    },
  });

  return (
    <section aria-labelledby="quick-jump-label" className="rounded-2xl border border-amber-100 bg-white/90 backdrop-blur p-4 shadow-[0_4px_18px_-10px_rgba(217,119,6,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Compass className="h-4 w-4" />
          </span>
          <h2 id="quick-jump-label" className="font-display text-[15px] font-bold tracking-tight">
            Quick Jump
          </h2>
        </div>
        <Link to="/courses" className="text-[11px] font-semibold text-amber-700 hover:underline">
          All courses →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-amber-50" />
          ))}
        </div>
      ) : !data || data.courses.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No courses yet.{" "}
          <Link to="/courses" className="text-amber-700 font-semibold hover:underline">
            Browse the catalog
          </Link>
        </p>
      ) : (
        <ul className="space-y-2">
          {data.courses.map((c) => {
            const quizzes = (data.quizzesByCourse[c.id] || []).slice(0, 3);
            return (
              <li
                key={c.id}
                className="rounded-xl border border-amber-100/80 bg-gradient-to-br from-white to-amber-50/40 p-2.5"
              >
                <Link
                  to={`/courses/${c.id}`}
                  className="flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-zinc-900 leading-tight truncate">
                        {c.code}
                      </p>
                      <p className="text-[11px] text-zinc-600 truncate">{c.name}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-400 group-hover:text-amber-700 transition" />
                </Link>

                {quizzes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {quizzes.map((q) => (
                      <Link
                        key={q.id}
                        to={`/quiz/${q.id}/practice`}
                        title={q.title}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-600/10 text-amber-800 hover:bg-amber-600 hover:text-white transition px-2.5 py-1 text-[10.5px] font-semibold max-w-[180px] truncate"
                      >
                        <PlayCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{q.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default QuickJumpMenu;
