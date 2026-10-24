import { useParams, useNavigate } from "react-router-dom";
import { Crown, Medal, Trophy, ArrowLeft, Home } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useArenaChallenge,
  useArenaLeaderboard,
  useArenaRealtime,
  useArenaRewards,
  useMyArenaEntry,
} from "@/hooks/useArena";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { GrowthShareCard } from "@/components/growth/GrowthShareCard";

export default function ArenaLeaderboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ch } = useArenaChallenge(id);
  useArenaRealtime(id);
  const isLive = ch?.status === "live";
  const { data: board = [], isLoading } = useArenaLeaderboard(id, isLive);
  const { data: rewards = [] } = useArenaRewards(id);
  const { data: myEntry } = useMyArenaEntry(id);

  const rewardByUser = new Map<string, number>(
    rewards.map((r: any) => [r.user_id, r.tokens_awarded]),
  );

  return (
    <>
      <SEO title={`Leaderboard · ${ch?.title ?? "Challenge"}`} noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-2xl">
          <PremiumPageHero
            eyebrow={ch?.status === "settled" ? "FINAL RESULTS" : "LIVE LEADERBOARD"}
            title={ch?.title ?? "Leaderboard"}
            subtitle={
              ch?.status === "settled"
                ? "Rewards have been paid out. Champion gets the badge."
                : "Updated live as entrants submit."
            }
            icon={Trophy}
            back={`/arena/${id}`}
          />

          {myEntry?.status === "submitted" && (
            <Card className="mt-5 p-4 border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
              <div className="text-[11px] uppercase tracking-wider text-amber-700 font-bold">Your result</div>
              <div className="mt-1 flex items-end justify-between">
                <div>
                  <div className="text-2xl font-display font-extrabold text-neutral-900">
                    {myEntry.score} correct
                  </div>
                  <div className="text-[12px] text-neutral-600">
                    Accuracy {myEntry.accuracy}% · {Math.round(myEntry.time_taken_seconds / 60)}m
                    {myEntry.time_taken_seconds % 60}s
                  </div>
                </div>
                {rewardByUser.get(user?.id ?? "") ? (
                  <div className="text-right">
                    <div className="text-[10.5px] uppercase tracking-wider text-amber-700 font-bold">Winnings</div>
                    <div className="text-xl font-extrabold text-amber-700">
                      +{rewardByUser.get(user?.id ?? "")}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <GrowthShareCard
                  variant="win"
                  eyebrow={ch?.title ?? "Arena"}
                  title={`I scored ${myEntry.score} on ${ch?.title ?? "the Arena"}`}
                  bigStat={`${myEntry.accuracy}%`}
                  subtitle={`${myEntry.score} correct · ${Math.round(myEntry.time_taken_seconds / 60)}m ${myEntry.time_taken_seconds % 60}s`}
                  handle={user?.user_metadata?.full_name as string | undefined}
                  shareUrl={`https://overraprepai.com/arena/${id}`}
                  label="Share my result"
                />
                {(() => {
                  const me = board.find((r) => r.user_id === user?.id);
                  return me && me.rank <= 10 ? (
                    <GrowthShareCard
                      variant="leaderboard"
                      eyebrow={ch?.title ?? "Arena"}
                      title={`I'm ranked #${me.rank} on the leaderboard`}
                      bigStat={`#${me.rank}`}
                      subtitle={`${me.score} correct · ${me.accuracy}% accuracy`}
                      handle={user?.user_metadata?.full_name as string | undefined}
                      shareUrl={`https://overraprepai.com/arena/${id}/leaderboard`}
                      label="Share rank"
                    />
                  ) : null;
                })()}
              </div>
            </Card>
          )}


          <div className="mt-5 space-y-2">
            {isLoading && <Card className="p-6 animate-pulse text-sm text-neutral-500">Loading…</Card>}
            {!isLoading && board.length === 0 && (
              <Card className="p-6 text-center text-sm text-neutral-500 border-dashed">
                No submissions yet.
              </Card>
            )}
            {board.map((row) => {
              const reward = rewardByUser.get(row.user_id);
              const isMe = user?.id === row.user_id;
              return (
                <Card
                  key={row.user_id}
                  className={cn(
                    "p-3 flex items-center gap-3 border transition",
                    isMe ? "border-amber-400 bg-amber-50/50 shadow" : "border-neutral-200",
                  )}
                >
                  <div className="w-9 flex justify-center">
                    {row.rank === 1 ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : row.rank === 2 ? (
                      <Medal className="h-5 w-5 text-neutral-400" />
                    ) : row.rank === 3 ? (
                      <Medal className="h-5 w-5 text-amber-700" />
                    ) : (
                      <span className="text-sm font-extrabold text-neutral-500">#{row.rank}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-neutral-900 truncate">
                      {row.full_name ?? "Anonymous"} {isMe && <span className="text-amber-700">(you)</span>}
                    </div>
                    <div className="text-[11.5px] text-neutral-500">
                      {row.score} correct · {row.accuracy}% · {Math.round(row.time_taken_seconds / 60)}m
                      {row.time_taken_seconds % 60}s
                    </div>
                  </div>
                  {reward ? (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">Won</div>
                      <div className="text-sm font-extrabold text-amber-700">+{reward}</div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-amber-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/arena")}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Arena
            </Button>
            <Button
              onClick={() => navigate("/student/dashboard")}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            >
              <Home className="w-4 h-4 mr-1.5" /> Student Dashboard
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
