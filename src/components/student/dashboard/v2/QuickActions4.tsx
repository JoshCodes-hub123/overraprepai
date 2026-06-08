import { Link } from "react-router-dom";
import { BookOpen, PenSquare, Headphones, Bot } from "lucide-react";

const ACTIONS = [
  { label: "Study",    to: "/study",    icon: BookOpen,   tint: "bg-amber-100 text-amber-700" },
  { label: "Practice", to: "/practice", icon: PenSquare,  tint: "bg-emerald-100 text-emerald-700" },
  { label: "Audio",    to: "/audio",    icon: Headphones, tint: "bg-violet-100 text-violet-700" },
  { label: "Ask AI",   to: "/ai-tutor", icon: Bot,        tint: "bg-sky-100 text-sky-700" },
];

export function QuickActions4() {
  return (
    <section aria-labelledby="quick-actions-label">
      <h2 id="quick-actions-label" className="font-display text-[15px] font-bold tracking-tight mb-3 px-0.5">
        Quick Actions
      </h2>
      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-amber-100 bg-white p-3">
        {ACTIONS.map(({ label, to, icon: Icon, tint }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2 py-2 rounded-xl hover:bg-amber-50/50 transition active:scale-[0.97]"
          >
            <span className={`h-11 w-11 rounded-xl inline-flex items-center justify-center ${tint}`}>
              <Icon className="w-5 h-5" />
            </span>
            <span className="text-[11.5px] font-semibold text-neutral-700">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default QuickActions4;
