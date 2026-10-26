import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLocalCheckInState } from "@/hooks/useDailyCheckIn";

/**
 * Live token wallet balance for the current user.
 *
 * Source of truth = secure `get_my_wallet()` RPC + any claimed Daily Check-in
 * streak bonus tokens stored on the client when RPC write permissions are restricted.
 */
export function useTokenBalance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["token-balance", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_wallet");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as {
        ai_token_balance: number | null;
        daily_free_used: number | null;
        daily_free_reset_at: string | null;
      } | null;
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    // Use a unique channel instance ID to avoid collision when multiple components mount concurrently
    const channelName = `wallet-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    let ch: any = null;
    try {
      ch = (supabase as any)
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
          () => qc.invalidateQueries({ queryKey: ["token-balance", user.id] }),
        )
        .subscribe();
    } catch (err) {
      console.warn("Could not setup realtime token balance listener:", err);
    }

    return () => {
      if (ch) {
        try {
          (supabase as any).removeChannel(ch);
        } catch {
          /* noop */
        }
      }
    };
  }, [user?.id, qc]);

  const checkInBonus = getLocalCheckInState(user?.id).totalBonusTokens ?? 0;
  const balance = (query.data?.ai_token_balance ?? 0) + checkInBonus;
  const dailyFreeUsed = query.data?.daily_free_used ?? 0;

  return {
    balance,
    wallet: query.data
      ? {
          id: user?.id ?? "",
          balance,
          total_earned: checkInBonus,
          total_spent: 0,
        }
      : null,
    dailyFreeUsed,
    dailyFreeLeft: Math.max(0, 2 - dailyFreeUsed),
    isLoading: query.isLoading,
  };
}

export default useTokenBalance;
