import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { toast } from "sonner";
import { useState } from "react";

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

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
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
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Gift className="w-6 h-6 text-amber-500" /> Refer & Earn
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Share OverraPrep with friends. You both earn tokens when they complete their first quiz.
            </p>
          </header>

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
