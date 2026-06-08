import { useMemo } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChallengeIcon } from "@/components/challenges/ChallengeIcon";
import {
  useChallenges,
  useMyEnrollments,
  useMyBadges,
  useEnrollInChallenge,
  useClaimReward,
  type Challenge,
  type Enrollment,
} from "@/hooks/useChallenges";
import { celebrateGold } from "@/lib/celebrate";
import { Sparkles, Coins, ArrowLeft, CheckCircle2, Trophy } from "lucide-react";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";

export default function Challenges() {
  const { data: challenges = [], isLoading } = useChallenges();
  const { data: enrollments = [] } = useMyEnrollments();
  const { data: badges = [] } = useMyBadges();
  const enroll = useEnrollInChallenge();
  const claim = useClaimReward();

  const byChallenge = useMemo(() => {
    const m = new Map<string, Enrollment>();
    for (const e of enrollments) {
      if (e.status !== "expired") m.set(e.challenge_id, e);
    }
    return m;
  }, [enrollments]);

  return (
    <>
      <SEO title="Weekly Challenges" description="Earn badges and tokens by hitting weekly study goals." noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-3xl">
          <Link to="/student/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-3 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>

          <header className="mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-2">
              <Sparkles className="h-3 w-3" /> Weekly challenges
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
              Push yourself this week
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a challenge, hit the goal, claim tokens and a badge. Calm progress, real momentum.
            </p>
          </header>

          {/* My badges */}
          {badges.length > 0 && (
            <Card className="p-4 mb-5 border-amber-100 bg-gradient-to-br from-white to-amber-50/40">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-foreground">Your badges</div>
                <div className="text-xs text-muted-foreground">{badges.length} earned</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((b: any) => (
                  <div
                    key={b.badge_slug}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-amber-200 bg-white text-amber-800 text-[12px] font-semibold shadow-sm"
                    title={b.badge_definitions?.description}
                  >
                    <ChallengeIcon name={b.badge_definitions?.icon} className="h-3.5 w-3.5 text-amber-600" />
                    {b.badge_definitions?.name ?? b.badge_slug}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Challenges grid */}
          <div className="space-y-3">
            {isLoading && (
              <Card className="p-6 animate-pulse text-sm text-muted-foreground">Loading challenges…</Card>
            )}
            {!isLoading && challenges.length === 0 && (
              <Card className="p-6 text-sm text-muted-foreground">No challenges available yet — check back soon.</Card>
            )}
            {challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                enrollment={byChallenge.get(c.id)}
                onEnroll={() => enroll.mutate(c)}
                onClaim={(e) => {
                  claim.mutate(
                    { enrollment: e, challenge: c },
                    {
                      onSuccess: () => celebrateGold("rich"),
                    },
                  );
                }}
                enrolling={enroll.isPending}
                claiming={claim.isPending}
              />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

function ChallengeCard({
  challenge,
  enrollment,
  onEnroll,
  onClaim,
  enrolling,
  claiming,
}: {
  challenge: Challenge;
  enrollment?: Enrollment;
  onEnroll: () => void;
  onClaim: (e: Enrollment) => void;
  enrolling: boolean;
  claiming: boolean;
}) {
  const current = enrollment?.current_value ?? 0;
  const pct = Math.min(100, Math.round((current / challenge.goal_target) * 100));
  const status = enrollment?.status;

  return (
    <Card className="p-4 border-border/70 hover:border-amber-200 transition-colors">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0">
          <ChallengeIcon name={challenge.icon} className="h-5 w-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-[15px] font-bold text-foreground leading-tight">{challenge.title}</h3>
              <p className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">{challenge.description}</p>
            </div>
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-1 text-amber-700 text-[12px] font-bold">
                <Coins className="h-3.5 w-3.5" /> {challenge.reward_tokens}
              </div>
              <div className="text-[10.5px] text-muted-foreground">{challenge.duration_days}-day</div>
            </div>
          </div>

          {enrollment ? (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11.5px] text-muted-foreground mb-1">
                <span>{current} / {challenge.goal_target}</span>
                <span>{pct}%</span>
              </div>
              <Progress value={pct} className="h-1.5" />
              <div className="mt-3 flex items-center gap-2">
                {status === "completed" && (
                  <Button
                    size="sm"
                    onClick={() => onClaim(enrollment)}
                    disabled={claiming}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {claiming ? "Claiming…" : "Claim reward"}
                  </Button>
                )}
                {status === "claimed" && (
                  <div className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700 font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> Claimed
                  </div>
                )}
                {status === "active" && (
                  <div className="text-[11.5px] text-muted-foreground">
                    Ends {new Date(enrollment.ends_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onEnroll}
                disabled={enrolling}
                className="border-amber-200 text-amber-800 hover:bg-amber-50"
              >
                {enrolling ? "Enrolling…" : "Join challenge"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}