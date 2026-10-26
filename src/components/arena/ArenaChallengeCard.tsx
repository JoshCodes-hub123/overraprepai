import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Clock, Coins, Sparkles, Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ArenaChallenge } from "@/hooks/useArena";

function formatCountdown(toIso: string) {
  const diff = new Date(toIso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function ArenaChallengeCard({
  challenge,
  featured = false,
}: {
  challenge: ArenaChallenge;
  featured?: boolean;
}) {
  const isLive = challenge.status === "live";
  const isScheduled = challenge.status === "scheduled";
  const isEnded = challenge.status === "ended" || challenge.status === "settled";

  const statusLabel = isLive
    ? `Live · ends in ${formatCountdown(challenge.ends_at)}`
    : isScheduled
      ? `Starts in ${formatCountdown(challenge.starts_at)}`
      : challenge.status === "settled"
        ? "Completed"
        : "Ended";

  const entryLabel =
    challenge.entry_token_cost === 0
      ? "Free Entry"
      : `1 Ticket or ${challenge.entry_token_cost} Token`;

  return (
    <Link to={`/arena/${challenge.id}`} className="block group">
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
        <Card
          className={cn(
            "relative overflow-hidden border-amber-200/80 dark:border-border bg-card transition-all",
            featured && "border-amber-400 shadow-md shadow-amber-500/10"
          )}
        >
          {/* Optional Photographic Banner */}
          {challenge.cover_image_url && (
            <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-neutral-900">
              <img
                src={challenge.cover_image_url}
                alt={challenge.title}
                className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
              <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className="uppercase text-[10px] font-bold tracking-wider border-white/20 text-amber-300 bg-black/60 backdrop-blur-md"
                  >
                    {challenge.kind === "weekly" ? "Weekly Grand Prix" : "Daily Sprint"}
                  </Badge>
                  {featured && (
                    <Badge className="bg-amber-500 text-slate-950 border-0 text-[10px] font-bold uppercase tracking-wider gap-1">
                      <Sparkles className="h-3 w-3" /> Featured
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md",
                    isLive
                      ? "bg-emerald-500/90 text-white"
                      : isScheduled
                        ? "bg-amber-500/90 text-slate-950"
                        : "bg-black/60 text-white/90"
                  )}
                >
                  {isLive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                  )}
                  {statusLabel}
                </span>
              </div>
            </div>
          )}

          <div className="p-4 sm:p-5">
            {!challenge.cover_image_url && (
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="uppercase text-[10px] font-bold tracking-wider border-amber-300 text-amber-800 bg-amber-50"
                  >
                    {challenge.kind === "weekly" ? "Weekly" : "Daily"}
                  </Badge>
                  <span className="text-[11px] font-semibold text-emerald-700">{statusLabel}</span>
                </div>
                <div className="shrink-0 h-9 w-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <Trophy className="h-4 w-4" />
                </div>
              </div>
            )}

            <h3 className="font-display text-base sm:text-lg font-extrabold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors leading-snug">
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="text-[12.5px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {challenge.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat
                icon={<Coins className="h-3.5 w-3.5 text-amber-600" />}
                label="Prize Pool"
                value={`${challenge.prize_pool_tokens} Tokens`}
                accent
              />
              <Stat
                icon={<Ticket className="h-3.5 w-3.5 text-amber-600" />}
                label="Entry"
                value={entryLabel}
              />
              <Stat
                icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                label="Format"
                value={`${challenge.num_questions} Qs · ${Math.round(challenge.time_limit_seconds / 60)}m`}
              />
            </div>

            <div className="mt-3.5 flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span>
                {isEnded
                  ? "View Final Standings & Review"
                  : isScheduled
                    ? "Preview Challenge Details"
                    : "Enter Challenge Arena"}
              </span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}

function Stat({
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
      className={cn(
        "rounded-xl border px-2.5 py-2",
        accent
          ? "border-amber-200 bg-amber-50/60 dark:bg-amber-500/10 dark:border-amber-500/30"
          : "border-border/80 bg-background"
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          "text-xs sm:text-sm font-extrabold mt-0.5 truncate",
          accent ? "text-amber-800 dark:text-amber-300" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export default ArenaChallengeCard;
