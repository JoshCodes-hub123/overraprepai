import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QuizCardData } from "@/components/quizzes/QuizCard";

type RawQuiz = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  is_premium: boolean;
  is_simulation: boolean;
  level: string | null;
  created_at: string;
  course_id: string;
  courses?: { code: string | null; name: string | null } | null;
};

export type GroupedQuizzes = {
  trending: QuizCardData[];
  newest: QuizCardData[];
  byCourse: Array<{
    courseId: string;
    code: string;
    name: string;
    quizzes: QuizCardData[];
  }>;
  total: number;
};

export function useQuizzes(opts?: { limit?: number }) {
  return useQuery({
    queryKey: ["all-quizzes", opts?.limit ?? "all"],
    staleTime: 60_000,
    queryFn: async (): Promise<GroupedQuizzes> => {
      const { data: rows, error } = await supabase
        .from("quizzes")
        .select(
          "id,title,description,duration_minutes,question_count,is_premium,is_simulation,level,created_at,course_id,courses(code,name)"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(opts?.limit ?? 200);
      if (error) throw error;
      const quizzes = (rows ?? []) as unknown as RawQuiz[];
      const ids = quizzes.map((q) => q.id);

      // Trending: count attempts in last 14 days
      let trendingMap: Record<string, number> = {};
      if (ids.length) {
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("quiz_id")
          .in("quiz_id", ids)
          .gte("created_at", since);
        for (const a of attempts ?? []) {
          const qid = (a as { quiz_id: string }).quiz_id;
          trendingMap[qid] = (trendingMap[qid] ?? 0) + 1;
        }
      }

      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      const toCard = (q: RawQuiz): QuizCardData => ({
        id: q.id,
        title: q.title,
        description: q.description,
        duration_minutes: q.duration_minutes,
        question_count: q.question_count,
        is_premium: q.is_premium,
        is_simulation: q.is_simulation,
        level: q.level,
        course: q.courses ?? null,
        attempts: trendingMap[q.id] ?? 0,
      });

      const cards = quizzes.map(toCard);

      const trending = [...cards]
        .filter((c) => (c.attempts ?? 0) > 0)
        .sort((a, b) => (b.attempts ?? 0) - (a.attempts ?? 0))
        .slice(0, 8)
        .map((c) => ({ ...c, badge: "trending" as const }));

      const newest = quizzes
        .slice(0, 8)
        .map((q) => {
          const c = toCard(q);
          const isNew = new Date(q.created_at).getTime() > sevenDaysAgo;
          return { ...c, badge: isNew ? ("new" as const) : null };
        });

      const groups = new Map<string, { code: string; name: string; quizzes: QuizCardData[] }>();
      for (let i = 0; i < quizzes.length; i++) {
        const q = quizzes[i];
        const key = q.course_id;
        const code = q.courses?.code ?? "OTHER";
        const name = q.courses?.name ?? "Other";
        if (!groups.has(key)) groups.set(key, { code, name, quizzes: [] });
        groups.get(key)!.quizzes.push(cards[i]);
      }

      const byCourse = Array.from(groups.entries())
        .map(([courseId, g]) => ({ courseId, ...g }))
        .sort((a, b) => a.code.localeCompare(b.code));

      return { trending, newest, byCourse, total: quizzes.length };
    },
  });
}
