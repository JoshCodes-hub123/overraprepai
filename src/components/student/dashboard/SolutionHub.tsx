import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, FileText, Sparkles, ArrowRight } from "lucide-react";

/**
 * The dashboard hero: "What do you want to do?" — promotes our 3 highest-value
 * solution features so a brand-new student immediately knows where to act.
 */
const TILES = [
  {
    to: "/courses",
    title: "Take a Quiz",
    blurb: "Practice past questions with instant AI explanations.",
    icon: ClipboardList,
    primary: true,
  },
  {
    to: "/library",
    title: "Summarize a Document",
    blurb: "Upload notes or a PDF — get the key points in seconds.",
    icon: FileText,
    primary: false,
  },
  {
    to: "/ai-tutor",
    title: "Ask AI Tutor",
    blurb: "Stuck on a topic? Get a step-by-step walkthrough.",
    icon: Sparkles,
    primary: false,
  },
];

export const SolutionHub = () => {
  return (
    <section aria-label="What do you want to do?" className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="h-3 w-0.5 rounded-full bg-amber-500" />
        <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
          What do you want to do?
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {TILES.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <motion.div
              key={tile.to}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={tile.to}
                className={
                  tile.primary
                    ? "block h-full rounded-2xl p-4 bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md hover:shadow-lg transition-all"
                    : "block h-full rounded-2xl p-4 bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all"
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={
                      tile.primary
                        ? "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white"
                        : "inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
                    }
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </span>
                  <ArrowRight
                    className={
                      tile.primary
                        ? "w-4 h-4 text-white/80"
                        : "w-4 h-4 text-amber-600 opacity-70"
                    }
                  />
                </div>
                <p
                  className={
                    tile.primary
                      ? "font-display font-bold text-[15px] text-white"
                      : "font-display font-bold text-[15px] text-neutral-900"
                  }
                >
                  {tile.title}
                </p>
                <p
                  className={
                    tile.primary
                      ? "text-[11.5px] text-white/90 mt-0.5 leading-snug"
                      : "text-[11.5px] text-neutral-500 mt-0.5 leading-snug"
                  }
                >
                  {tile.blurb}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default SolutionHub;
