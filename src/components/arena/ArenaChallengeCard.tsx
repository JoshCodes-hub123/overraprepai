import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Clock, Users, Coins, Sparkles } from "lucide-react";
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
        ? "Settled"
        : "Ended";

  return (
    <Link to={`/arena/${challenge.id}`} className="block group">
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }}>
        <Card
          className={cn(
            "relative overflow-hidden border-amber-200/70 bg-gradient-to-br from-white via-white to-amber-50/40 transition-all",
            featured && "border-amber-400/70 shadow-lg shadow-amber-200/50",
          )}
        >
          {featured && (
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
          )}
          <div className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "uppercase text-[10px] font-bold tracking-wider border-amber-300 text-amber-800 bg-amber-50",
                  )}
                >
                  {challenge.kind === "weekly" ? "Weekly" : "Daily"}
                </Badge>
                {featured && (
                  <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white border-0 text-[10px] uppercase tracking-wider gap-1">
                    <Sparkles className="h-3 w-3" /> Featured
                  </Badge>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-[11px] font-semibold",
                    isLive
                      ? "text-emerald-700"
                      : isScheduled
                        ? "text-amber-700"
                        : "text-neutral-500",
                  )}
                >
                  {isLive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                  )}
                  {statusLabel}
                </span>
              </div>
              <div className="shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                <Trophy className="h-4 w-4" />
              </div>
            </div>

            <h3 className="font-display text-base sm:text-lg font-extrabold text-neutral-900 leading-tight">
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="text-[12.5px] text-neutral-600 mt-1 line-clamp-2 leading-snug">
                {challenge.description}
              </p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat icon={<Coins className="h-3.5 w-3.5" />} label="Prize" value={`${challenge.prize_pool_tokens}`} accent />
              <Stat icon={<Users className="h-3.5 w-3.5" />} label="Entry" value={`${challenge.entry_token_cost}`} />
              <Stat icon={<Clock className="h-3.5 w-3.5" />} label="Limit" value={`${Math.round(challenge.time_limit_seconds / 60)}m`} />
            </div>

            <div className="mt-3 text-[11.5px] text-neutral-500">
              {challenge.num_questions} questions {isEnded ? "· View results →" : "· Tap to view →"}
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
        accent ? "border-amber-200 bg-amber-50/60" : "border-neutral-200/80 bg-white",
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
        {icon}
        {label}
      </div>
      <div className={cn("text-sm font-extrabold mt-0.5", accent ? "text-amber-800" : "text-neutral-900")}>
        {value}
      </div>
    </div>
  );
}

export default ArenaChallengeCard;
