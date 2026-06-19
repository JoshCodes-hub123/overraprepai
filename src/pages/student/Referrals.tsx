import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Share2, Award, Crown, Trophy } from "lucide-react";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { toast } from "sonner";
import { useState } from "react";
import { useMyReferralSummary, useClaimMilestone, logShareEvent } from "@/hooks/useGrowth";
import { Link } from "react-router-dom";

const Referrals = () => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);

  const code = (profile as any)?.referral_code as string | undefined;
  const link = code ? `${window.location.origin}/auth?ref=${code}` : "";

  const { data: rewards = [] } = useQuery({
    queryKey: ["my-referrals", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("referral_rewards")
        .select("*")
        .eq("referrer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalEarned = rewards
    .filter((r: any) => r.status === "completed")
    .reduce((acc: number, r: any) => acc + (r.referrer_tokens || 0), 0);

  const { data: summary } = useMyReferralSummary();
  const claim = useClaimMilestone();
  const claimed = (m: string) => summary?.milestones?.includes(m);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied");
    logShareEvent("referral_link", "copy", code);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    logShareEvent("referral_link", "native", code);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on OverraPrep AI",
          text: "Study smart, not hard. Sign up with my code:",
          url: link,
        });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  return (
    <>
      <SEO title="Referrals" description="Invite friends and earn rewards." url="https://overraprep.com/referrals" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="mb-6">
            <PremiumPageHero
              eyebrow="REFER & EARN"
              title="Invite friends, earn tokens"
              subtitle="Share OverraPrep with friends. You both earn tokens when they complete their first quiz."
              icon={Gift}
              back
            />
          </div>

          <Card className="p-5 mb-5 border-amber-100 bg-gradient-to-br from-amber-50/60 to-background">
            <p className="text-xs uppercase tracking-wider font-semibold text-amber-700">Your referral code</p>
            <p className="font-display text-3xl font-bold mt-1 tracking-wider">{code || "—"}</p>
            <p className="text-xs text-muted-foreground mt-2 break-all">{link}</p>
            <div className="flex gap-2 mt-4">
              <Button onClick={copy} variant="outline" className="flex-1">
                {copied ? <><Check className="w-4 h-4 mr-1.5" /> Copied</> : <><Copy className="w-4 h-4 mr-1.5" /> Copy link</>}
              </Button>
              <Button onClick={share} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700">
                <Share2 className="w-4 h-4 mr-1.5" /> Share
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Invited</p>
              <p className="font-display text-2xl font-bold">{rewards.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Tokens earned</p>
              <p className="font-display text-2xl font-bold text-amber-600">{totalEarned}</p>
            </Card>
          </div>

          {summary && (
            <Card className="p-5 mb-6 border-amber-100 bg-gradient-to-br from-amber-50/60 to-background">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wider font-semibold text-amber-700">Milestone progress</p>
                <Link to="/growth/ambassadors" className="text-[11px] text-amber-700 font-medium">See ambassadors →</Link>
              </div>
              <p className="text-sm">
                <span className="font-display text-2xl font-bold">{summary.active}</span>
                <span className="text-muted-foreground"> / {summary.next?.at} toward {summary.next?.name}</span>
              </p>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${Math.min(100, (summary.next?.progress / summary.next?.at) * 100)}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { key: "hero_badge", label: "Hero Badge", at: 5, icon: Award },
                  { key: "premium_reward", label: "Premium Reward", at: 10, icon: Trophy },
                  { key: "campus_ambassador", label: "Ambassador", at: 25, icon: Crown },
                ].map((m) => {
                  const has = claimed(m.key);
                  const eligible = (summary.active || 0) >= m.at;
                  return (
                    <button
                      key={m.key}
                      disabled={!eligible || has || claim.isPending}
                      onClick={() => claim.mutate(m.key as any)}
                      className={`p-3 rounded-xl border text-center transition-all ${has ? "bg-amber-100 border-amber-300" : eligible ? "border-amber-300 hover:bg-amber-50" : "border-muted opacity-60"}`}
                    >
                      <m.icon className="w-5 h-5 mx-auto mb-1 text-amber-700" />
                      <p className="text-[11px] font-semibold">{m.label}</p>
                      <p className="text-[10px] text-muted-foreground">{has ? "Claimed" : eligible ? "Claim" : `${m.at} refs`}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}


          <h2 className="font-display text-lg font-bold mb-3">History</h2>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referrals yet. Share your code to get started.</p>
          ) : (
            <div className="space-y-2">
              {rewards.map((r: any) => (
                <Card key={r.id} className="p-3 flex items-center justify-between text-sm">
                  <span className="capitalize">{r.status}</span>
                  <span className="font-semibold text-amber-600">+{r.referrer_tokens} tokens</span>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Referrals;
