import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Layers, Target, Headphones, Sparkles, Bookmark, Crown, Wallet, Gift, FileDown, MoreHorizontal, Rocket, Library, PenLine, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

interface Tile {
  icon: LucideIcon;
  label: string;
  to: string;
  hint?: string;
}

// Path-aware "Quick Start" — recommends free quizzes based on saved track.
function quickStartTile(path: string | null | undefined): Tile {
  if (path === "secondary" || path === "jamb") {
    return { icon: Rocket, label: "Quick Start", to: "/subjects", hint: "Free quizzes for you" };
  }
  if (path === "university") {
    return { icon: Rocket, label: "Quick Start", to: "/courses", hint: "Free quizzes for you" };
  }
  return { icon: Rocket, label: "Quick Start", to: "/profile/preparation", hint: "Pick your track" };
}

const BASE_PRIMARY: Tile[] = [
  { icon: Target,     label: "Practice",      to: "/student/readiness", hint: "Test yourself" },
  { icon: Sparkles,   label: "Overra AI",     to: "/ai-tutor",          hint: "Deep Intelligence. Instant Clarity." },
  { icon: Library,    label: "Study Hub",     to: "/study-hub",         hint: "Past questions, decoded" },
  { icon: PenLine,    label: "Theory Prep",   to: "/theory",            hint: "AI-graded answers" },
  { icon: Layers,     label: "Flashcards",    to: "/flashcards",        hint: "Quick review" },
  { icon: Headphones, label: "Listen",        to: "/audio-learning",    hint: "Audio notes" },
  { icon: FileDown,   label: "Summary",       to: "/student/smart-summary", hint: "TL;DR" },
];

const MORE: Tile[] = [
  { icon: Crown,  label: "Premium",   to: "/subscription", hint: "Unlock more" },
  { icon: Wallet, label: "Wallet",    to: "/wallet",       hint: "Your tokens" },
  { icon: Gift,   label: "Referrals", to: "/referrals",    hint: "Earn rewards" },
];

const Tile = ({ tile, index, onClick }: { tile: Tile; index: number; onClick: () => void }) => {
  const Icon = tile.icon;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.96 }}
      className="group relative flex flex-col items-start gap-2.5 rounded-2xl border border-neutral-100 bg-white p-4 min-h-[104px] text-left shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-amber-200 hover:shadow-[0_8px_22px_-12px_rgba(180,140,40,0.35)] hover:-translate-y-0.5 transition-all"
      aria-label={tile.label}
    >
      <span className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <Icon className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
      </span>
      <span className="font-display text-[13.5px] font-bold text-neutral-800 leading-tight">
        {tile.label}
      </span>
      {tile.hint && (
        <span className="text-[11px] text-neutral-400 leading-tight">{tile.hint}</span>
      )}
    </motion.button>
  );
};

/**
 * Quick actions — 6 essential tiles + a "More" sheet for secondary actions.
 * Mobile-first 2-col grid, 3-col on tablet, 4-col on desktop. Larger touch targets,
 * plain-English labels with a one-line hint so students know what each does.
 */
export const QuickActionsGrid = () => {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile } = useAuth();
  const PRIMARY = useMemo<Tile[]>(
    () => [quickStartTile((profile as any)?.academic_path), ...BASE_PRIMARY],
    [profile]
  );

  return (
    <section aria-label="Quick actions" className="mb-7">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 rounded-full bg-amber-500" />
          <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
            Quick actions
          </h2>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
        {PRIMARY.map((t, i) => (
          <Tile key={t.label} tile={t} index={i} onClick={() => navigate(t.to)} />
        ))}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: PRIMARY.length * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-start gap-2.5 rounded-2xl border border-dashed border-amber-200 bg-amber-50/30 p-4 min-h-[104px] text-left hover:bg-amber-50 hover:border-amber-300 transition-all"
              aria-label="More actions"
            >
              <span className="h-10 w-10 rounded-xl bg-white border border-amber-100 flex items-center justify-center">
                <MoreHorizontal className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
              </span>
              <span className="font-display text-[13.5px] font-bold text-neutral-800 leading-tight">More</span>
              <span className="text-[11px] text-neutral-400 leading-tight">Wallet, premium…</span>
            </motion.button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl border-amber-100">
            <SheetHeader>
              <SheetTitle className="font-display text-left">More actions</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {MORE.map((t, i) => (
                <Tile
                  key={t.label}
                  tile={t}
                  index={i}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(t.to);
                  }}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
};

export default QuickActionsGrid;