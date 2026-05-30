import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Plus, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { resolveAvatarUrl, initialsFor } from "@/lib/avatar";

const NAIRA_PER_TOKEN = 50;

/**
 * Hero token-balance card pinned to the very top of the student dashboard.
 * Shows the live wallet balance with the user's profile picture, NGN value,
 * and a top-up CTA. Designed to be unmistakable.
 */
export function TokenBalanceCard() {
  const { profile } = useAuth();
  const { balance, isLoading, isLowBalance } = usePremium();

  const empty = !isLoading && balance <= 0;
  const naira = balance * NAIRA_PER_TOKEN;
  const firstName = profile?.full_name?.split(" ")[0] || "Friend";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-4 overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-100/60 p-4 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.35)]"
      aria-label={`Wallet balance: ${balance} tokens`}
    >
      {/* Decorative gold blobs */}
      <div className="pointer-events-none absolute -top-12 -right-10 h-36 w-36 rounded-full bg-amber-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-amber-200/50 blur-3xl" />

      <div className="relative flex items-center gap-3">
        {/* Profile picture with gold ring + token badge */}
        <Link
          to="/profile/edit"
          aria-label="Edit profile"
          className="relative shrink-0"
        >
          <div className="rounded-full p-[2.5px] bg-gradient-to-br from-amber-400 via-amber-500 to-amber-300 shadow-md">
            <Avatar className="h-14 w-14 ring-2 ring-white">
              <AvatarImage src={resolveAvatarUrl(profile)} alt={profile?.full_name || "Profile"} />
              <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 font-bold">
                {initialsFor(profile?.full_name, firstName.charAt(0).toUpperCase())}
              </AvatarFallback>
            </Avatar>
          </div>
          <span className="absolute -bottom-1 -right-1 inline-flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-[2px] text-[9px] font-extrabold uppercase tracking-wider text-white shadow ring-2 ring-white">
            <Zap className="h-2.5 w-2.5 fill-white" /> {isLoading ? "…" : balance}
          </span>
        </Link>

        {/* Balance details */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700/90">
            My tokens
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <motion.span
              key={balance}
              initial={{ opacity: 0.4, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="font-display text-[30px] font-extrabold leading-none text-amber-900 tabular-nums"
            >
              {isLoading ? "—" : balance.toLocaleString()}
            </motion.span>
            <span className="text-xs font-bold text-amber-700">tokens</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-800/90">
            ≈ ₦{naira.toLocaleString()} · 1 token = 1 AI action
          </p>
        </div>

        {/* Top-up CTA */}
        <Link
          to="/wallet"
          className={`shrink-0 inline-flex items-center gap-1 h-10 px-3.5 rounded-full text-[12px] font-bold text-white shadow-lg shadow-amber-600/30 transition-transform active:scale-95 ${
            empty
              ? "bg-gradient-to-r from-rose-500 to-amber-500"
              : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Top up
        </Link>
      </div>

      {/* Status hint */}
      {!isLoading && (
        <div className="relative mt-3 flex items-center gap-1.5 text-[11px] font-semibold">
          {empty ? (
            <span className="text-rose-700">
              Wallet empty — top up from ₦250 (5 tokens) to keep learning with AI.
            </span>
          ) : isLowBalance ? (
            <span className="text-amber-800 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Running low — top up to avoid interruptions.
            </span>
          ) : (
            <span className="text-amber-800/80 inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Tokens deduct automatically as you use AI.
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default TokenBalanceCard;
