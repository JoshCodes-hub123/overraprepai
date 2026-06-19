import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useArenaChallenges } from "@/hooks/useArena";
import ArenaChallengeCard from "@/components/arena/ArenaChallengeCard";

export default function ArenaHome() {
  const { data: challenges = [], isLoading } = useArenaChallenges();
  const [tab, setTab] = useState<"live" | "upcoming" | "past">("live");

  const buckets = useMemo(() => {
    const live = challenges.filter((c) => c.status === "live");
    const upcoming = challenges.filter((c) => c.status === "scheduled");
    const past = challenges.filter((c) => c.status === "ended" || c.status === "settled");
    return { live, upcoming, past };
  }, [challenges]);

  const featured = useMemo(
    () => challenges.find((c) => c.featured && (c.status === "live" || c.status === "scheduled")),
    [challenges],
  );

  return (
    <>
      <SEO title="Challenge Arena" description="Compete with classmates in academic challenges. Earn tokens and badges." noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-3xl">
          <div className="mb-5">
            <PremiumPageHero
              eyebrow="CHALLENGE ARENA"
              title="Compete. Learn. Earn your spot."
              subtitle="Daily and weekly academic competitions. Top finishers take the prize pool."
              icon={Trophy}
              back="/student/dashboard"
            />
          </div>

          {featured && (
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 mb-2 px-1">
                Featured
              </div>
              <ArenaChallengeCard challenge={featured} featured />
            </div>
          )}

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-3 w-full bg-amber-50/50 border border-amber-100">
              <TabsTrigger value="live">Live ({buckets.live.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({buckets.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">Past ({buckets.past.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-3 mt-4">
              {isLoading && <Card className="p-6 animate-pulse text-sm text-muted-foreground">Loading…</Card>}
              {!isLoading && buckets.live.length === 0 && <EmptyState text="No live challenges right now — check back soon." />}
              {buckets.live.map((c) => (
                <ArenaChallengeCard key={c.id} challenge={c} featured={c.featured} />
              ))}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-3 mt-4">
              {!isLoading && buckets.upcoming.length === 0 && <EmptyState text="No upcoming challenges yet." />}
              {buckets.upcoming.map((c) => (
                <ArenaChallengeCard key={c.id} challenge={c} featured={c.featured} />
              ))}
            </TabsContent>

            <TabsContent value="past" className="space-y-3 mt-4">
              {!isLoading && buckets.past.length === 0 && <EmptyState text="No past challenges yet." />}
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
