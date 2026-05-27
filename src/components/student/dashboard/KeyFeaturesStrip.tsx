import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sparkles, Library, PenLine, ArrowRight, type LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  tagline: string;
  to: string;
}

const FEATURES: Feature[] = [
  { icon: Sparkles, title: "Overra AI",   tagline: "Deep Intelligence. Instant Clarity.", to: "/ai-tutor" },
  { icon: Library,  title: "Study Hub",   tagline: "Past Questions, Decoded.",            to: "/study-hub" },
  { icon: PenLine,  title: "Theory Prep", tagline: "Write. Get AI-Graded. Improve.",      to: "/theory" },
];

/**
 * KeyFeaturesStrip — high-visibility spotlight for the platform's three
 * flagship student tools. Horizontal scroll on mobile, 3-col grid from sm:.
 */
export const KeyFeaturesStrip = () => {
  const navigate = useNavigate();

  return (
    <section aria-label="Key features" className="mb-6">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 rounded-full bg-amber-500" />
          <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
            Built for breakthroughs
          </h2>
        </div>
      </div>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
        <div className="flex gap-3 sm:grid sm:grid-cols-3 min-w-max sm:min-w-0">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.title}
                type="button"
                onClick={() => navigate(f.to)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.98 }}
                className="group relative w-[78vw] max-w-[280px] sm:w-auto sm:max-w-none text-left rounded-2xl border border-amber-100 bg-gradient-to-br from-white via-white to-amber-50/40 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-amber-300 hover:shadow-[0_12px_28px_-14px_rgba(180,140,40,0.45)] hover:-translate-y-0.5 transition-all overflow-hidden"
                aria-label={`${f.title} — ${f.tagline}`}
              >
                <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-gradient-to-b from-amber-400 to-amber-600" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="font-display text-[15px] font-bold text-neutral-900 leading-tight mb-1">
                  {f.title}
                </h3>
                <p className="text-[12px] text-neutral-500 leading-snug">{f.tagline}</p>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default KeyFeaturesStrip;