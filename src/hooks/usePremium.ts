import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Prepaid wallet gate.
 *
 * - 1 token = ₦25. Every paid AI/quiz action costs 1 token.
 * - Light actions (`quiz_attempt`, `ai_explanation`, `tutor_chat`) get 5 free
 *   uses per calendar day (Africa/Lagos). After that they also cost 1 token.
 * - Heavy actions always cost 1 token (no free quota).
 * - When the wallet is empty, `requireToken` opens the SoftPaywallSheet
 *   (top-up CTA) and returns false so callers skip the AI call.
 *
 * The hook keeps the legacy `usePremium` export name + a few aliases so the
 * existing call sites keep working without churn.
 */
export function usePremium() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["wallet-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("ai_token_balance, daily_free_used, daily_free_reset_at")
        .eq("id", user!.id)
        .maybeSingle();
      return (data ?? {
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
  const freeUsed = profileQuery.data?.daily_free_used ?? 0;
  const dailyLimit = 5;
  const freeLeft = Math.max(dailyLimit - freeUsed, 0);

  const LIGHT_KINDS = new Set(["quiz_attempt", "ai_explanation", "tutor_chat"]);

  const refetch = () => {
    profileQuery.refetch();
    qc.invalidateQueries({ queryKey: ["wallet-profile"] });
    qc.invalidateQueries({ queryKey: ["wallet-transactions"] });
  };

  /**
   * Consume one allowance for a given action kind. Returns true if the
   * caller may proceed. On wallet-empty: opens the paywall sheet and returns false.
   */
  const requireToken = useCallback(async (kind: string): Promise<boolean> => {
    const { data, error } = await (supabase as any).rpc("consume_ai_token", { _kind: kind });
    if (error) {
      console.error("consume_ai_token error", error);
      // Fail-open so a transient error doesn't block a user mid-flow
      return true;
    }
    refetch();
    if (!data?.allowed) {
      setUpgradeReason(
        `Your wallet is empty. Top up to keep using ${kind.replace(/_/g, " ")} and other AI features.`,
      );
      setUpgradeOpen(true);
      return false;
    }
    if (data.source === "token") {
      toast.success(`−1 token · ${data.balance} left in wallet`);
    } else if (LIGHT_KINDS.has(kind)) {
      // light-action free use — silent
    }
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backwards-compat alias used by older call sites.
  const requireCredit = requireToken;

  // No more Pro — everyone is on the wallet. Keep these as no-ops so legacy
  // gates don't accidentally hide functionality.
  const requirePro = useCallback((_reason: string): boolean => true, []);

  return {
    // wallet
    balance,
    freeUsed,
    freeLeft,
    dailyLimit,
    isLowBalance: balance > 0 && balance < 3,
    isEmpty: balance <= 0 && freeLeft <= 0,
    isLoading: profileQuery.isLoading,
    refetch,

    // gate
    requireToken,
    requireCredit,
    requirePro,
    upgradeOpen,
    upgradeReason,
    setUpgradeOpen,

    // legacy aliases (no Pro tier any more — always false)
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

// Convenience alias for new code.
export const useWallet = usePremium;
