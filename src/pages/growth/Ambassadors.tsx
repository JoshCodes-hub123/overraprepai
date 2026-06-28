import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Star } from "lucide-react";
import { useAmbassadorLeaderboard } from "@/hooks/useGrowth";
import bgsFutaAvatar from "@/assets/bgs-futa-ambassador.jpg.asset.json";

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

          {/* Featured Lead Ambassador */}
          <Card className="mt-6 overflow-hidden border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-white">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-5">
              <img
                src={bgsFutaAvatar.url}
                alt="BGS FUTA — Lead Ambassador"
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-amber-300 shadow-md"
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                  <Star className="h-3 w-3 fill-white" /> Lead Ambassador
                </div>
                <h2 className="mt-2 font-display text-xl font-bold text-zinc-900">BGS FUTA</h2>
                <p className="text-sm text-zinc-700">Federal University of Technology, Akure</p>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
                  Driving OverraPrep adoption across FUTA — championing study groups, peer mentoring, and exam-readiness culture campus-wide.
                </p>
              </div>
            </div>
          </Card>

          {list.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground mt-6">More ambassadors will appear here as they are promoted.</Card>
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
