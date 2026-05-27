import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Live token wallet balance for the current user.
 * Subscribes to UPDATEs on token_wallets so the header chip + paywalls
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
        .from("token_wallets")
        .select("id, balance, total_earned, total_spent")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { id: string; balance: number; total_earned: number; total_spent: number } | null;
    },
  });

  useEffect(() => {
    if (!user?.id) return;
    const ch = (supabase as any)
      .channel(`wallet-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "token_wallets", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["token-balance", user.id] }),
      )
      .subscribe();
    return () => { try { (supabase as any).removeChannel(ch); } catch { /* noop */ } };
  }, [user?.id, qc]);

  return {
    balance: query.data?.balance ?? 0,
    wallet: query.data,
    isLoading: query.isLoading,
  };
}

export default useTokenBalance;