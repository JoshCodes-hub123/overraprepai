import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpenText, NotebookPen, Headphones, Sparkles } from "lucide-react";

const ACTIONS = [
  {
    label: "Study",
    to: "/study",
    icon: BookOpenText,
    grad: "from-amber-400 to-orange-500",
    ring: "ring-amber-200/60",
    glow: "shadow-amber-500/30",
  },
  {
    label: "Smart Notes",
    to: "/student/smart-summary",
    icon: NotebookPen,
    grad: "from-emerald-400 to-teal-500",
    ring: "ring-emerald-200/60",
    glow: "shadow-emerald-500/30",
  },
  {
    label: "Audio",
    to: "/audio-learning",
    icon: Headphones,
    grad: "from-violet-400 to-fuchsia-500",
    ring: "ring-violet-200/60",
    glow: "shadow-violet-500/30",
  },
  {
    label: "Ask AI",
    to: "/ai-tutor",
    icon: Sparkles,
    grad: "from-sky-400 to-indigo-500",
    ring: "ring-sky-200/60",
    glow: "shadow-sky-500/30",
  },
];

export function QuickActions4() {
  return (
    <section aria-labelledby="quick-actions-label">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h2 id="quick-actions-label" className="font-display text-[15px] font-bold tracking-tight">
          Quick Actions
        </h2>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-amber-700/70">
          Tap to start
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/30 p-3 shadow-[0_2px_10px_-6px_rgba(217,119,6,0.2)]">
        {ACTIONS.map(({ label, to, icon: Icon, grad, ring, glow }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileTap={{ scale: 0.94 }}
            whileHover={{ y: -3 }}
          >
            <Link
              to={to}
              className="flex flex-col items-center gap-2 py-2 rounded-xl hover:bg-white transition group"
            >
              <span
                className={`relative h-12 w-12 rounded-2xl inline-flex items-center justify-center bg-gradient-to-br ${grad} ring-4 ${ring} shadow-lg ${glow} group-hover:scale-105 transition-transform`}
              >
                <Icon className="w-5 h-5 text-white drop-shadow-sm" strokeWidth={2.2} />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white/80" />
              </span>
              <span className="text-[11.5px] font-semibold text-neutral-700 leading-tight">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default QuickActions4;
