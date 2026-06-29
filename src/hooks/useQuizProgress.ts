import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type QuizProgressStatus = "none" | "in_progress" | "completed";

export type QuizProgress = {
  status: QuizProgressStatus;
  bestScore: number | null;
  lastAttemptAt: string | null;
  attemptId: string | null; // most recent attempt (for resume)
};

export type QuizProgressMap = Record<string, QuizProgress>;

/**
 * Returns a map of quizId → progress for the current user.
 * - completed: at least one attempt with `completed_at`
 * - in_progress: most recent attempt has no `completed_at`
 */
export function useQuizProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quiz-progress", user?.id ?? "anon"],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<QuizProgressMap> => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("id,quiz_id,score,completed_at,started_at")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const map: QuizProgressMap = {};
      for (const row of data ?? []) {
        const qid = (row as any).quiz_id as string;
        const completedAt = (row as any).completed_at as string | null;
        const score = (row as any).score as number | null;
        const startedAt = (row as any).started_at as string | null;
        const id = (row as any).id as string;

        const existing = map[qid];
        if (!existing) {
          map[qid] = {
            status: completedAt ? "completed" : "in_progress",
            bestScore: completedAt ? score ?? null : null,
            lastAttemptAt: startedAt ?? completedAt,
            attemptId: id,
          };
        } else {
          if (completedAt) {
            if (existing.bestScore == null || (score ?? 0) > existing.bestScore) {
              existing.bestScore = score ?? existing.bestScore;
            }
            if (existing.status !== "in_progress") existing.status = "completed";
          }
        }
      }
      return map;
    },
  });
}
