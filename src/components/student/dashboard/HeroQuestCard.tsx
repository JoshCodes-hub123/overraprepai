import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * 7-Day Hero Quest card — gamified weekly loop. One glowing dot per day,
 * fills in as the student logs at least one study action.
 */
export const HeroQuestCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [isHero, setIsHero] = useState(false);
  const todayIdx = ((new Date().getDay() + 6) % 7); // 0..6 Mon..Sun

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const weekStart = isoDate(mondayOf(new Date()));
      // ensure quest row exists
      let { data: quest } = await (supabase as any)
        .from("weekly_quests")
        .select("id, completed_days, is_hero")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();
      if (!quest) {
        const { data: created } = await (supabase as any)
          .from("weekly_quests")
          .insert({ user_id: user.id, week_start: weekStart })
          .select("id, completed_days, is_hero")
          .maybeSingle();
        quest = created;
      }
      if (cancelled || !quest) return;
      const { data: progress } = await (supabase as any)
        .from("weekly_quest_progress")
        .select("day_index")
        .eq("quest_id", quest.id);
      const set = new Set<number>((progress ?? []).map((r: any) => r.day_index));
      if (!cancelled) {
        setCompletedDays(set);
        setIsHero(Boolean(quest.is_hero));
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const completedCount = completedDays.size;

  return (
    <motion.button
      type="button"
      onClick={() => navigate("/student/challenges")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      whileTap={{ scale: 0.99 }}
      className="group relative w-full text-left mb-5 rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-amber-50/60 p-4 shadow-[0_4px_14px_-8px_rgba(180,140,40,0.35)] hover:shadow-[0_12px_28px_-14px_rgba(180,140,40,0.45)] transition"
      aria-label="Open 7-day hero quest"
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {isHero ? (
            <Crown className="h-4 w-4 text-amber-600" />
          ) : (
            <Flame className="h-4 w-4 text-amber-600" />
          )}
          <span className="text-[11px] font-bold tracking-[0.18em] uppercase text-amber-700">
            {isHero ? "Hero of the week" : "7-Day Hero Quest"}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-neutral-500">{completedCount}/7</span>
      </div>
      <p className="text-sm font-bold text-neutral-900 leading-snug mb-3">
        {isHero
          ? "You did it — wear the cape this week 🦸"
          : "Be the hero of your week — one win a day."}
      </p>
      <div className="flex items-center justify-between gap-1.5">
        {DAYS.map((label, i) => {
          const done = completedDays.has(i);
          const isToday = i === todayIdx;
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span
                className={cn(
                  "h-7 w-7 rounded-full grid place-items-center text-[10px] font-bold transition-all",
                  done
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_0_12px_rgba(217,160,40,0.55)]"
                    : isToday
                    ? "bg-white border-2 border-amber-400 text-amber-700 animate-pulse"
                    : "bg-white border border-neutral-200 text-neutral-300"
                )}
              >
                {done ? "★" : ""}
              </span>
              <span className={cn("text-[10px]", isToday ? "text-amber-700 font-bold" : "text-neutral-400")}>{label}</span>
            </div>
          );
        })}
      </div>
    </motion.button>
  );
};

export default HeroQuestCard;