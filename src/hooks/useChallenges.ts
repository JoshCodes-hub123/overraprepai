import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  goal_type: string;
  goal_target: number;
  duration_days: number;
  reward_tokens: number;
  badge_slug: string | null;
  is_active: boolean;
  is_seeded: boolean;
  sort_order: number;
}

export interface Enrollment {
  id: string;
  user_id: string;
  challenge_id: string;
  starts_at: string;
  ends_at: string;
  current_value: number;
  status: "active" | "completed" | "claimed" | "expired";
  completed_at: string | null;
  claimed_at: string | null;
}

export const useChallenges = () => {
  return useQuery({
    queryKey: ["challenges", "active"],
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAllChallenges = () => {
  return useQuery({
    queryKey: ["challenges", "all"],
    queryFn: async (): Promise<Challenge[]> => {
      const { data, error } = await (supabase as any)
        .from("challenges")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useMyEnrollments = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["challenge-enrollments", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Enrollment[]> => {
      const { data, error } = await (supabase as any)
        .from("challenge_enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .order("enrolled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useMyBadges = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-badges", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_badges")
        .select("badge_slug, awarded_at, badge_definitions(name, description, icon, tier)")
        .eq("user_id", user!.id)
        .order("awarded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useEnrollInChallenge = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (challenge: Challenge) => {
      if (!user?.id) throw new Error("Sign in to enroll");
      const now = new Date();
      const ends = new Date(now.getTime() + challenge.duration_days * 86400000);
      const { error } = await (supabase as any).from("challenge_enrollments").insert({
        user_id: user.id,
        challenge_id: challenge.id,
        starts_at: now.toISOString(),
        ends_at: ends.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You're in — let's go!");
      qc.invalidateQueries({ queryKey: ["challenge-enrollments"] });
    },
    onError: (e: any) => {
      if (String(e?.message || "").includes("duplicate")) {
        toast.info("You're already enrolled in this challenge.");
      } else {
        toast.error(e?.message ?? "Could not enroll");
      }
    },
  });
};

export const useClaimReward = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollment,
      challenge,
    }: {
      enrollment: Enrollment;
      challenge: Challenge;
    }) => {
      if (!user?.id) throw new Error("Sign in");
      // Server-side validated claim: marks enrollment claimed and awards
      // the badge only if the challenge was actually completed.
      const { error } = await (supabase as any).rpc("claim_challenge_reward", {
        _enrollment_id: enrollment.id,
      });
      if (error) throw error;
      return challenge;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challenge-enrollments"] });
      qc.invalidateQueries({ queryKey: ["my-badges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not claim"),
  });
};