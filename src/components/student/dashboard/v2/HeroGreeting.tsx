import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Target, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProfileStats } from "@/hooks/useProfileStats";
import ambA from "@/assets/dashboard/ambassador-wave.png";
import ambB from "@/assets/dashboard/ambassador-wave-2.png";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const STAT_STYLES = [
  { ring: "from-orange-400 to-amber-500",   icon: "text-white",       bg: "bg-gradient-to-br" },
  { ring: "from-emerald-400 to-teal-500",   icon: "text-white",       bg: "bg-gradient-to-br" },
  { ring: "from-violet-400 to-fuchsia-500", icon: "text-white",       bg: "bg-gradient-to-br" },
];

export function HeroGreeting() {
  const { user, profile } = useAuth();
  const { data: stats } = useProfileStats(user?.id);
  const [streak, setStreak] = useState(0);
  const [readiness, setReadiness] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: s } = await supabase
        .from("study_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setStreak((s as any)?.current_streak ?? 0);

      const { data: r } = await (supabase as any)
        .from("readiness_attempts")
        .select("score_pct")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled) {
        const pct = Array.isArray(r) && r[0]?.score_pct != null ? Math.round(Number(r[0].score_pct)) : null;
        setReadiness(pct);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const first = profile?.full_name?.split(" ")[0] || "Student";
  const heroPoints =
    (stats?.quizzes_taken ?? 0) * 10 +
    (stats?.cards_reviewed ?? 0) * 2 +
    (stats?.current_streak ?? streak) * 5;

  // Pick a consistent ambassador per user (gender-friendly variety)
  const avatar = useMemo(() => {
    const seed = (user?.id || first).charCodeAt(0) || 0;
    return seed % 2 === 0 ? ambA : ambB;
  }, [user?.id, first]);

  const items = [
    { icon: Flame,     value: streak,                       label: "Day Streak" },
    { icon: Target,    value: readiness != null ? `${readiness}%` : "—", label: "Readiness" },
    { icon: Sparkles,  value: heroPoints.toLocaleString(),  label: "Hero Points" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-5 pb-4 shadow-[0_8px_28px_-18px_rgba(217,119,6,0.35)]"
      aria-label="Greeting"
    >
      {/* Decorative ambient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-52 h-52 rounded-full bg-orange-200/40 blur-3xl" />
        <motion.div
          className="absolute top-3 right-24 w-1.5 h-1.5 rounded-full bg-amber-400"
          animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-10 right-14 w-1 h-1 rounded-full bg-orange-400"
          animate={{ y: [0, -8, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
      </div>

      <div className="relative flex items-start gap-3">
        {/* Text + greeting */}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-700/80">{greet()}</p>
          <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold leading-tight tracking-tight mt-1">
            Hi,{" "}
            <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              {first}
            </span>
          </h1>
          <p className="text-[13px] text-neutral-600 mt-1 leading-snug max-w-[20rem]">
            Let's move one step closer to academic excellence today.
          </p>
        </div>

        {/* Animated waving ambassador */}
        <motion.div
          className="relative shrink-0 -mt-2 -mr-1"
          initial={{ opacity: 0, scale: 0.85, x: 10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative w-20 h-20 sm:w-24 sm:h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-200/70 to-orange-200/40 blur-xl" />
            <motion.img
              src={avatar}
              alt={`${first}, waving hello`}
              width={192}
              height={192}
              loading="lazy"
              className="relative w-full h-full object-contain drop-shadow-[0_6px_14px_rgba(217,119,6,0.25)]"
              style={{ transformOrigin: "70% 80%" }}
              animate={{ rotate: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2.6, ease: "easeInOut" }}
            />
            {/* Sparkle */}
            <motion.span
              aria-hidden
              className="absolute -top-1 -left-1 text-amber-500"
              animate={{ scale: [0.6, 1.1, 0.6], rotate: [0, 20, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.span>
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="relative mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white/85 backdrop-blur-sm border border-amber-100/80 p-3 shadow-[0_2px_8px_-4px_rgba(217,119,6,0.18)]">
        {items.map(({ icon: Icon, value, label }, i) => {
          const s = STAT_STYLES[i];
          return (
            <motion.div
              key={label}
              whileHover={{ y: -2 }}
              className="flex flex-col items-center text-center px-1"
            >
              <span className={`h-8 w-8 rounded-xl inline-flex items-center justify-center mb-1.5 shadow-md shadow-amber-500/10 ${s.bg} ${s.ring}`}>
                <Icon className={`w-4 h-4 ${s.icon}`} strokeWidth={2.4} />
              </span>
              <span className="font-display text-[16px] font-extrabold leading-none tracking-tight text-neutral-900">
                {value}
              </span>
              <span className="text-[10px] mt-1 text-neutral-500 leading-tight font-medium">{label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

export default HeroGreeting;
