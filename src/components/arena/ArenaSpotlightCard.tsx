import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Coins, Clock, ArrowRight } from "lucide-react";
import { useFeaturedArenaChallenge } from "@/hooks/useArena";

function fmt(toIso: string) {
  const diff = new Date(toIso).getTime() - Date.now();
  if (diff <= 0) return "Now";
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function ArenaSpotlightCard() {
  const { data: ch, isLoading } = useFeaturedArenaChallenge();

  if (isLoading || !ch) return null;

  const isLive = ch.status === "live";

  return (
    <Link to={`/arena/${ch.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        className="relative overflow-hidden rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/40 shadow-md shadow-amber-100/60"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/40 to-amber-500/10 blur-2xl"
        />
        <div className="relative p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/85 border border-amber-200">
              <Trophy className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
                Challenge Arena
              </span>
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </span>
                Live · ends in {fmt(ch.ends_at)}
              </span>
            )}
            {!isLive && (
              <span className="text-[11px] font-semibold text-amber-700">
                Starts in {fmt(ch.starts_at)}
              </span>
            )}
          </div>

          <h3 className="font-display text-lg sm:text-xl font-extrabold text-neutral-900 leading-tight">
            {ch.title}
          </h3>
          {ch.description && (
            <p className="text-[12.5px] text-neutral-600 mt-1 line-clamp-2 leading-snug">
              {ch.description}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[12px] font-semibold text-neutral-700">
              <span className="inline-flex items-center gap-1 text-amber-800">
                <Coins className="h-3.5 w-3.5" />
                {ch.prize_pool_tokens} prize
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {Math.round(ch.time_limit_seconds / 60)}m
              </span>
              <span className="text-neutral-500">{ch.num_questions} Qs</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-800">
              View <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default ArenaSpotlightCard;
