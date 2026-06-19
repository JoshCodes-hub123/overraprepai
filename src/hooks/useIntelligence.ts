import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type SuccessScore = {
  ok: true;
  score: number;
  tier: "Legend" | "Champion" | "Achiever" | "Scholar" | "Beginner";
  trend_pct: number;
  active_days_last_14: number;
  breakdown: {
    quiz: number; consistency: number; arena: number;
    community: number; opportunity: number; course_coverage: number;
  };
};

export type Readiness = {
  ok: true;
  course_id: string;
  course_code: string | null;
  course_name: string | null;
  readiness: number;
  predicted_grade: "A" | "B+" | "B" | "C" | "D" | "F";
  confidence: "High" | "Medium" | "Low";
  attempts: number;
  recent_attempts_30d: number;
  recommended_hours: number;
  weak_topics: { topic: string; misses: number }[];
  strong_topics: { topic: string; mastery: number }[];
  recommendations: string[];
};

export type Mission = {
  ok: true;
  streak: number;
  completed_today: number;
  tasks: { label: string; icon: string; link: string; done: boolean }[];
};

export type WeeklyReport = {
  ok: true;
  hours_studied: number;
  quizzes_completed: number;
  challenges_joined: number;
  opportunities_viewed: number;
  accuracy_pct: number;
  improvement_pct: number;
};

export type OpportunityMatch = {
  id: string;
  title: string;
  organization: string | null;
  category: string;
  cover_image_url: string | null;
  deadline: string | null;
  university: string | null;
  match_score: number;
  reasons: {
    same_university: boolean;
    department_match: boolean;
    closing_soon: boolean;
    fresh: boolean;
  };
};

export function useSuccessScore() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-success", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_success_score", {
        _user: user!.id,
      });
      if (error) throw error;
      return data as unknown as SuccessScore;
    },
  });
}

export function useReadinessAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-readiness-all", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_exam_readiness_all", {
        _user: user!.id,
      });
      if (error) throw error;
      const raw = data as { ok: boolean; courses?: Readiness[] };
      return raw?.courses ?? [];
    },
  });
}

export function useReadiness(courseId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-readiness", user?.id, courseId],
    enabled: !!user?.id && !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_exam_readiness", {
        _user: user!.id,
        _course: courseId!,
      });
      if (error) throw error;
      return data as unknown as Readiness;
    },
  });
}

export function useTodayMission() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-mission", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_today_mission", {
        _user: user!.id,
      });
      if (error) throw error;
      return data as unknown as Mission;
    },
  });
}

export function useWeeklyReport() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-weekly", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_weekly_report", {
        _user: user!.id,
      });
      if (error) throw error;
      return data as unknown as WeeklyReport;
    },
  });
}

export function useOpportunityMatches(limit = 6) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-opps", user?.id, limit],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("intelligence_opportunity_matches", {
        _user: user!.id,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as OpportunityMatch[];
    },
  });
}

export function useStudyCoach() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["intel-coach", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-study-coach", {});
      if (error) throw error;
      return (data as { message: string }).message;
    },
  });
}
