import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Live token wallet balance for the current user.
 *
 * Source of truth = secure `get_my_wallet()` RPC. Wallet/free-quota columns
 * are protected on `profiles`, so direct table reads can show 0 in the app.
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
    const ch = (supabase as any)
      .channel(`wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["token-balance", user.id] }),
      )
      .subscribe();
    return () => { try { (supabase as any).removeChannel(ch); } catch { /* noop */ } };
  }, [user?.id, qc]);

  const balance = query.data?.ai_token_balance ?? 0;
  const dailyFreeUsed = query.data?.daily_free_used ?? 0;

  return {
    balance,
    wallet: query.data
      ? {
          id: user?.id ?? "",
          balance,
          total_earned: 0,
          total_spent: 0,
        }
      : null,
    dailyFreeUsed,
    dailyFreeLeft: Math.max(0, 2 - dailyFreeUsed),
    isLoading: query.isLoading,
  };
}

export default useTokenBalance;
