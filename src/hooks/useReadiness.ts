import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useLatestReadinessAttempt = (courseId?: string) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["readiness-latest", user?.id, courseId],
    enabled: !!user?.id && !!courseId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("readiness_attempts")
        .select("*")
        .eq("user_id", user!.id)
        .eq("course_id", courseId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export const useWeaknessSignals = (limit = 5) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weakness-signals", user?.id, limit],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("weakness_signals")
        .select("topic, miss_count, last_seen_at, course_id")
        .eq("user_id", user!.id)
        .order("miss_count", { ascending: false })
        .order("last_seen_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useActiveExamGoal = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["active-exam-goal", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_goals")
        .select("id, target_date, target_score, exam_label, weekly_quiz_target")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("target_date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};