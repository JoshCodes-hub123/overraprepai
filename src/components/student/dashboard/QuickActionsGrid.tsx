import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Layers, Target, Headphones, Sparkles, Bookmark, Crown, Wallet, Gift, FileDown, type LucideIcon } from "lucide-react";

interface Tile {
  icon: LucideIcon;
  label: string;
  to: string;
}

const TILES: Tile[] = [
  { icon: Layers,     label: "Flashcards",    to: "/flashcards" },
  { icon: Target,     label: "Practice Quiz", to: "/student/readiness" },
  { icon: Headphones, label: "Audio Reader",  to: "/audio-learning" },
  { icon: FileDown,   label: "Smart Summary", to: "/student/smart-summary" },
  { icon: Sparkles,   label: "Ask AI",        to: "/ai-tutor" },
  { icon: Bookmark,   label: "My Library",    to: "/library" },
  { icon: Crown,      label: "Premium",       to: "/subscription" },
  { icon: Wallet,     label: "Wallet",        to: "/wallet" },
  { icon: Gift,       label: "Referrals",     to: "/referrals" },
];

/**
 * Quick actions — 5 calm rounded tiles. Mobile: 2-col grid (last tile spans full width).
 * Desktop: single row of 5. Soft surfaces, gold accent dot only.
 */
export const QuickActionsGrid = () => {
  const navigate = useNavigate();

  return (
    <section aria-label="Quick actions" className="mb-7">
      <h2 className="font-display text-[15px] sm:text-base font-bold tracking-tight text-foreground mb-3 px-0.5">
        Quick actions
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {TILES.map((t, i) => {
          const Icon = t.icon;
          const isLastOnMobile = false;
          return (
            <motion.button
              key={t.label}
              type="button"
              onClick={() => navigate(t.to)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.97 }}
              className={[
                "group relative flex flex-col items-start gap-2.5 rounded-2xl border border-amber-100/70 bg-card",
                "p-4 min-h-[88px] text-left",
                "shadow-[0_1px_2px_rgba(180,140,40,0.04)] hover:border-amber-200 hover:shadow-[0_6px_18px_-10px_rgba(180,140,40,0.25)] transition-all",
                isLastOnMobile ? "col-span-2 md:col-span-1" : "",
              ].join(" ")}
              aria-label={t.label}
            >
              <span className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Icon className="h-5 w-5 text-amber-700" strokeWidth={2} />
              </span>
              <span className="font-display text-[14px] font-bold text-foreground leading-tight">
                {t.label}
              </span>
              <span className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActionsGrid;