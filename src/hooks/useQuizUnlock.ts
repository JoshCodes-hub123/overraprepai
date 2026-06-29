import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { aiGate } from "@/lib/aiGate";

/**
 * Returns whether the current user has unlocked a given quiz,
 * plus an `unlock()` action that spends tokens and saves the unlock forever.
 */
export function useQuizUnlock(quizId?: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["quiz-unlock", user?.id, quizId],
    enabled: !!user?.id && !!quizId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("quiz_unlocks")
        .select("id, unlocked_at, cost_paid")
        .eq("user_id", user!.id)
        .eq("quiz_id", quizId!)
        .maybeSingle();
      return data as { id: string; unlocked_at: string; cost_paid: number } | null;
    },
  });

  const unlock = useCallback(async (): Promise<{ ok: boolean; cost?: number; balance?: number; reason?: string }> => {
    if (!quizId) return { ok: false, reason: "missing_quiz_id" };
    const { data, error } = await (supabase as any).rpc("unlock_quiz", { _quiz_id: quizId });
    if (error) {
      toast.error("Could not unlock quiz", { description: error.message });
      return { ok: false, reason: error.message };
    }
    if (!data?.allowed) {
      if (data?.reason === "insufficient") {
        aiGate.open(
          "Unlock this quiz",
          `Your 2 free daily unlocks are used and your wallet is empty 💛 Top up just ₦250 to unlock this quiz now — or come back tomorrow when your free actions reset.`,
        );
      }
      return { ok: false, cost: data?.cost, balance: data?.balance, reason: data?.reason };
    }
    qc.invalidateQueries({ queryKey: ["quiz-unlock", user?.id, quizId] });
    qc.invalidateQueries({ queryKey: ["wallet-profile"] });
    qc.invalidateQueries({ queryKey: ["token-balance"] });
    qc.invalidateQueries({ queryKey: ["ai_token_balance"] });
    if (data.already_unlocked) toast.success("Already unlocked — enjoy!");
    else if (data.source === "free") toast.success(`Unlocked with a free action · ${data.free_left ?? 0}/2 left today`);
    else toast.success(`Unlocked! −${data.cost} tokens · ${data.balance} left`);
    return { ok: true, cost: data.cost, balance: data.balance };
  }, [quizId, qc, user?.id]);


  return {
    isUnlocked: !!query.data,
    isLoading: query.isLoading,
    unlock,
  };
}
