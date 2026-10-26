import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Trophy, Coins, Clock, Users, Crown, Ticket, Play, CheckCircle2 } from "lucide-react";
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
  useArenaTickets,
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
  const { tickets, bonusTokensEarned, canClaimDaily, claimDailyTickets } = useArenaTickets();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !ch) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading challenge…
      </div>
    );
  }

  const totalTokens = balance + bonusTokensEarned;
  const isFree = ch.entry_token_cost === 0;
  const canAffordWithTicket = tickets > 0;
  const canAffordWithTokens = totalTokens >= ch.entry_token_cost;
  const canEnter = isFree || canAffordWithTicket || canAffordWithTokens;

  const handleEnter = async () => {
    const res = await enter
      .mutateAsync({ challengeId: ch.id, useTicket: tickets > 0 })
      .catch(() => null);
    setConfirmOpen(false);
    if (res?.entry_id) {
      if (myEntry?.status === "submitted") {
        toast.info("You've already submitted for this challenge.");
        navigate(`/arena/${ch.id}/leaderboard`);
        return;
      }
      navigate(`/arena/${ch.id}/play`);
    }
  };

  const cta =
    myEntry?.status === "submitted" ? (
      <div className="flex flex-col sm:flex-row gap-2.5">
        <Button
          size="lg"
          className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          onClick={() => navigate(`/arena/${ch.id}/leaderboard`)}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          View Your Score & Answer Review ({myEntry.score} pts · {myEntry.accuracy}%)
        </Button>
      </div>
    ) : myEntry?.status === "in_progress" ? (
      <Button
        size="lg"
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
        onClick={() => navigate(`/arena/${ch.id}/play`)}
      >
        <Play className="w-4 h-4 mr-2" />
        Resume Challenge Now
      </Button>
    ) : myEntry?.status === "disqualified" ? (
      <Button size="lg" disabled variant="outline" className="w-full">
        Entry disqualified
      </Button>
    ) : ch.status === "live" ? (
      <Button
        size="lg"
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md shadow-amber-500/20"
        onClick={() => (isFree ? handleEnter() : setConfirmOpen(true))}
      >
        <Play className="w-4 h-4 mr-2" />
        {isFree
          ? "Start Free Challenge Now"
          : tickets > 0
            ? `Start Challenge (Use 1 Free Ticket · ${tickets} left)`
            : `Enter Challenge (${ch.entry_token_cost} Token)`}
      </Button>
    ) : ch.status === "scheduled" ? (
      <Button
        size="lg"
        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
        onClick={() => setConfirmOpen(true)}
      >
        <Play className="w-4 h-4 mr-2" />
        Practice Early Entry (Starts in {fmt(ch.starts_at)})
      </Button>
    ) : (
      <Button
        size="lg"
        variant="outline"
        className="w-full font-bold"
        onClick={() => navigate(`/arena/${ch.id}/leaderboard`)}
      >
        View Final Standings
      </Button>
    );

  return (
    <>
      <SEO
        title={`${ch.title} · Challenge Arena`}
        description={ch.description ?? "Compete in the OverraPrep Challenge Arena."}
        noindex
      />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-28 max-w-3xl">
          <PremiumPageHero
            eyebrow={ch.kind === "weekly" ? "WEEKLY GRAND PRIX" : "DAILY SPRINT"}
            title={ch.title}
            subtitle={ch.description ?? undefined}
            icon={Trophy}
            back="/arena"
            chips={
              <>
                {ch.featured && (
                  <Badge className="bg-amber-500 text-slate-950 font-bold border-0">Featured</Badge>
                )}
                <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300">
                  {ch.status === "live" ? `Ends in ${fmt(ch.ends_at)}` : ch.status}
                </Badge>
                <Badge variant="outline" className="border-amber-300 text-amber-900 dark:text-amber-200">
                  <Ticket className="w-3 h-3 mr-1 text-amber-600" />
                  {tickets} Tickets
                </Badge>
              </>
            }
          />

          {ch.cover_image_url && (
            <div className="mt-4 relative h-40 sm:h-48 w-full overflow-hidden rounded-2xl border border-amber-200/80 bg-neutral-900">
              <img
                src={ch.cover_image_url}
                alt={ch.title}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white/95 font-semibold">
                <span>{ch.num_questions} Verified CBT Questions</span>
                <span>Instant Grading & Token Rewards</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <Tile
              icon={<Coins className="h-4 w-4 text-amber-600" />}
              label="Prize Pool"
              value={`${ch.prize_pool_tokens} Tokens`}
              accent
            />
            <Tile
              icon={<Ticket className="h-4 w-4 text-amber-600" />}
              label="Entry"
              value={isFree ? "Free" : "1 Ticket"}
            />
            <Tile
              icon={<Clock className="h-4 w-4" />}
              label="Time Limit"
              value={`${Math.round(ch.time_limit_seconds / 60)} mins`}
            />
            <Tile
              icon={<Users className="h-4 w-4" />}
              label="Entrants"
              value={`${board.length}`}
            />
          </div>

          <Card className="mt-4 p-4 sm:p-5 border-amber-200/70 bg-gradient-to-br from-white to-amber-50/30 dark:from-card dark:to-card">
            <div className="text-[11px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400">
              Rules & Rewards
            </div>
            <ul className="text-[13px] text-foreground/85 mt-2 space-y-1.5 list-disc list-inside">
              <li>
                Answer all <strong>{ch.num_questions} questions</strong> within{" "}
                <strong>{Math.round(ch.time_limit_seconds / 60)} minutes</strong>.
              </li>
              <li>
                Score 80%+ to earn <strong>+50 Tokens & +1 Bonus Ticket</strong>; 60%+ earns{" "}
                <strong>+30 Tokens</strong>.
              </li>
              <li>Faster correct submissions rank higher on the campus leaderboard.</li>
              <li>Full question-by-question explanations unlock immediately after submission.</li>
            </ul>
          </Card>

          <div className="mt-5">{cta}</div>

          {/* Leaderboard preview */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Current Standings
              </h2>
              <Link
                to={`/arena/${ch.id}/leaderboard`}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                Full Leaderboard →
              </Link>
            </div>
            {board.length === 0 ? (
              <Card className="p-5 text-center text-sm text-muted-foreground border-dashed border-amber-200 bg-amber-50/30">
                No entries yet. Be the first on campus!
              </Card>
            ) : (
              <Card className="divide-y divide-border/60 border-amber-200/70">
                {board.slice(0, 5).map((row) => (
                  <div key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-7 text-center font-extrabold text-foreground">
                      {row.rank === 1 ? (
                        <Crown className="h-4 w-4 mx-auto text-amber-500" />
                      ) : (
                        `#${row.rank}`
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold text-foreground truncate">
                        {row.full_name ?? "Student"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.score}/{ch.num_questions} correct · {Math.floor(row.time_taken_seconds / 60)}m{" "}
                        {row.time_taken_seconds % 60}s
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                      {row.accuracy}%
                    </div>
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
            <DialogTitle className="font-display">Ready to start this challenge?</DialogTitle>
            <DialogDescription>
              {tickets > 0 ? (
                <>
                  This entry will use <strong>1 Arena Ticket</strong> (you have{" "}
                  <strong>{tickets} free tickets</strong> available). Your timer starts as soon as
                  you confirm.
                </>
              ) : (
                <>
                  This will use <strong>{ch.entry_token_cost} token</strong> from your balance (you
                  have {totalTokens} tokens).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {!canEnter && canClaimDaily && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2">
              <span>Need a ticket? Claim your free daily tickets first.</span>
              <Button
                size="sm"
                onClick={() => claimDailyTickets.mutate()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Claim +2
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnter}
              disabled={enter.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              {enter.isPending ? "Starting…" : "Confirm & Start Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent
          ? "border-amber-200 bg-amber-50/60 dark:bg-amber-500/10 dark:border-amber-500/30"
          : "border-border/80 bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold">
        {icon}
        {label}
      </div>
      <div
        className={`text-base sm:text-lg font-extrabold mt-1 ${
          accent ? "text-amber-800 dark:text-amber-300" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
