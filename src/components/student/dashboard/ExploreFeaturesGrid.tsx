import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen, ClipboardList, Library, Sparkles, Headphones, Layers,
  Trophy, Flame, Users, MessageSquare, GraduationCap, FileText, type LucideIcon,
} from "lucide-react";

interface Item {
  icon: LucideIcon;
  label: string;
  to: string;
  hint: string;
  tone: string;
}

const ITEMS: Item[] = [
  { icon: BookOpen,       label: "My Courses",   to: "/my-courses",         hint: "Your enrolled list",  tone: "from-amber-50 text-amber-700" },
  { icon: ClipboardList,  label: "Quizzes",      to: "/courses",            hint: "By course",           tone: "from-violet-50 text-violet-700" },
  { icon: Library,        label: "Study Hub",    to: "/study-hub",          hint: "Past Qs decoded",     tone: "from-emerald-50 text-emerald-700" },
  { icon: Sparkles,       label: "Overra AI",    to: "/ai-tutor",           hint: "Ask anything",        tone: "from-pink-50 text-pink-700" },
  { icon: Headphones,     label: "Audio",        to: "/audio-learning",     hint: "Listen & learn",      tone: "from-sky-50 text-sky-700" },
  { icon: Layers,         label: "Flashcards",   to: "/flashcards",         hint: "Quick review",        tone: "from-orange-50 text-orange-700" },
  { icon: FileText,       label: "Theory Prep",  to: "/theory",             hint: "AI-graded answers",   tone: "from-rose-50 text-rose-700" },
  { icon: Flame,          label: "Challenges",   to: "/student/challenges", hint: "Daily quests",        tone: "from-red-50 text-red-700" },
  { icon: Trophy,         label: "Leaderboard",  to: "/leaderboard",        hint: "See your rank",       tone: "from-yellow-50 text-yellow-700" },
  { icon: GraduationCap,  label: "Tutors",       to: "/tutors",             hint: "Browse & follow",     tone: "from-teal-50 text-teal-700" },
  { icon: MessageSquare,  label: "Chats",        to: "/chat",               hint: "Threads & DMs",       tone: "from-indigo-50 text-indigo-700" },
  { icon: Users,          label: "Community",    to: "/community",          hint: "Posts & Q&A",         tone: "from-fuchsia-50 text-fuchsia-700" },
];

/**
 * Compact, high-visibility grid of every launch-critical feature.
 * Mobile: 3-col, denser tiles. Larger from sm: with hint copy.
 */
export const ExploreFeaturesGrid = () => {
  return (
    <section aria-label="Explore OverraPrep" className="mb-7">
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 rounded-full bg-amber-500" />
          <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
            Explore OverraPrep
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5">
        {ITEMS.map((it, i) => {
          const Icon = it.icon;
          const [bg, fg] = it.tone.split(" ");
          return (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.25), ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={it.to}
                aria-label={`${it.label} — ${it.hint}`}
                className="group flex flex-col items-center gap-1.5 rounded-2xl border border-neutral-100 bg-white p-3 min-h-[96px] text-center hover:border-amber-200 hover:shadow-[0_8px_22px_-12px_rgba(180,140,40,0.35)] hover:-translate-y-0.5 transition-all"
              >
                <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${bg} to-white flex items-center justify-center group-hover:scale-105 transition`}>
                  <Icon className={`h-5 w-5 ${fg}`} strokeWidth={1.8} />
                </span>
                <span className="font-display text-[12px] font-bold text-neutral-800 leading-tight">{it.label}</span>
                <span className="text-[10px] text-neutral-400 leading-tight hidden sm:block">{it.hint}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ExploreFeaturesGrid;
