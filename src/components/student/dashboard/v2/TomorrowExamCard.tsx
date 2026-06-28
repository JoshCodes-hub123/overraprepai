import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CalendarClock, Sparkles, ChevronRight, BookOpen } from "lucide-react";

/**
 * Promo card for tomorrow's MTS 102 test — surfaces the course + its first
 * quiz with a single tap so students never have to hunt for it.
 */
const TomorrowExamCard = () => {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["tomorrow-exam-mts102"],
    queryFn: async () => {
      const { data: course } = await supabase
        .from("courses")
        .select("id, code, name")
        .ilike("code", "MTS%102%")
        .maybeSingle();
      if (!course) return null;
      const { data: quizzes } = await supabase
        .from("quizzes")
        .select("id, title")
        .eq("course_id", course.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return { course, quizzes: quizzes || [] };
    },
    staleTime: 5 * 60_000,
  });

  if (!data) return null;
  const { course, quizzes } = data;
  const firstQuiz = quizzes[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-100 via-amber-50 to-white p-4 sm:p-5 shadow-[0_8px_24px_-12px_rgba(197,160,89,0.35)]">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/60 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <div className="grid h-10 w-10 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-md">
          <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Tomorrow · Test prep
          </p>
          <h3 className="mt-0.5 font-display text-base sm:text-lg font-bold text-zinc-900 leading-tight">
            {course.code} — {course.name}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-zinc-700">
            Your MTS 102 test is tomorrow. Tap to jump straight into practice.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {firstQuiz && (
              <button
                onClick={() => navigate(`/quiz/${firstQuiz.id}/practice`)}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-amber-700 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Practice now
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => navigate(`/courses/${course.id}`)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-amber-800 border border-amber-300 hover:bg-amber-50 transition"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Open course
            </button>
          </div>

          {quizzes.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {quizzes.slice(1, 4).map((q) => (
                <button
                  key={q.id}
                  onClick={() => navigate(`/quiz/${q.id}/practice`)}
                  className="truncate max-w-[180px] rounded-md bg-white/70 border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-white transition"
                  title={q.title}
                >
                  {q.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TomorrowExamCard;
