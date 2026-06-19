import { useParams } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, RefreshCw } from "lucide-react";
import { useBattleDetail, useRecomputeBattle } from "@/hooks/useGrowth";

export default function CampusBattleDetail() {
  const { id } = useParams();
  const { data, isLoading } = useBattleDetail(id);
  const recompute = useRecomputeBattle();

  if (isLoading || !data?.battle) {
    return (
      <div className="min-h-screen bg-background"><DashboardNav role="student" />
        <main className="container mx-auto p-6 max-w-2xl"><Card className="p-8 text-center text-sm text-muted-foreground">Loading…</Card></main>
      </div>
    );
  }
  const b = data.battle;
  const scores = data.scores;
  const sideA = scores.find((s: any) => s.side === b.side_a);
  const sideB = scores.find((s: any) => s.side === b.side_b);
  const totalA = Number(sideA?.total_points || 0);
  const totalB = Number(sideB?.total_points || 0);
  const sum = totalA + totalB || 1;
  const pctA = (totalA / sum) * 100;

  return (
    <>
      <SEO title={b.title} description="Campus battle live scoreboard." url={`https://overraprep.com/growth/battles/${b.id}`} />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <PremiumPageHero eyebrow={b.scope.toUpperCase() + " BATTLE"} title={b.title} subtitle={b.description || ""} icon={Swords} back />

          <Card className="p-6 mt-6 border-amber-100">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center flex-1">
                <p className="font-display text-2xl font-bold">{b.side_a}</p>
                <p className="text-3xl font-extrabold text-amber-700 mt-1">{Math.round(totalA)}</p>
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground px-3">vs</div>
              <div className="text-center flex-1">
                <p className="font-display text-2xl font-bold">{b.side_b}</p>
                <p className="text-3xl font-extrabold text-amber-700 mt-1">{Math.round(totalB)}</p>
              </div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden flex">
              <div className="bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${pctA}%` }} />
              <div className="bg-gradient-to-r from-zinc-700 to-zinc-900 flex-1" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
              {[sideA, sideB].map((s, i) => s && (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Quiz</span><span className="font-semibold">{Math.round(s.quiz_points)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Arena</span><span className="font-semibold">{Math.round(s.arena_points)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Streaks</span><span className="font-semibold">{Math.round(s.streak_points)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Participants</span><span className="font-semibold">{s.participant_count}</span></div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-5 w-full" onClick={() => recompute.mutate(b.id)} disabled={recompute.isPending}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${recompute.isPending ? "animate-spin" : ""}`} /> Recompute live scores
            </Button>
          </Card>

          {b.status === "ended" && b.winner_side && (
            <Card className="p-5 mt-4 bg-gradient-to-br from-amber-100 to-amber-50 border-amber-300">
              <p className="text-xs uppercase tracking-wider text-amber-800">Final winner</p>
              <p className="font-display text-2xl font-bold">🏆 {b.winner_side}</p>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
