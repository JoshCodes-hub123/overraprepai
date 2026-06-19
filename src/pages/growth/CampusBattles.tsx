import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useCampusBattles } from "@/hooks/useGrowth";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CampusBattles() {
  const { data: battles = [] } = useCampusBattles();
  const [tab, setTab] = useState("live");

  const filtered = battles.filter((b: any) => {
    if (tab === "live") return b.status === "live";
    if (tab === "upcoming") return b.status === "scheduled";
    return b.status === "ended";
  });

  return (
    <>
      <SEO title="Campus Battles" description="University-wide academic competitions." url="https://overraprep.com/growth/battles" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <PremiumPageHero eyebrow="CAMPUS BATTLES" title="University vs University" subtitle="Quizzes, arena scores and streaks all count. Lift your side." icon={Swords} back />

          <Tabs value={tab} onValueChange={setTab} className="mt-6">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="live">Live</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="ended">Past</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4 space-y-3">
              {filtered.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">No battles in this tab.</Card>
              ) : (
                filtered.map((b: any) => (
                  <Link key={b.id} to={`/growth/battles/${b.id}`}>
                    <Card className="p-4 hover:shadow-md transition-all border-amber-100/70">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge variant="secondary" className="text-[10px] uppercase">{b.scope}</Badge>
                          <p className="font-display text-lg font-bold mt-1.5">{b.title}</p>
                          <p className="text-sm text-muted-foreground">{b.side_a} <span className="text-amber-700 font-semibold">vs</span> {b.side_b}</p>
                          {b.prize_summary && <p className="text-xs text-amber-700 mt-1.5">🏆 {b.prize_summary}</p>}
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {b.status === "ended" ? (
                            <span className="text-amber-700 font-bold">Winner: {b.winner_side}</span>
                          ) : (
                            <>Ends<br />{new Date(b.ends_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
