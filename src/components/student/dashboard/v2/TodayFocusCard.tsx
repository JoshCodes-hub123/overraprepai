import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Target, BookOpen, Brain, FileQuestion, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDueCards } from "@/hooks/useSRS";
import { useRecentlyOpenedCourses } from "@/hooks/useRecentlyOpenedCourses";

interface FocusItem {
  title: string;
  subtitle: string;
  meta: string;
  metaSub: string;
  to: string;
  tint: "amber" | "emerald" | "indigo" | "rose";
  icon: typeof BookOpen;
}

const TINTS: Record<FocusItem["tint"], string> = {
  amber:   "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  indigo:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  rose:    "bg-rose-50 text-rose-700 border-rose-200",
};

export function TodayFocusCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: due = [] } = useDueCards();
  const { data: recent = [] } = useRecentlyOpenedCourses(3);
  const [items, setItems] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasCourses, setHasCourses] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);

      const { data: enrolled } = await (supabase as any)
        .from("student_courses")
        .select("courses:course_id(id, code, name)")
        .eq("student_id", user.id)
        .limit(12);
      const courses = (enrolled ?? [])
        .map((r: any) => r.courses)
        .filter(Boolean) as { id: string; code: string; name: string }[];

      if (cancel) return;
      setHasCourses(courses.length > 0);
      if (courses.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const built: FocusItem[] = [];

      // Slot 1 — Continue (most recently opened, else first enrolled)
      const recentCourse = recent.find((r) => r.courses)?.courses;
      const continueCourse = recentCourse || courses[0];
      built.push({
        title: continueCourse.code,
        subtitle: continueCourse.name,
        meta: recentCourse ? "Resume" : "Start",
        metaSub: "open course",
        to: `/courses/${continueCourse.id}`,
        tint: "amber",
        icon: BookOpen,
      });

      // Slot 2 — Review
      if (due.length > 0) {
        built.push({
          title: "Smart Review",
          subtitle: "Spaced-repetition flashcards",
          meta: `${due.length}`,
          metaSub: "cards due",
          to: "/review",
          tint: "emerald",
          icon: Brain,
        });
      } else {
        built.push({
          title: "Warm-up",
          subtitle: "5-card flashcard refresher",
          meta: "5m",
          metaSub: "stay sharp",
          to: "/review",
          tint: "emerald",
          icon: Brain,
        });
      }

      // Slot 3 — Practice quiz
      const courseIds = courses.map((c) => c.id);
      const { data: qz } = await supabase
        .from("quizzes")
        .select("id, course_id, title")
        .in("course_id", courseIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      const q = (qz ?? [])[0] as any;
      if (q) {
        const c = courses.find((x) => x.id === q.course_id);
        built.push({
          title: c?.code ?? "Quiz",
          subtitle: q.title || c?.name || "Practice quiz",
          meta: "Quiz",
          metaSub: "ready to start",
          to: `/courses/${q.course_id}?tab=quizzes`,
          tint: "indigo",
          icon: FileQuestion,
        });
      } else {
        built.push({
          title: "Generate a Quiz",
          subtitle: "Turn any material into questions",
          meta: "AI",
          metaSub: "study pack",
          to: "/learn",
          tint: "indigo",
          icon: Sparkles,
        });
      }

      if (!cancel) {
        setItems(built.slice(0, 3));
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [user, due.length, recent]);

  const primary = items[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl bg-white border border-amber-100 p-5 shadow-[0_18px_40px_-22px_rgba(217,119,6,0.25)]"
      aria-label="Today's focus"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white">
            <Target className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-tight text-neutral-900">
              Today's Focus
            </h2>
            <p className="text-[11px] text-neutral-500 leading-tight">
              Your next 3 best moves
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-amber-50/60 animate-pulse" />
          ))}
        </div>
      ) : !hasCourses ? (
        <Link
          to="/courses"
          className="block rounded-2xl border border-amber-100 bg-amber-50/40 p-5 text-center hover:bg-amber-50 transition"
        >
          <BookOpen className="w-6 h-6 text-amber-600 mx-auto mb-2" />
          <p className="font-display font-bold text-[14px] text-neutral-900">
            Pick your courses to begin
          </p>
          <p className="text-[12px] text-neutral-500 mt-1">
            Today's Focus and your dashboard adapt to your selection.
          </p>
          <span className="inline-flex mt-3 items-center gap-1.5 text-[12px] font-bold text-amber-700">
            Select courses <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i}>
                <Link
                  to={it.to}
                  className="flex items-center gap-3 rounded-2xl border border-amber-100/70 bg-white hover:border-amber-300 hover:shadow-sm p-3 group transition"
                >
                  <span
                    className={`h-11 w-11 rounded-xl inline-flex items-center justify-center shrink-0 border ${TINTS[it.tint]}`}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13.5px] font-bold leading-tight truncate text-neutral-900">
                      {it.title}
                    </p>
                    <p className="text-[11.5px] text-neutral-500 leading-tight truncate">
                      {it.subtitle}
                    </p>
                  </div>
                  <div className="text-right shrink-0 mr-0.5">
                    <p className="text-[13px] font-bold text-amber-700 leading-none">{it.meta}</p>
                    <p className="text-[10.5px] text-neutral-500 mt-1">{it.metaSub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-500/60 group-hover:text-amber-700 transition" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {primary && hasCourses && (
        <button
          type="button"
          onClick={() => navigate(primary.to)}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-white py-3 font-display text-[14px] font-bold shadow-md hover:shadow-lg transition active:scale-[0.99]"
        >
          Continue Learning <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </motion.section>
  );
}

export default TodayFocusCard;
