import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Layers, Target, Headphones, Sparkles, Bookmark, Crown, Wallet, Gift, FileDown, MoreHorizontal, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Tile {
  icon: LucideIcon;
  label: string;
  to: string;
  hint?: string;
}

const PRIMARY: Tile[] = [
  { icon: Target,     label: "Practice",      to: "/student/readiness", hint: "Test yourself" },
  { icon: Layers,     label: "Flashcards",    to: "/flashcards",        hint: "Quick review" },
  { icon: Sparkles,   label: "Ask AI",        to: "/ai-tutor",          hint: "Get help" },
  { icon: Headphones, label: "Listen",        to: "/audio-learning",    hint: "Audio notes" },
  { icon: FileDown,   label: "Summary",       to: "/student/smart-summary", hint: "TL;DR" },
  { icon: Bookmark,   label: "Library",       to: "/library",           hint: "Saved" },
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
      className="group relative flex flex-col items-start gap-2 rounded-2xl border border-amber-100/70 bg-card p-3.5 min-h-[100px] text-left shadow-[0_1px_2px_rgba(180,140,40,0.04)] hover:border-amber-200 hover:shadow-[0_6px_18px_-10px_rgba(180,140,40,0.25)] transition-all"
      aria-label={tile.label}
    >
      <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-100 flex items-center justify-center">
        <Icon className="h-[22px] w-[22px] text-amber-700" strokeWidth={2.2} />
      </span>
      <span className="font-display text-[14px] font-bold text-foreground leading-tight">
        {tile.label}
      </span>
      {tile.hint && (
        <span className="text-[11px] text-muted-foreground leading-tight">{tile.hint}</span>
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

  return (
    <section aria-label="Quick actions" className="mb-7">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <h2 className="font-display text-[15px] sm:text-base font-bold tracking-tight text-foreground">
          What would you like to do?
        </h2>
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
              className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-3.5 min-h-[100px] text-left hover:bg-amber-50 transition-all"
              aria-label="More actions"
            >
              <span className="h-11 w-11 rounded-2xl bg-white border border-amber-100 flex items-center justify-center">
                <MoreHorizontal className="h-[22px] w-[22px] text-amber-700" strokeWidth={2.2} />
              </span>
              <span className="font-display text-[14px] font-bold text-foreground leading-tight">More</span>
              <span className="text-[11px] text-muted-foreground leading-tight">Wallet, premium…</span>
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