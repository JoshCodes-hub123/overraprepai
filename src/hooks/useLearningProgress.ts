import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTopicActivity } from "@/hooks/useCourseLearning";
import { getLocalCheckInState } from "@/hooks/useDailyCheckIn";

export interface StreakInfo {
  current: number;
  longest: number;
  lastActivity: string | null;
}

/** The student's real study streak, straight from `study_streaks` + Daily Check-in state. */
export function useStudyStreak() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study-streak", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<StreakInfo> => {
      const localCheckIn = getLocalCheckInState(user!.id);
      const { data, error } = await supabase
        .from("study_streaks")
        .select("current_streak, longest_streak, last_activity_date")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        return {
          current: localCheckIn.currentStreak || 0,
          longest: localCheckIn.longestStreak || 0,
          lastActivity: localCheckIn.lastClaimDate,
        };
      }
      const dbCurrent = Number((data as any)?.current_streak) || 0;
      const dbLongest = Number((data as any)?.longest_streak) || 0;
      return {
        current: Math.max(dbCurrent, localCheckIn.currentStreak),
        longest: Math.max(dbLongest, localCheckIn.longestStreak, localCheckIn.currentStreak),
        lastActivity: (data as any)?.last_activity_date ?? localCheckIn.lastClaimDate ?? null,
      };
    },
  });
}

export interface NextQuiz {
  id: string;
  title: string;
  course_code: string | null;
  question_count: number | null;
}

/**
 * The next quiz worth taking: an active quiz in one of the student's courses
 * that they have not completed yet.
 */
export function useNextRecommendedQuiz() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["next-recommended-quiz", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<NextQuiz | null> => {
      const { data: enrolments } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", user!.id);
      const courseIds = (enrolments ?? []).map((r: any) => r.course_id).filter(Boolean);
      if (courseIds.length === 0) return null;

      const { data: quizzes, error } = await supabase
        .from("quizzes")
        .select("id, title, question_count, courses(code)")
        .in("course_id", courseIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      if (!quizzes?.length) return null;

      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("quiz_id, completed_at")
        .eq("user_id", user!.id)
        .not("completed_at", "is", null)
        .limit(500);
      const done = new Set((attempts ?? []).map((a: any) => a.quiz_id));

      const next = (quizzes as any[]).find((q) => !done.has(q.id)) ?? null;
      if (!next) return null;
      return {
        id: next.id,
        title: next.title,
        course_code: next.courses?.code ?? null,
        question_count: next.question_count ?? null,
      };
    },
  });
}

/** Topics the student has practised, and how many are already strong. */
export function useCompletedTopics() {
  const { data: activity = [], isLoading } = useTopicActivity();
  const studied = activity.length;
  const mastered = activity.filter((a) => (a.mastery_score ?? 0) >= 70).length;
  const needsReview = activity.filter((a) => a.questions_incorrect > 0).length;
  return { studied, mastered, needsReview, isLoading };
}
