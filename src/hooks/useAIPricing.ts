import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PricingRow = {
  kind: string;
  cost: number;
  free_eligible: boolean;
  label: string;
  description: string | null;
};

/**
 * Fetches the central AI-pricing list once per session.
 * The list rarely changes, so we cache it for 1 hour and keep it in
 * localStorage via the React Query persister so first paint is instant.
 */
export function useAIPricing() {
  const query = useQuery<PricingRow[]>({
    queryKey: ["ai-pricing"],
    staleTime: 1000 * 60 * 60, // 1h
    gcTime: 1000 * 60 * 60 * 24,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ai_pricing")
        .select("kind, cost, free_eligible, label, description")
        .order("cost", { ascending: true });
      return (data ?? []) as PricingRow[];
    },
  });

  const map = new Map<string, PricingRow>();
  for (const row of query.data ?? []) map.set(row.kind, row);

  return {
    pricing: query.data ?? [],
    isLoading: query.isLoading,
    /** Returns the token cost for an action (defaults to 1 if unknown). */
    priceFor: (kind: string) => map.get(kind)?.cost ?? 1,
    /** True if the action is part of the 3-free-daily quota. */
    isFreeEligible: (kind: string) => !!map.get(kind)?.free_eligible,
    labelFor: (kind: string) => map.get(kind)?.label ?? kind,
  };
}
