import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Live token wallet balance for the current user.
 *
 * Source of truth = `profiles.ai_token_balance` (this is what
 * `credit_wallet`, `consume_ai_token` and `unlock_quiz` all read/write).
 * We subscribe to UPDATEs on `profiles` so the header chip + paywalls
 * react instantly to credits/debits.
 */
export function useTokenBalance() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["token-balance", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, ai_token_balance, daily_free_used")
        .eq("id", user!.id)
        .maybeSingle();
      return data as { id: string; ai_token_balance: number; daily_free_used: number } | null;
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

  return {
    balance,
    wallet: query.data
      ? {
          id: query.data.id,
          balance,
          total_earned: 0,
          total_spent: 0,
        }
      : null,
    isLoading: query.isLoading,
  };
}

export default useTokenBalance;
