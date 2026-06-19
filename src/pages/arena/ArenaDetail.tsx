import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Trophy, Coins, Clock, Users, AlertTriangle, Crown } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useArenaChallenge,
  useArenaLeaderboard,
  useArenaRealtime,
  useEnterArena,
  useMyArenaEntry,
} from "@/hooks/useArena";
import useTokenBalance from "@/hooks/useTokenBalance";
import { toast } from "sonner";

function fmt(toIso: string) {
  const diff = new Date(toIso).getTime() - Date.now();
  if (diff <= 0) return "0m";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export default function ArenaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: ch, isLoading } = useArenaChallenge(id);
  const { data: myEntry } = useMyArenaEntry(id);
  useArenaRealtime(id);
  const isLive = ch?.status === "live";
  const { data: board = [] } = useArenaLeaderboard(id, isLive);
  const enter = useEnterArena();
  const { balance } = useTokenBalance();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !ch) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading challenge…
      </div>
    );
  }

  const insufficient = balance < ch.entry_token_cost;

  const handleEnter = async () => {
    const res = await enter.mutateAsync(ch.id).catch(() => null);
    setConfirmOpen(false);
    if (res?.entry_id) {
      if (myEntry?.status === "submitted") {
        toast.info("You've already submitted for this challenge.");
        return;
      }
      navigate(`/arena/${ch.id}/play`);
    }
  };

  const cta =
    myEntry?.status === "submitted" ? (
      <Button size="lg" className="w-full" onClick={() => navigate(`/arena/${ch.id}/leaderboard`)}>
        View your result
      </Button>
    ) : myEntry?.status === "in_progress" ? (
      <Button size="lg" className="w-full bg-amber-500 hover:bg-amber-600 text-white" onClick={() => navigate(`/arena/${ch.id}/play`)}>
        Resume challenge
      </Button>
    ) : myEntry?.status === "disqualified" ? (
      <Button size="lg" disabled variant="outline" className="w-full">
        Entry disqualified
      </Button>
    ) : ch.status === "live" ? (
      <Button
        size="lg"
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25"
        onClick={() => setConfirmOpen(true)}
      >
        Enter for {ch.entry_token_cost} token{ch.entry_token_cost === 1 ? "" : "s"}
      </Button>
    ) : ch.status === "scheduled" ? (
      <Button size="lg" disabled className="w-full">
        Starts in {fmt(ch.starts_at)}
      </Button>
    ) : (
      <Button size="lg" variant="outline" className="w-full" onClick={() => navigate(`/arena/${ch.id}/leaderboard`)}>
        View final results
      </Button>
    );

  return (
    <>
      <SEO title={`${ch.title} · Challenge Arena`} description={ch.description ?? "Compete in the OverraPrep Challenge Arena."} noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-3xl">
          <PremiumPageHero
            eyebrow={ch.kind === "weekly" ? "WEEKLY CHALLENGE" : "DAILY CHALLENGE"}
            title={ch.title}
            subtitle={ch.description ?? undefined}
            icon={Trophy}
            back="/arena"
            chips={
              <>
                {ch.featured && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white border-0">Featured</Badge>
                )}
                <Badge variant="outline" className="border-amber-300 text-amber-800">
                  {ch.status === "live" ? `Ends in ${fmt(ch.ends_at)}` : ch.status}
                </Badge>
              </>
            }
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Tile icon={<Coins className="h-4 w-4" />} label="Prize pool" value={`${ch.prize_pool_tokens}`} accent />
            <Tile icon={<Trophy className="h-4 w-4" />} label="Entry cost" value={`${ch.entry_token_cost}`} />
            <Tile icon={<Clock className="h-4 w-4" />} label="Time limit" value={`${Math.round(ch.time_limit_seconds / 60)}m`} />
            <Tile icon={<Users className="h-4 w-4" />} label="Entrants" value={`${board.length}`} />
          </div>

          <Card className="mt-5 p-4 sm:p-5 border-amber-200/70 bg-gradient-to-br from-white to-amber-50/30">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700">How it works</div>
            <ul className="text-[13px] text-neutral-700 mt-2 space-y-1.5 list-disc list-inside">
              <li>Answer all {ch.num_questions} questions within {Math.round(ch.time_limit_seconds / 60)} minutes.</li>
              <li>Score is graded server-side. Faster correct answers rank higher.</li>
              <li>Prize pool is split among top finishers when the challenge ends.</li>
              <li>One submission per student. No retakes.</li>
            </ul>
          </Card>

          <div className="mt-5">{cta}</div>

          {/* Leaderboard preview */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-neutral-600">
                Current standings
              </h2>
              {board.length > 5 && (
                <Link to={`/arena/${ch.id}/leaderboard`} className="text-[12px] font-semibold text-amber-700">
                  See all →
                </Link>
              )}
            </div>
            {board.length === 0 ? (
              <Card className="p-5 text-center text-sm text-neutral-500 border-dashed border-amber-200 bg-amber-50/30">
                No entries yet. Be the first.
              </Card>
            ) : (
              <Card className="divide-y divide-neutral-100">
                {board.slice(0, 5).map((row) => (
                  <div key={row.user_id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-7 text-center font-extrabold text-neutral-800">
                      {row.rank === 1 ? <Crown className="h-4 w-4 mx-auto text-amber-500" /> : `#${row.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-neutral-900 truncate">
                        {row.full_name ?? "Anonymous"}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {row.score} correct · {Math.round(row.time_taken_seconds / 60)}m{row.time_taken_seconds % 60}s
                      </div>
                    </div>
                    <div className="text-[12px] font-extrabold text-amber-700">{row.accuracy}%</div>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </main>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Enter this challenge?</DialogTitle>
            <DialogDescription>
              This will charge <strong>{ch.entry_token_cost} token{ch.entry_token_cost === 1 ? "" : "s"}</strong> from your wallet
              (you have {balance}). You can only enter once.
            </DialogDescription>
          </DialogHeader>
          {insufficient && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12.5px]">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              You don't have enough tokens. <Link to="/wallet" className="underline ml-1">Top up</Link>.
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              onClick={handleEnter}
              disabled={enter.isPending || insufficient}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {enter.isPending ? "Entering…" : "Confirm & start"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tile({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "border-amber-200 bg-amber-50/50" : "border-neutral-200 bg-white"}`}>
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-neutral-500 font-semibold">
        {icon}{label}
      </div>
      <div className={`text-lg font-extrabold mt-1 ${accent ? "text-amber-800" : "text-neutral-900"}`}>{value}</div>
    </div>
  );
}
