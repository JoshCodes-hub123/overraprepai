import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionPlans, useMySubscription } from "@/hooks/useSubscription";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PlanCard from "@/components/subscription/PlanCard";
import SubmitPaymentDialog from "@/components/subscription/SubmitPaymentDialog";
import { Crown, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const Subscription = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: plans = [] } = useSubscriptionPlans();
  const { data: mySub } = useMySubscription();
  const [chosenPlan, setChosenPlan] = useState<any | null>(null);
  const [launchingPlanId, setLaunchingPlanId] = useState<string | null>(null);

  const handleUpgrade = async (plan: any) => {
    if (!plan?.id) return;
    // Free / manual-only plans use the receipt-upload dialog
    if (plan.id === "free" || (plan.price_cents ?? 0) === 0) {
      setChosenPlan(plan);
      return;
    }
    try {
      setLaunchingPlanId(plan.id);
      const { data, error } = await supabase.functions.invoke("flutterwave-init", {
        body: {
          plan_id: plan.id,
          redirect_url: `${window.location.origin}/subscription`,
        },
      });
      if (error) throw error;
      const url = (data as any)?.checkout_url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not start payment. Try again.");
      setLaunchingPlanId(null);
    }
  };


  const { data: requests = [] } = useQuery({
    queryKey: ["payment-requests", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("payment_requests")
        .select("*, subscription_plans(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const currentPlanId = mySub?.plan_id ?? "free";
  const expiresAt = mySub?.expires_at;

  return (
    <>
      <SEO title="Subscription" description="Manage your OverraPrep AI subscription." url="https://overraprep.com/subscription" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" /> Subscription
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Calm, valuable learning — upgrade only when you need more.
            </p>
          </header>

          <Card className="p-4 mb-6 border-amber-100 bg-amber-50/30">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">Current plan</p>
                <p className="font-display text-xl font-bold capitalize">{currentPlanId}</p>
              </div>
              {expiresAt && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" /> Renews / expires
                  </p>
                  <p className="text-sm font-semibold">{format(new Date(expiresAt), "PP")}</p>
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p: any) => (
              <PlanCard
                key={p.id}
                plan={p}
                active={p.id === currentPlanId}
                onChoose={() => setChosenPlan(p)}
              />
            ))}
          </div>

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold mb-3">Payment history</h2>
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payment requests yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm capitalize">{r.plan_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "PPp")} {r.reference ? `• Ref ${r.reference}` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}
                      className={r.status === "approved" ? "bg-emerald-500 hover:bg-emerald-500" : ""}
                    >
                      {r.status}
                    </Badge>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      <SubmitPaymentDialog
        open={!!chosenPlan}
        onOpenChange={(o) => !o && setChosenPlan(null)}
        plan={chosenPlan}
        onSubmitted={() => qc.invalidateQueries({ queryKey: ["payment-requests", user?.id] })}
      />
    </>
  );
};

export default Subscription;
