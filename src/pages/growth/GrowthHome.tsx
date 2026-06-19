import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Trophy, Swords, Star, Gift, BarChart3, Crown } from "lucide-react";
import { useUniversityRankings, useCampusBattles, useMyReferralSummary } from "@/hooks/useGrowth";

const tiles = [
  { to: "/growth/battles", icon: Swords, label: "Campus Battles", desc: "University & department face-offs" },
  { to: "/growth/ambassadors", icon: Crown, label: "Ambassadors", desc: "Student leaders moving campuses" },
  { to: "/growth/impact", icon: BarChart3, label: "Campus Impact", desc: "Live ranking of every university" },
  { to: "/referrals", icon: Gift, label: "Refer & Earn", desc: "Tokens for every friend you bring" },
];

export default function GrowthHome() {
  const { data: unis = [] } = useUniversityRankings();
  const { data: battles = [] } = useCampusBattles();
  const { data: me } = useMyReferralSummary();

  const live = battles.filter((b: any) => b.status === "live").slice(0, 3);

  return (
    <>
      <SEO title="Growth Engine" description="Campus battles, ambassadors, referrals and impact." url="https://overraprep.com/growth" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <PremiumPageHero eyebrow="GROWTH ENGINE" title="Lift your campus" subtitle="Earn rank, rewards and reputation by helping classmates succeed." icon={Trophy} back />

          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {tiles.map((t) => (
              <Link key={t.to} to={t.to}>
                <Card className="p-4 h-full border-amber-100/70 hover:border-amber-300 transition-all hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center mb-2">
                    <t.icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</div>
                </Card>
              </Link>
            ))}
          </section>

          {me && (
            <Card className="p-5 mt-6 border-amber-100 bg-gradient-to-br from-amber-50/50 to-background">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-amber-700 font-semibold">Your referral progress</p>
                  <p className="font-display text-2xl font-bold mt-1">{me.active} active referrals</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Next reward</p>
                  <p className="font-semibold">{me.next?.name}</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden mt-3">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${Math.min(100, (me.next?.progress / me.next?.at) * 100)}%` }} />
              </div>
              <Link to="/referrals" className="text-xs text-amber-700 font-medium mt-2 inline-block">View referrals →</Link>
            </Card>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-bold flex items-center gap-2"><Swords className="w-4 h-4 text-amber-600" /> Live battles</h2>
              <Link to="/growth/battles" className="text-xs text-amber-700 font-medium">See all</Link>
            </div>
            {live.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">No live battles right now. Check back soon.</Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {live.map((b: any) => (
                  <Link key={b.id} to={`/growth/battles/${b.id}`}>
                    <Card className="p-4 hover:shadow-md transition-all">
                      <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">{b.scope}</p>
                      <p className="font-semibold mt-0.5">{b.side_a} <span className="text-muted-foreground">vs</span> {b.side_b}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ends {new Date(b.ends_at).toLocaleDateString()}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-amber-600" /> Top universities (30d)</h2>
            <Card className="divide-y">
              {unis.slice(0, 8).map((u, i) => (
                <div key={u.university} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{u.university}</p>
                      <p className="text-[11px] text-muted-foreground">{u.active_students} active</p>
                    </div>
                  </div>
                  <p className="font-display font-bold text-amber-700">{Math.round(u.score)}</p>
                </div>
              ))}
              {unis.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Rankings will appear as students get active.</div>}
            </Card>
          </section>
        </main>
      </div>
    </>
  );
}
