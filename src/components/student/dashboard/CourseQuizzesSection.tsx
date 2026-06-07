import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { QuizCard, type QuizCardData } from "@/components/quiz/QuizCard";

interface CourseGroup {
  id: string;
  code: string;
  name: string;
  quizzes: QuizCardData[];
}

/**
 * Dashboard "Quizzes from your courses" — students who came to take quizzes
 * find them grouped by the courses they picked, with one-tap start.
 */
export const CourseQuizzesSection = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCourses, setHasCourses] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: enrolled } = await (supabase as any)
        .from("student_courses")
        .select("course_id, courses:course_id(id, code, name)")
        .eq("student_id", user.id)
        .limit(20);

      const courses: { id: string; code: string; name: string }[] =
        (enrolled ?? [])
          .map((r: any) => r.courses)
          .filter(Boolean);

      if (cancelled) return;
      setHasCourses(courses.length > 0);

      if (courses.length === 0) {
        setGroups([]);
        setLoading(false);
        return;
      }

      const ids = courses.map((c) => c.id);
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title, question_count, duration_minutes, course_id, is_active")
        .in("course_id", ids)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(80);

      if (cancelled) return;

      const byCourse = new Map<string, QuizRow[]>();
      for (const q of (quizzes ?? []) as any[]) {
        const arr = byCourse.get(q.course_id) ?? [];
        if (arr.length < 3) arr.push({
          id: q.id, title: q.title,
          question_count: q.question_count, duration_minutes: q.duration_minutes,
        });
        byCourse.set(q.course_id, arr);
      }

      setGroups(
        courses
          .map((c) => ({ ...c, quizzes: byCourse.get(c.id) ?? [] }))
          .filter((g) => g.quizzes.length > 0)
          .slice(0, 4)
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <section aria-label="Quizzes from your courses" className="mb-7">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 rounded-full bg-amber-500" />
          <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
            Quizzes from your courses
          </h2>
        </div>
        <Link to="/my-courses" className="text-[11px] font-bold tracking-wider uppercase text-amber-700 hover:text-amber-800">
          See all →
        </Link>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-amber-100 bg-white p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
        </div>
      ) : !hasCourses ? (
        <Link
          to="/my-courses"
          className="block rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center hover:bg-amber-50/70 transition"
        >
          <div className="mx-auto h-11 w-11 rounded-full bg-white border border-amber-100 shadow-sm flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-amber-600" />
          </div>
          <p className="font-display text-[14px] font-bold text-neutral-800">Pick your courses to unlock quizzes</p>
          <p className="text-[12px] text-neutral-500 mt-1 max-w-[36ch] mx-auto">
            Add the courses you're taking and we'll line up quizzes for each one right here.
          </p>
          <span className="inline-flex mt-4 items-center gap-1.5 px-5 py-2 rounded-full bg-amber-500 text-white text-[12px] font-bold shadow-md">
            Add my courses <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : groups.length === 0 ? (
        <Link
          to="/courses"
          className="block rounded-2xl border border-amber-100 bg-white p-5 text-center hover:border-amber-300 transition"
        >
          <Sparkles className="w-5 h-5 text-amber-600 mx-auto mb-2" />
          <p className="font-display text-[14px] font-bold text-neutral-800">No quizzes for your courses yet</p>
          <p className="text-[12px] text-neutral-500 mt-1">
            Tutors are adding new quizzes daily. Browse all courses meanwhile.
          </p>
        </Link>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-amber-100 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-center justify-between mb-3">
                <Link to={`/courses/${g.id}?tab=quizzes`} className="min-w-0 flex items-center gap-2 group">
                  <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-amber-50 text-amber-700">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold tracking-wide uppercase text-amber-700">{g.code}</p>
                    <p className="text-[12px] text-neutral-500 truncate -mt-0.5">{g.name}</p>
                  </div>
                </Link>
                <Link
                  to={`/courses/${g.id}?tab=quizzes`}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 shrink-0"
                >
                  View all
                </Link>
              </div>
              <ul className="space-y-1.5">
                {g.quizzes.map((q) => (
                  <li key={q.id}>
                    <Link
                      to={`/quiz/${q.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-amber-50/60 transition group"
                    >
                      <span className="shrink-0 h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <ClipboardList className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-neutral-800 truncate">{q.title}</p>
                        <p className="text-[11px] text-neutral-500">
                          {q.question_count ?? "—"} questions
                          {q.duration_minutes ? ` · ${q.duration_minutes} min` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-sm group-hover:bg-amber-600 transition">
                        Start <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default CourseQuizzesSection;
