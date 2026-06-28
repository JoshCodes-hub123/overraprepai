import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";

/**
 * Admin view of all referral activity — pending vs completed, plus the most
 * recent rewards. A referral becomes "completed" the moment the invited user
 * makes their first token purchase, which credits 2 tokens to the referrer.
 */
export default function AdminReferralsPanel() {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("referral_rewards")
        .select("id, status, referrer_tokens, created_at, completed_at, referrer_id, referee_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const completed = rows.filter((r: any) => r.status === "completed");
  const pending = rows.filter((r: any) => r.status === "pending");
  const tokensPaid = completed.reduce((a: number, r: any) => a + (r.referrer_tokens || 0), 0);

  return (
    <Card className="p-5">
      <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
        <Gift className="w-4 h-4 text-amber-600" /> Referrals
      </h2>
      <div className="grid grid-cols-3 gap-3 text-center mb-4">
        <div><p className="text-xs text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-700">{pending.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold text-emerald-700">{completed.length}</p></div>
        <div><p className="text-xs text-muted-foreground">Tokens paid</p><p className="text-2xl font-bold text-amber-700">{tokensPaid}</p></div>
      </div>
      <div className="divide-y">
        {rows.slice(0, 12).map((r: any) => (
          <div key={r.id} className="py-2 flex items-center justify-between text-xs">
            <span className="font-mono text-muted-foreground">
              {r.referrer_id.slice(0, 8)} → {r.referee_id.slice(0, 8)}
            </span>
            <span className={r.status === "completed" ? "text-emerald-700 font-semibold" : "text-amber-700"}>
              {r.status} · +{r.referrer_tokens}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="py-3 text-sm text-muted-foreground">No referrals yet.</p>
        )}
      </div>
    </Card>
  );
}
