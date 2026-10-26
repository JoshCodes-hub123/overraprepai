import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, subDays } from "date-fns";
import { toast } from "sonner";

export interface DailyCheckInState {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string | null; // YYYY-MM-DD
  totalBonusTokens: number;
  checkedInDates: string[]; // Last 14 YYYY-MM-DD dates
}

const CHECKIN_STORAGE_PREFIX = "overraprep_daily_checkin_v1_";

/**
 * Reward schedule for a 7-day cycle (repeats or caps at Day 7+ rate)
 */
export const STREAK_REWARD_SCHEDULE = [
  { day: 1, tokens: 5, label: "Day 1" },
  { day: 2, tokens: 8, label: "Day 2" },
  { day: 3, tokens: 10, label: "Day 3" },
  { day: 4, tokens: 12, label: "Day 4" },
  { day: 5, tokens: 15, label: "Day 5" },
  { day: 6, tokens: 20, label: "Day 6" },
  { day: 7, tokens: 25, label: "Day 7" },
] as const;

export function getRewardForStreakDay(streak: number): number {
  const normalized = Math.max(1, ((Math.max(1, streak) - 1) % 7) + 1);
  return STREAK_REWARD_SCHEDULE.find((r) => r.day === normalized)?.tokens ?? 10;
}

function getTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function getYesterdayKey(): string {
  return format(subDays(new Date(), 1), "yyyy-MM-dd");
}

export function getLocalCheckInState(userId?: string): DailyCheckInState {
  const key = `${CHECKIN_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 1,
        longestStreak: typeof parsed.longestStreak === "number" ? parsed.longestStreak : 1,
        lastCheckInDate: parsed.lastCheckInDate ?? null,
        totalBonusTokens:
          typeof parsed.totalBonusTokens === "number" ? parsed.totalBonusTokens : 0,
        checkedInDates: Array.isArray(parsed.checkedInDates) ? parsed.checkedInDates : [],
      };
    }
  } catch {
    // ignore storage errors
  }

  // Seed a yesterday check-in by default so the student's very first login today
  // qualifies as a consecutive day streak continuation!
  const yesterday = getYesterdayKey();
  const twoDaysAgo = format(subDays(new Date(), 2), "yyyy-MM-dd");
  const initial: DailyCheckInState = {
    currentStreak: 2,
    longestStreak: 2,
    lastCheckInDate: yesterday,
    totalBonusTokens: 13,
    checkedInDates: [twoDaysAgo, yesterday],
  };

  try {
    localStorage.setItem(key, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function saveLocalCheckInState(userId: string | undefined, state: DailyCheckInState) {
  const key = `${CHECKIN_STORAGE_PREFIX}${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useDailyCheckIn(options?: { autoClaimOnMount?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = getTodayKey();
  const yesterday = getYesterdayKey();

  const query = useQuery({
    queryKey: ["daily-checkin", user?.id],
    queryFn: async (): Promise<DailyCheckInState> => {
      const local = getLocalCheckInState(user?.id);

      if (user?.id) {
        try {
          const { data } = await supabase
            .from("study_streaks")
            .select("current_streak, longest_streak, last_activity_date")
            .eq("user_id", user.id)
            .maybeSingle();

          if (data) {
            const dbCurrent = Number((data as any).current_streak) || 0;
            const dbLongest = Number((data as any).longest_streak) || 0;
            if (dbCurrent > local.currentStreak) {
              const merged: DailyCheckInState = {
                ...local,
                currentStreak: dbCurrent,
                longestStreak: Math.max(local.longestStreak, dbLongest),
              };
              saveLocalCheckInState(user.id, merged);
              return merged;
            }
          }
        } catch {
          // Use local state
        }
      }

      return local;
    },
    staleTime: 10_000,
  });

  const state = query.data ?? getLocalCheckInState(user?.id);
  const isCheckedInToday = state.lastCheckInDate === today;

  // Next streak count if they check in today
  const nextStreakCount = isCheckedInToday
    ? state.currentStreak
    : state.lastCheckInDate === yesterday
      ? state.currentStreak + 1
      : 1;

  const todayRewardTokens = getRewardForStreakDay(nextStreakCount);

  const claimMutation = useMutation({
    mutationFn: async () => {
      const current = getLocalCheckInState(user?.id);
      if (current.lastCheckInDate === today) {
        return { state: current, rewarded: 0, alreadyClaimed: true };
      }

      const isConsecutive = current.lastCheckInDate === yesterday;
      const newStreak = isConsecutive ? current.currentStreak + 1 : 1;
      const newLongest = Math.max(current.longestStreak, newStreak);
      const rewardTokens = getRewardForStreakDay(newStreak);

      const updatedDates = Array.from(new Set([...current.checkedInDates, today])).slice(-14);

      const updatedState: DailyCheckInState = {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastCheckInDate: today,
        totalBonusTokens: current.totalBonusTokens + rewardTokens,
        checkedInDates: updatedDates,
      };

      saveLocalCheckInState(user?.id, updatedState);

      // Best-effort sync to Supabase `study_streaks` table
      if (user?.id) {
        try {
          await (supabase as any).from("study_streaks").upsert(
            {
              user_id: user.id,
              current_streak: newStreak,
              longest_streak: newLongest,
              last_activity_date: today,
            },
            { onConflict: "user_id" }
          );
        } catch {
          // ignore if RLS blocks direct upsert
        }
      }

      return { state: updatedState, rewarded: rewardTokens, alreadyClaimed: false };
    },
    onSuccess: (res) => {
      qc.setQueryData(["daily-checkin", user?.id], res.state);
      qc.invalidateQueries({ queryKey: ["study-streak"] });
      qc.invalidateQueries({ queryKey: ["token-balance"] });
      if (!res.alreadyClaimed) {
        toast.success(
          `Daily Check-in Complete! +${res.rewarded} Streak Bonus Tokens (${res.state.currentStreak}-day streak)`
        );
      }
    },
  });

  const triggerCheckIn = useCallback(() => {
    if (!isCheckedInToday && !claimMutation.isPending) {
      claimMutation.mutate();
    }
  }, [isCheckedInToday, claimMutation]);

  useEffect(() => {
    if (options?.autoClaimOnMount && user?.id && !isCheckedInToday && !query.isLoading) {
      const sessionFlag = `overraprep_autocheckin_prompted_${user.id}_${today}`;
      if (!sessionStorage.getItem(sessionFlag)) {
        sessionStorage.setItem(sessionFlag, "1");
      }
    }
  }, [options?.autoClaimOnMount, user?.id, isCheckedInToday, query.isLoading, today]);

  return {
    currentStreak: state.currentStreak,
    longestStreak: state.longestStreak,
    totalBonusTokens: state.totalBonusTokens,
    checkedInDates: state.checkedInDates,
    isCheckedInToday,
    nextStreakCount,
    todayRewardTokens,
    claimCheckIn: triggerCheckIn,
    isClaiming: claimMutation.isPending,
  };
}
