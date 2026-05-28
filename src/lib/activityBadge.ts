import { Crown, Medal, Award, Star, Sparkles, type LucideIcon } from "lucide-react";

export type ActivityTier = "newcomer" | "bronze" | "silver" | "gold" | "diamond";

export interface ActivityBadge {
  tier: ActivityTier;
  label: string;
  /** Tailwind classes for the chip background + text. White + gold palette only. */
  className: string;
  Icon: LucideIcon;
}

/**
 * Map a leaderboard score (0–100) into a visible activity tier.
 * Keep this pure so header + leaderboard never drift.
 */
export function getActivityBadge(score: number, rank?: number): ActivityBadge {
  if (rank && rank > 0 && rank <= 10) {
    return {
      tier: "diamond",
      label: "Diamond",
      className: "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-amber-500/40",
      Icon: Crown,
    };
  }
  if (score >= 70 || (rank && rank <= 50)) {
    return {
      tier: "gold",
      label: "Gold",
      className: "bg-amber-50 text-amber-800 border-amber-200",
      Icon: Medal,
    };
  }
  if (score >= 40) {
    return {
      tier: "silver",
      label: "Silver",
      className: "bg-zinc-50 text-zinc-700 border-zinc-200",
      Icon: Award,
    };
  }
  if (score >= 15) {
    return {
      tier: "bronze",
      label: "Bronze",
      className: "bg-orange-50 text-orange-800 border-orange-200",
      Icon: Star,
    };
  }
  return {
    tier: "newcomer",
    label: "Newcomer",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Sparkles,
  };
}
