import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  level: string;
  count: number;
  active?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function LevelSection({ level, count, active, defaultOpen, children }: Props) {
  const [open, setOpen] = useState(defaultOpen ?? !!active);
  if (count === 0) return null;
  const label = /^\d+$/.test(level) ? `${level} Level` : level;

  return (
    <section className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 py-2.5 px-3 rounded-xl text-left transition ${
          active ? "bg-amber-50 border border-amber-200" : "hover:bg-amber-50/40"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="w-4 h-4 text-amber-700 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />
          )}
          <h3 className="font-display font-bold text-[14px] tracking-tight truncate">
            {label}
          </h3>
          {active && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-white border border-amber-200 px-1.5 py-0.5 rounded-md">
              Your level
            </span>
          )}
        </div>
        <span className="text-[11.5px] font-bold text-neutral-500 shrink-0">{count}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LevelSection;
