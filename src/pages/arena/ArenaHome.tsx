import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Coins, Ticket, Gift, ArrowRight, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useArenaChallenges, useArenaTickets } from "@/hooks/useArena";
import useTokenBalance from "@/hooks/useTokenBalance";
import ArenaChallengeCard from "@/components/arena/ArenaChallengeCard";

export default function ArenaHome() {
  const { data: challenges = [], isLoading } = useArenaChallenges();
  const { balance } = useTokenBalance();
  const { tickets, bonusTokensEarned, canClaimDaily, claimDailyTickets } = useArenaTickets();
  const [tab, setTab] = useState<"live" | "upcoming" | "past">("live");

  const totalTokens = balance + bonusTokensEarned;

  const buckets = useMemo(() => {
    const live = challenges.filter((c) => c.status === "live");
    const upcoming = challenges.filter((c) => c.status === "scheduled");
    const past = challenges.filter((c) => c.status === "ended" || c.status === "settled");
    return { live, upcoming, past };
  }, [challenges]);

  const featured = useMemo(
    () => challenges.find((c) => c.featured && (c.status === "live" || c.status === "scheduled")),
    [challenges]
  );

  return (
    <>
      <SEO
        title="Challenge Arena — OverraPrep"
        description="Compete with classmates in academic challenges. Earn tokens, tickets, and campus rank."
        noindex
      />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-28 max-w-3xl">
          <div className="mb-4">
            <PremiumPageHero
              eyebrow="CHALLENGE ARENA"
              title="Compete. Learn. Earn your spot."
              subtitle="Daily and weekly university academic competitions. Use your free Arena Tickets to play and win tokens."
              icon={Trophy}
              back="/student/dashboard"
              right={
                <div className="flex items-center gap-2">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-300 text-amber-900 dark:text-amber-200 font-bold text-xs"
                    title="Your Arena Entry Tickets"
                  >
                    <Ticket className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{tickets} Tickets</span>
                  </div>
                  <Link
                    to="/wallet"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-foreground font-bold text-xs hover:border-amber-300 transition active:scale-95"
                    title="View tokens in wallet"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-600" />
                    <span>{totalTokens} Tokens</span>
                  </Link>
                </div>
              }
            />
          </div>

          {/* Arena Ticket Pass & Daily Free Claim Banner */}
          <Card className="mb-5 p-4 border-amber-200/80 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-card dark:to-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                  Student Arena Pass · {tickets} Free Ticket{tickets === 1 ? "" : "s"} Available
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every challenge entry uses 1 Arena Ticket (or tokens). Score 60%+ to win instant bonus tokens!
                </p>
              </div>
            </div>

            {canClaimDaily ? (
              <Button
                size="sm"
                onClick={() => claimDailyTickets.mutate()}
                disabled={claimDailyTickets.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shrink-0"
              >
                <Gift className="w-3.5 h-3.5 mr-1.5" />
                {claimDailyTickets.isPending ? "Claiming…" : "Claim +2 Daily Tickets"}
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="w-3.5 h-3.5" /> Daily Bonus Claimed
              </span>
            )}
          </Card>

          <div className="mb-5 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Link
                to="/leaderboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 bg-card border border-amber-200/80 dark:border-border hover:bg-amber-50 px-3 py-1.5 rounded-full shadow-2xs transition"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-600" />
                <span>Campus Rankings</span>
              </Link>
            </div>
            <Link
              to="/courses"
              className="text-xs font-semibold text-muted-foreground hover:text-amber-700 flex items-center gap-1"
            >
              Study Courses <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {featured && tab === "live" && (
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400 mb-2 px-1">
                Featured Competition
              </div>
              <ArenaChallengeCard challenge={featured} featured />
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full bg-amber-50/60 dark:bg-muted border border-amber-200/60 dark:border-border">
              <TabsTrigger value="live">Live ({buckets.live.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Completed ({buckets.past.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-3.5 mt-4">
              {isLoading && (
                <Card className="p-6 animate-pulse text-sm text-muted-foreground">
                  Loading live challenges…
                </Card>
              )}
              {!isLoading && buckets.live.length === 0 && (
                <EmptyState text="No live challenges right now — check back soon." />
              )}
              {buckets.live.map((c) => (
                <ArenaChallengeCard key={c.id} challenge={c} featured={c.featured} />
              ))}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-3.5 mt-4">
              {!isLoading && buckets.upcoming.length === 0 && (
                <EmptyState text="No upcoming challenges scheduled right now." />
              )}
              {buckets.upcoming.map((c) => (
                <ArenaChallengeCard key={c.id} challenge={c} featured={c.featured} />
              ))}
            </TabsContent>

            <TabsContent value="past" className="space-y-3.5 mt-4">
              {!isLoading && buckets.past.length === 0 && (
                <EmptyState text="No past challenges yet." />
              )}
              {buckets.past.map((c) => (
                <ArenaChallengeCard key={c.id} challenge={c} />
              ))}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-8 text-center border-dashed border-amber-200 bg-amber-50/30">
      <Trophy className="h-8 w-8 mx-auto text-amber-400 mb-2" />
      <p className="text-sm text-neutral-600">{text}</p>
    </Card>
  );
}
