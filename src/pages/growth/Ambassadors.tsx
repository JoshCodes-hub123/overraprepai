import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useAmbassadorLeaderboard } from "@/hooks/useGrowth";

const tierColor: Record<string, string> = {
  elite: "bg-amber-200 text-amber-900",
  star: "bg-amber-100 text-amber-800",
  rising: "bg-zinc-100 text-zinc-700",
  rookie: "bg-zinc-50 text-zinc-600",
};

export default function Ambassadors() {
  const { data: list = [] } = useAmbassadorLeaderboard("all");

  return (
    <>
      <SEO title="Campus Ambassadors" description="Top student leaders on OverraPrep." url="https://overraprep.com/growth/ambassadors" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <PremiumPageHero eyebrow="CAMPUS AMBASSADORS" title="Student leaders" subtitle="The students moving OverraPrep across every campus." icon={Crown} back />

          {list.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground mt-6">Ambassadors will appear here as they are promoted.</Card>
          ) : (
            <Card className="divide-y mt-6">
              {list.map((a, i) => (
                <div key={a.user_id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{a.full_name || "Ambassador"}</p>
                      <p className="text-[11px] text-muted-foreground">{a.university || "—"} · {a.total_referrals} referrals</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={tierColor[a.tier] || "bg-muted"}>{a.tier}</Badge>
                    <span className="font-display font-bold text-amber-700">{Math.round(a.score)}</span>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
