import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMySubscription } from "@/hooks/useSubscription";

/**
 * Simpler Freemium gate.
 *
 * - Pro = active paid subscription OR within the 2-day signup trial window.
 * - Free users get 5 AI credits / day, reset at midnight.
 * - `requirePro(reason)` opens the upgrade sheet for hard-locked features.
 * - `requireCredit(kind)` consumes 1 credit; if exhausted, opens upgrade sheet
 *    AND returns false so the caller skips the AI call.
 */
export function usePremium() {
  const { user } = useAuth();
  const { data: sub, isLoading: subLoading } = useMySubscription();

  // Profile row gives us trial_ends_at + daily credit counters
  const profileQuery = useQuery({
    queryKey: ["premium-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("trial_ends_at, daily_ai_tokens_used, daily_ai_tokens_reset_at, first_purchase_used")
        .eq("id", user!.id)
        .maybeSingle();
      return data as {
        trial_ends_at: string | null;
        daily_ai_tokens_used: number | null;
        daily_ai_tokens_reset_at: string | null;
        first_purchase_used: boolean | null;
      } | null;
    },
  });

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);

  const isTrial = useMemo(() => {
    const t = profileQuery.data?.trial_ends_at;
    return !!t && new Date(t) > new Date();
  }, [profileQuery.data?.trial_ends_at]);

  const hasPaidPro = useMemo(() => {
    if (!sub) return false;
    if (sub.plan_id === "free") return false;
    if (sub.expires_at && new Date(sub.expires_at) <= new Date()) return false;
    return sub.status === "active";
  }, [sub]);

  const isPro = hasPaidPro || isTrial;

  const trialDaysLeft = useMemo(() => {
    const t = profileQuery.data?.trial_ends_at;
    if (!t) return 0;
    const ms = new Date(t).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / (1000 * 60 * 60 * 24)) : 0;
  }, [profileQuery.data?.trial_ends_at]);

  const creditsUsed = profileQuery.data?.daily_ai_tokens_used ?? 0;
  const dailyLimit = 5;
  const creditsLeft = isPro ? Infinity : Math.max(dailyLimit - creditsUsed, 0);

  const requirePro = useCallback((reason: string): boolean => {
    if (isPro) return true;
    setUpgradeReason(reason);
    setUpgradeOpen(true);
    return false;
  }, [isPro]);

  /**
   * Consumes 1 daily credit server-side. Returns true if the AI call may proceed.
   * Pro/trial users always succeed without decrementing. On exhaustion, opens upgrade sheet.
   */
  const requireCredit = useCallback(async (kind: string): Promise<boolean> => {
    if (isPro) return true;
    const { data, error } = await (supabase as any).rpc("consume_ai_token", {
      _kind: kind,
      _daily_limit: dailyLimit,
    });
    if (error) {
      console.error("consume_ai_token error", error);
      // Fail-open so a transient error doesn't block paying users
      return true;
    }
    const row = Array.isArray(data) ? data[0] : data;
    profileQuery.refetch();
    if (!row?.allowed) {
      setUpgradeReason(
        `You've used today's ${dailyLimit} free credits. Upgrade to Pro for unlimited AI.`,
      );
      setUpgradeOpen(true);
      return false;
    }
    return true;
  }, [isPro, profileQuery]);

  return {
    isPro,
    isTrial,
    hasPaidPro,
    trialDaysLeft,
    isLoading: subLoading || profileQuery.isLoading,
    plan: sub?.plan_id ?? "free",
    expiresAt: sub?.expires_at ?? null,
    firstPurchaseUsed: !!profileQuery.data?.first_purchase_used,
    creditsUsed,
    creditsLeft,
    dailyLimit,
    upgradeOpen,
    upgradeReason,
    setUpgradeOpen,
    requirePro,
    requireCredit,
  };
}
