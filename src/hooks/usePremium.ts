import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DAILY_FREE_LIMIT = 3;

/**
 * Prepaid wallet gate with 3 free AI actions per day.
 *
 * - Free quota: 3 AI actions/day for every student, resets at 00:00 Africa/Lagos.
 * - Then: 1 token = ₦50 per AI action (any kind).
 * - When both are empty, `requireToken` opens SoftPaywallSheet and returns false.
 */
export function usePremium() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["wallet-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      // Use the SECURITY DEFINER RPC so wallet/free-quota fields are not
      // exposed via direct table SELECT (column grants are revoked).
      const { data } = await (supabase as any).rpc("get_my_wallet");
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? {
        ai_token_balance: 0,
        daily_free_used: 0,
        daily_free_reset_at: null,
      }) as {
        ai_token_balance: number | null;
        daily_free_used: number | null;
        daily_free_reset_at: string | null;
      };
    },
  });

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const balance = profileQuery.data?.ai_token_balance ?? 0;
  // Compute today's free usage in Africa/Lagos (lazy reset on server, but mirror here for UI).
  const rawUsed = profileQuery.data?.daily_free_used ?? 0;
  const resetAtStr = profileQuery.data?.daily_free_reset_at ?? null;
  const lagosToday = (() => {
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
    return fmt.format(new Date()); // YYYY-MM-DD
  })();
  const resetDay = resetAtStr
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(resetAtStr))
    : null;
  const freeUsed = resetDay && resetDay >= lagosToday ? rawUsed : 0;
  const freeLeft = Math.max(0, DAILY_FREE_LIMIT - freeUsed);

  const refetch = () => {
    profileQuery.refetch();
    qc.invalidateQueries({ queryKey: ["wallet-profile"] });
    qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
  };

  const requireToken = useCallback(async (kind: string): Promise<boolean> => {
    const { data, error } = await (supabase as any).rpc("consume_ai_token", { _kind: kind });
    if (error) {
      console.error("consume_ai_token error", error);
      toast.error("Couldn't verify your AI balance. Please try again.");
      return false; // fail-closed
    }
    refetch();
    if (!data?.allowed) {
      setUpgradeReason(
        `You've used today's 3 free AI actions and your wallet is empty. Top up to keep going, or come back tomorrow when free actions reset.`,
      );
      setUpgradeOpen(true);
      return false;
    }
    if (data.source === "token") {
      toast.success(`−1 token · ${data.balance} left in wallet`);
    } else if (data.source === "free") {
      const left = data.free_left ?? 0;
      toast.success(left > 0 ? `Free use · ${left}/${DAILY_FREE_LIMIT} left today` : `Last free use today · top up to keep going`);
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireCredit = requireToken;
  const requirePro = useCallback((_reason: string): boolean => true, []);

  return {
    balance,
    freeUsed,
    freeLeft,
    dailyLimit: DAILY_FREE_LIMIT,
    isLowBalance: balance > 0 && balance < 3,
    isEmpty: balance <= 0 && freeLeft <= 0,
    isLoading: profileQuery.isLoading,
    refetch,

    requireToken,
    requireCredit,
    requirePro,
    upgradeOpen,
    upgradeReason,
    setUpgradeOpen,

    isPro: false,
    isTrial: false,
    hasPaidPro: false,
    trialDaysLeft: 0,
    plan: "wallet",
    expiresAt: null as string | null,
    firstPurchaseUsed: true,
    creditsUsed: freeUsed,
    creditsLeft: freeLeft,
  };
}

export const useWallet = usePremium;
