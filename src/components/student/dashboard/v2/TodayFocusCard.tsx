import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Target, Calculator, MessageSquare, FileText, Layers } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDueCards } from "@/hooks/useSRS";

interface FocusItem {
  code: string;
  name: string;
  meta: string;
  metaSub: string;
  to: string;
  tint: "indigo" | "emerald" | "orange" | "amber";
  icon: typeof Calculator;
}

const TINTS: Record<FocusItem["tint"], string> = {
  indigo:  "bg-indigo-500/15 text-indigo-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  orange:  "bg-orange-500/15 text-orange-300",
  amber:   "bg-amber-500/15 text-amber-300",
};

export function TodayFocusCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: due = [] } = useDueCards();
  const [items, setItems] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: enrolled } = await (supabase as any)
        .from("student_courses")
        .select("courses:course_id(id, code, name)")
        .eq("student_id", user.id)
        .limit(8);
      const courses = (enrolled ?? [])
        .map((r: any) => r.courses)
        .filter(Boolean) as { id: string; code: string; name: string }[];

      const tints: FocusItem["tint"][] = ["indigo", "emerald", "orange", "amber"];
      const icons = [Calculator, MessageSquare, FileText, Layers];
      const built: FocusItem[] = [];

      if (courses[0]) {
        built.push({
          code: courses[0].code,
          name: courses[0].name,
          meta: "Continue",
          metaSub: "open course",
          to: `/courses/${courses[0].id}`,
          tint: tints[0],
          icon: icons[0],
        });
      }

      if (due.length > 0) {
        const c = courses[1];
        built.push({
          code: c?.code ?? "Review",
          name: c?.name ?? "Spaced repetition",
          meta: `${due.length}`,
          metaSub: "flashcards due",
          to: `/review`,
          tint: tints[1],
          icon: icons[1],
        });
      }

      const courseIds = courses.map((c) => c.id);
      if (courseIds.length > 0) {
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
            code: c?.code ?? "Quiz",
            name: c?.name ?? q.title,
            meta: "Quiz",
            metaSub: "ready to start",
            to: `/courses/${q.course_id}?tab=quizzes`,
            tint: tints[2],
            icon: icons[2],
          });
        }
      }

      if (!cancel) {
        setItems(built.slice(0, 3));
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [user, due.length]);

  const primary = items[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl bg-neutral-900 text-white p-5 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.45)]"
      aria-label="Today's focus"
    >
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-amber-400" />
        <h2 className="font-display text-[15px] font-bold tracking-tight">Today's Focus</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Link
          to="/courses"
          className="block rounded-2xl bg-white/5 border border-white/10 p-4 text-center hover:bg-white/10 transition"
        >
          <p className="text-[13.5px] text-white/80">Pick your courses to see today's plan here.</p>
          <span className="inline-flex mt-3 items-center gap-1.5 text-[12px] font-bold text-amber-300">
            Select courses <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      ) : (
        <ul className="divide-y divide-white/5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i}>
                <Link
                  to={it.to}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
                >
                  <span className={`h-11 w-11 rounded-xl inline-flex items-center justify-center shrink-0 ${TINTS[it.tint]}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[14px] font-bold leading-tight truncate">{it.code}</p>
                    <p className="text-[12px] text-white/55 leading-tight truncate">{it.name}</p>
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    <p className="text-[13.5px] font-bold text-amber-400 leading-none">{it.meta}</p>
                    <p className="text-[11px] text-white/55 mt-1">{it.metaSub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/70 transition" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {primary && (
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
