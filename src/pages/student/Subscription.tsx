import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMySubscription } from "@/hooks/useSubscription";
import { usePremium } from "@/hooks/usePremium";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SubmitPaymentDialog from "@/components/subscription/SubmitPaymentDialog";
import { Crown, Clock, Loader2, Check, Sparkles, Zap, BookOpen, Mic, MessageSquare, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const PRO_FEATURES = [
  { icon: Sparkles, text: "Unlimited AI explanations & summaries" },
  { icon: BookOpen, text: "Unlimited AI quiz generation from notes" },
  { icon: Mic, text: "Unlimited audio lessons (any voice)" },
  { icon: GraduationCap, text: "All mock exams + AI remediation playlist" },
  { icon: MessageSquare, text: "Priority AI tutor + study coach chat" },
  { icon: Crown, text: "Pro badge on profile & leaderboard" },
];

const Subscription = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: mySub } = useMySubscription();
  const { isPro, isTrial, hasPaidPro, trialDaysLeft, firstPurchaseUsed } = usePremium();
  const [launching, setLaunching] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const discount = !firstPurchaseUsed && !hasPaidPro;
  const priceNGN = discount ? 1500 : 2000;

  const handleUpgrade = async () => {
    try {
      setLaunching(true);
      const { data, error } = await supabase.functions.invoke("flutterwave-init", {
        body: {
          plan_id: "pro_monthly",
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
      setLaunching(false);
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

  // Lookup the Pro plan row so the manual-transfer dialog has a plan object
  const { data: proPlan } = useQuery({
    queryKey: ["plan-pro-monthly"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("subscription_plans")
        .select("*")
        .eq("id", "pro_monthly")
        .maybeSingle();
      return data;
    },
  });

  const expiresAt = mySub?.expires_at;

  return (
    <>
      <SEO title="Upgrade to Pro" description="Unlock unlimited AI study tools on OverraPrep." url="https://overraprepai.com/subscription" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <header className="mb-5 text-center">
            <h1 className="font-display text-2xl font-bold flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" /> OverraPrep Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              One plan. One price. Unlimited AI study power.
            </p>
          </header>

          {/* Trial banner */}
          {isTrial && !hasPaidPro && (
            <Card className="p-4 mb-5 border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/60">
              <p className="text-sm font-semibold text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                You're on a free 2-day Pro trial — {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
              </p>
              <p className="text-[12px] text-amber-800/80 mt-0.5">
                Enjoy unlimited everything. Subscribe before the trial ends to keep your streak alive.
              </p>
            </Card>
          )}

          {/* Active Pro */}
          {hasPaidPro && (
            <Card className="p-4 mb-5 border-emerald-200 bg-emerald-50/60">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Active</p>
                  <p className="font-display text-lg font-extrabold text-emerald-900">Pro — Unlimited</p>
                </div>
                {expiresAt && (
                  <div className="text-right">
                    <p className="text-[11px] text-emerald-700 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" /> Renews
                    </p>
                    <p className="text-sm font-semibold text-emerald-900">{format(new Date(expiresAt), "PP")}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* The big Pro card */}
          <Card className="overflow-hidden border-amber-200 shadow-[0_20px_60px_-30px_rgba(180,140,40,0.45)]">
            <div className="h-1.5 w-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
            <div className="p-6">
              <div className="flex items-baseline justify-center gap-2 flex-wrap">
                {discount && (
                  <span className="font-display text-2xl font-bold text-muted-foreground line-through">
                    ₦2,000
                  </span>
                )}
                <span className="font-display text-5xl font-extrabold text-amber-900">
                  ₦{priceNGN.toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              {discount && (
                <Badge className="mt-2 mx-auto bg-amber-500 hover:bg-amber-500 text-white block w-fit">
                  First month special — save ₦500
                </Badge>
              )}
              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                Auto-billed monthly. Cancel anytime. Free users get 5 AI credits per day.
              </p>

              <ul className="mt-5 space-y-2.5">
                {PRO_FEATURES.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-amber-700" strokeWidth={3} />
                    </span>
                    <span className="text-foreground">
                      <Icon className="inline h-3.5 w-3.5 mr-1 text-amber-600 -mt-0.5" />
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={handleUpgrade}
                disabled={launching || hasPaidPro}
                className="mt-6 w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-[0_8px_24px_-8px_rgba(180,140,40,0.55)]"
              >
                {launching ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening secure checkout…</>
                ) : hasPaidPro ? (
                  "You're already Pro"
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> {isTrial ? "Subscribe now" : "Upgrade to Pro"}</>
                )}
              </Button>

              <button
                type="button"
                onClick={() => proPlan && setManualOpen(true)}
                disabled={!proPlan}
                className="mt-3 w-full text-[12px] text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                Pay by manual bank transfer instead
              </button>
            </div>
          </Card>

          {/* Free tier note */}
          <Card className="mt-4 p-4 border-muted">
            <p className="text-[12px] text-muted-foreground flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong className="text-foreground">Free tier:</strong> 5 AI credits per day (resets at midnight).
                Browse, take existing quizzes, leaderboards, SRS review and community are always free.
              </span>
            </p>
          </Card>

          {/* Payment history */}
          <section className="mt-7">
            <h2 className="font-display text-base font-bold mb-2">Payment history</h2>
            {requests.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No manual payment submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <Card key={r.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm capitalize">{r.plan_id}</p>
                      <p className="text-[11px] text-muted-foreground">
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
        open={manualOpen}
        onOpenChange={setManualOpen}
        plan={proPlan}
        onSubmitted={() => qc.invalidateQueries({ queryKey: ["payment-requests", user?.id] })}
      />
    </>
  );
};

export default Subscription;
