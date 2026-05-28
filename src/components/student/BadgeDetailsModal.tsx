import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Crown, Medal, Award, Star, Sparkles, type LucideIcon } from "lucide-react";

interface TierInfo {
  tier: string;
  label: string;
  Icon: LucideIcon;
  className: string;
  range: string;
  blurb: string;
}

const TIERS: TierInfo[] = [
  {
    tier: "diamond", label: "Diamond", Icon: Crown,
    className: "bg-gradient-to-r from-amber-400 to-amber-600 text-white border-amber-500/40",
    range: "Top 10 students",
    blurb: "The platform elite — earned by combining a near-perfect quiz accuracy with a long streak and consistent AI/chat activity.",
  },
  {
    tier: "gold", label: "Gold", Icon: Medal,
    className: "bg-amber-50 text-amber-800 border-amber-200",
    range: "Score ≥ 70 or rank ≤ 50",
    blurb: "Strong, regular learner. Keep your accuracy above 80%, review flashcards daily, and don't break your streak.",
  },
  {
    tier: "silver", label: "Silver", Icon: Award,
    className: "bg-zinc-50 text-zinc-700 border-zinc-200",
    range: "Score ≥ 40",
    blurb: "Building serious momentum. Take a few quizzes a week and clear your due flashcards to reach Gold.",
  },
  {
    tier: "bronze", label: "Bronze", Icon: Star,
    className: "bg-orange-50 text-orange-800 border-orange-200",
    range: "Score ≥ 15",
    blurb: "You've started showing up. Hit a 7-day streak and finish your first full quiz to climb to Silver.",
  },
  {
    tier: "newcomer", label: "Newcomer", Icon: Sparkles,
    className: "bg-muted text-muted-foreground border-border",
    range: "Score < 15",
    blurb: "Welcome! Complete one quiz or flashcard session and you'll appear on the leaderboard.",
  },
];

const SCORING = [
  { label: "Quiz accuracy", weight: "40%", hint: "Take quizzes and aim for high accuracy." },
  { label: "Flashcards reviewed", weight: "20%", hint: "Up to 200 reviewed cards in the window count." },
  { label: "Streak days", weight: "15%", hint: "Up to 60 consecutive days." },
  { label: "AI generations", weight: "15%", hint: "Generated summaries, quizzes, plans." },
  { label: "Chat & community", weight: "10%", hint: "Active discussion in course chats." },
];

export function BadgeDetailsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">How activity badges work</DialogTitle>
          <DialogDescription>
            Your badge reflects how active you've been on OverraPrep over the last 30 days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {TIERS.map(({ tier, label, Icon, className, range, blurb }) => (
            <div key={tier} className="flex gap-3 p-3 rounded-xl border border-border bg-card">
              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border ${className}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{label}</p>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{range}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{blurb}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <p className="font-semibold text-sm mb-2">What raises your rank</p>
          <ul className="space-y-1.5">
            {SCORING.map((s) => (
              <li key={s.label} className="flex items-start gap-2 text-xs">
                <span className="font-bold tabular-nums text-amber-700 w-9 shrink-0">{s.weight}</span>
                <span className="text-foreground"><span className="font-medium">{s.label}.</span>{" "}
                  <span className="text-muted-foreground">{s.hint}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BadgeDetailsModal;
