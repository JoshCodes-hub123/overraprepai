import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Crown,
  Medal,
  Trophy,
  ArrowLeft,
  Home,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Coins,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getArenaSubmissionReview,
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
  const [showReview, setShowReview] = useState(true);

  const reviewItems = getArenaSubmissionReview(id, user?.id);

  const rewardByUser = new Map<string, number>(
    rewards.map((r: any) => [r.user_id, r.tokens_awarded])
  );

  const myUid = user?.id || "guest-student";
  const myReward = rewardByUser.get(myUid) ?? 0;

  return (
    <>
      <SEO title={`Leaderboard · ${ch?.title ?? "Challenge"}`} noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-28 max-w-2xl">
          <PremiumPageHero
            eyebrow={ch?.status === "settled" ? "FINAL RESULTS" : "LIVE LEADERBOARD"}
            title={ch?.title ?? "Leaderboard"}
            subtitle={
              ch?.status === "settled"
                ? "Rewards have been paid out to top finishers."
                : "Updated live as students submit across campus."
            }
            icon={Trophy}
            back={`/arena/${id}`}
          />

          {myEntry?.status === "submitted" && (
            <Card className="mt-5 p-5 border-amber-300 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-card dark:to-card shadow-xs">
              <div className="flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-400 font-extrabold">
                  Your Official Result
                </div>
                {myReward > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold">
                    <Coins className="w-3.5 h-3.5" /> +{myReward} Tokens Won
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-end justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-display font-extrabold text-foreground">
                    {myEntry.score} / {ch?.num_questions ?? 10} Correct
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Accuracy {myEntry.accuracy}% · Completed in{" "}
                    {Math.floor(myEntry.time_taken_seconds / 60)}m {myEntry.time_taken_seconds % 60}s
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <GrowthShareCard
                  variant="win"
                  eyebrow={ch?.title ?? "Arena"}
                  title={`I scored ${myEntry.score}/${ch?.num_questions ?? 10} on ${ch?.title ?? "the Arena"}`}
                  bigStat={`${myEntry.accuracy}%`}
                  subtitle={`${myEntry.score} correct · ${Math.floor(myEntry.time_taken_seconds / 60)}m ${myEntry.time_taken_seconds % 60}s`}
                  handle={user?.user_metadata?.full_name as string | undefined}
                  shareUrl={`https://overraprepai.com/arena/${id}`}
                  label="Share My Result"
                />
                {reviewItems.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReview((s) => !s)}
                    className="rounded-full text-xs font-bold border-amber-300"
                  >
                    {showReview ? (
                      <>
                        Hide Question Review <ChevronUp className="w-3.5 h-3.5 ml-1" />
                      </>
                    ) : (
                      <>
                        Review Answers ({reviewItems.length}){" "}
                        <ChevronDown className="w-3.5 h-3.5 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Detailed Question-by-Question Answer Review */}
          {myEntry?.status === "submitted" && showReview && reviewItems.length > 0 && (
            <div className="mt-5 space-y-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
                Answer Review & Explanations
              </h2>
              {reviewItems.map((item) => {
                const optionText = (opt: string) =>
                  (item as any)[`option_${opt.toLowerCase()}`] as string;
                return (
                  <Card
                    key={item.question_id}
                    className={cn(
                      "p-4 border",
                      item.is_correct
                        ? "border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-500/30"
                        : "border-rose-200/80 bg-rose-50/20 dark:border-rose-500/30"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        Question {item.ord}
                      </span>
                      {item.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 dark:text-rose-400">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground mt-1.5 leading-snug">
                      {item.question_text}
                    </p>
                    <div className="mt-2.5 space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Your Answer: </span>
                        <span
                          className={cn(
                            "font-bold",
                            item.is_correct
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-rose-700 dark:text-rose-400"
                          )}
                        >
                          {item.selected
                            ? `${item.selected} — ${optionText(item.selected)}`
                            : "Not answered"}
                        </span>
                      </div>
                      {!item.is_correct && (
                        <div>
                          <span className="text-muted-foreground">Correct Answer: </span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {item.correct_option} — {optionText(item.correct_option)}
                          </span>
                        </div>
                      )}
                    </div>
                    {item.explanation && (
                      <div className="mt-2.5 pt-2 border-t border-border/60 text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Explanation: </strong>
                        {item.explanation}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Standings List */}
          <div className="mt-6 space-y-2">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
              Campus Standings
            </h2>
            {isLoading && (
              <Card className="p-6 animate-pulse text-sm text-muted-foreground">Loading…</Card>
            )}
            {!isLoading && board.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
                No submissions yet.
              </Card>
            )}
            {board.map((row) => {
              const reward = rewardByUser.get(row.user_id);
              const isMe = myUid === row.user_id;
              return (
                <Card
                  key={row.user_id}
                  className={cn(
                    "p-3.5 flex items-center gap-3 border transition",
                    isMe
                      ? "border-amber-400 bg-amber-50/60 dark:bg-amber-500/10 shadow-xs"
                      : "border-border/80"
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
                      <span className="text-sm font-extrabold text-muted-foreground">
                        #{row.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">
                      {row.full_name ?? "Student"}{" "}
                      {isMe && <span className="text-amber-700 font-bold">(You)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.score} correct · {row.accuracy}% ·{" "}
                      {Math.floor(row.time_taken_seconds / 60)}m {row.time_taken_seconds % 60}s
                    </div>
                  </div>
                  {reward ? (
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">
                        Won
                      </div>
                      <div className="text-sm font-extrabold text-amber-700">+{reward}</div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => navigate("/arena")}
              className="w-full sm:w-auto rounded-xl font-semibold"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> All Arena Challenges
            </Button>
            <Button
              onClick={() => navigate("/student/dashboard")}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl"
            >
              <Home className="w-4 h-4 mr-1.5" /> Student Dashboard
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
