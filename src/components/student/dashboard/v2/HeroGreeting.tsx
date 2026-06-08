import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Target, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useProfileStats } from "@/hooks/useProfileStats";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

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

  const items = [
    { icon: Flame,  value: streak,                       label: "Day Streak" },
    { icon: Target, value: readiness != null ? `${readiness}%` : "—", label: "Readiness" },
    { icon: Star,   value: heroPoints.toLocaleString(),  label: "Hero Points" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-amber-100 bg-gradient-to-br from-white via-amber-50/30 to-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
      aria-label="Greeting"
    >
      <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-700/80">{greet()}</p>
      <h1 className="font-display text-[24px] sm:text-[28px] font-extrabold leading-tight tracking-tight mt-1">
        Hi, <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">{first}</span> <span aria-hidden>👋</span>
      </h1>
      <p className="text-[13.5px] text-neutral-600 mt-1 leading-snug">
        Let's move one step closer to academic excellence today.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-white border border-amber-100/80 p-3">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center text-center px-1">
            <span className="h-7 w-7 rounded-full bg-amber-50 inline-flex items-center justify-center mb-1">
              <Icon className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <span className="font-display text-[16px] font-extrabold leading-none tracking-tight">{value}</span>
            <span className="text-[10px] mt-1 text-neutral-500 leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

export default HeroGreeting;
