import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Target, Brain, Flame, BookOpen, Trophy,
  Headphones, ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  useTodayMission, useReadinessAll, useSuccessScore,
} from "@/hooks/useIntelligence";
import { useDueCards } from "@/hooks/useSRS";
import { listRecentAudioSessions, type AudioSessionRow } from "@/lib/audioSessions";

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const since = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

type Action = {
  label: string;
  title: string;
  subtitle: string;
  to: string;
  icon: typeof Target;
  cta: string;
};

interface OpenQuiz {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  startedAt: string;
}

/**
 * WhatsNextCard — single, calm hero that replaces the old stack of
 * HeroGreeting + PickUpWhereYouLeftOff + NextBestAction + IntelligenceWidget +
 * TodayFocusCard. One greeting, three stat chips, one smart "do this next"
 * CTA, and optional resume row. Mobile-first.
 */
export default function WhatsNextCard() {
  const { user, profile } = useAuth();
  const { data: mission } = useTodayMission();
  const { data: readiness = [] } = useReadinessAll();
  const { data: due = [] } = useDueCards();
  const { data: score } = useSuccessScore();

  const cacheKey = user ? `wn:hero:${user.id}` : null;

  // Hydrate from localStorage for instant first paint on revisit.
  const initial = (() => {
    if (typeof window === "undefined" || !cacheKey) return null;
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Drop cache older than 24h to avoid stale streaks.
      if (Date.now() - (parsed.t ?? 0) > 86_400_000) return null;
      return parsed as { streak: number; readinessPct: number | null; audio: AudioSessionRow | null; quiz: OpenQuiz | null; t: number };
    } catch { return null; }
  })();

  const [streak, setStreak] = useState(initial?.streak ?? 0);
  const [readinessPct, setReadinessPct] = useState<number | null>(initial?.readinessPct ?? null);
  const [audio, setAudio] = useState<AudioSessionRow | null>(initial?.audio ?? null);
  const [quiz, setQuiz] = useState<OpenQuiz | null>(initial?.quiz ?? null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: r }, audioSessions, quizRes] = await Promise.all([
        supabase.from("study_streaks").select("current_streak").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("readiness_attempts").select("score_pct")
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        listRecentAudioSessions(1),
        supabase.from("quiz_attempts")
          .select("id, quiz_id, started_at, quizzes(id, title)")
          .eq("user_id", user.id).is("completed_at", null)
          .order("started_at", { ascending: false }).limit(1),
      ]);
      if (cancelled) return;
      const nextStreak = (s as any)?.current_streak ?? 0;
      const pct = Array.isArray(r) && (r as any)[0]?.score_pct != null
        ? Math.round(Number((r as any)[0].score_pct)) : null;
      const a = audioSessions[0] ?? null;
      const showAudio = a && a.position_seconds > 10 &&
        (!a.duration_seconds || a.position_seconds < a.duration_seconds * 0.95);
      const nextAudio = showAudio ? a : null;
      const q = (quizRes.data?.[0] ?? null) as any;
      const nextQuiz = q && q.quizzes
        ? { attemptId: q.id, quizId: q.quiz_id, quizTitle: q.quizzes.title, startedAt: q.started_at }
        : null;
      setStreak(nextStreak);
      setReadinessPct(pct);
      setAudio(nextAudio);
      setQuiz(nextQuiz);
      if (cacheKey) {
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({
            streak: nextStreak, readinessPct: pct, audio: nextAudio, quiz: nextQuiz, t: Date.now(),
          }));
        } catch { /* quota — ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [user, cacheKey]);

  const first = profile?.full_name?.split(" ")[0] || "Student";

  const action: Action = useMemo(() => {
    if (!profile?.academic_path || !profile?.department) {
      return { label: "Set up profile", title: "Personalize your dashboard",
        subtitle: "Add your path & department so we can tailor everything.",
        to: "/profile/edit", icon: Sparkles, cta: "Complete profile" };
    }
    if (due.length > 0) {
      return { label: "Review now", title: `${due.length} card${due.length > 1 ? "s" : ""} ready for review`,
        subtitle: "Reinforce what you've learned. 2 minutes is enough.",
        to: "/review", icon: Brain, cta: "Start review" };
    }
    const weakest = [...readiness].sort((a, b) => a.readiness - b.readiness)[0];
    if (weakest && weakest.readiness < 70) {
      return { label: "Focus area", title: `Strengthen ${weakest.course_code ?? weakest.course_name ?? "your weak course"}`,
        subtitle: `Readiness ${weakest.readiness}% — predicted grade ${weakest.predicted_grade}.`,
        to: `/study-hub/${weakest.course_id}`, icon: Target, cta: "Study now" };
    }
    const pending = mission?.tasks?.find((t) => !t.done);
    if (pending) {
      return { label: "Today's mission", title: pending.label,
        subtitle: `Streak: ${mission?.streak ?? streak} days — keep it alive.`,
        to: pending.link || "/student/dashboard", icon: Flame, cta: "Go" };
    }
    if ((score?.score ?? 0) < 80) {
      return { label: "Climb the ranks", title: "Join a live Arena challenge",
        subtitle: "Quick win — earn points and boost your success score.",
        to: "/arena", icon: Trophy, cta: "Enter Arena" };
    }
    return { label: "Keep momentum", title: "Pick a course to study",
      subtitle: "A short session today compounds into mastery this week.",
      to: "/study-hub", icon: BookOpen, cta: "Browse courses" };
  }, [profile, mission, readiness, due, score, streak]);

  const Icon = action.icon;

  const chips = [
    { label: "Streak", value: `${streak}d`, icon: Flame },
    { label: "Readiness", value: readinessPct != null ? `${readinessPct}%` : "—", icon: Target },
    { label: "Score", value: score?.score != null ? `${score.score}` : "—", icon: Sparkles },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="What's next"
      className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 via-white to-white p-4 sm:p-5 shadow-[0_10px_30px_-18px_rgba(217,119,6,0.35)]"
    >
      <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />

      {/* Greeting */}
      <div className="relative">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-700/80">{greet()}</p>
        <h1 className="font-display text-[20px] sm:text-[24px] font-extrabold leading-tight tracking-tight mt-0.5">
          Hi,{" "}
          <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
            {first}
          </span>
        </h1>

        {/* Stat chips */}
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {chips.map(({ label, value, icon: I }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-xl border border-amber-100 bg-white/80 px-2.5 py-1.5">
              <I className="h-3.5 w-3.5 text-amber-600 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-none text-neutral-900 tabular-nums">{value}</p>
                <p className="text-[9.5px] text-neutral-500 leading-tight mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Primary next action */}
      <Link
        to={action.to}
        className="relative mt-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-white p-3 sm:p-3.5 hover:border-amber-300 hover:shadow-sm transition group"
      >
        <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow flex items-center justify-center">
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber-700">{action.label}</p>
          <p className="font-display text-[14px] sm:text-[15px] font-bold leading-tight text-neutral-900 line-clamp-2">
            {action.title}
          </p>
          <p className="text-[11.5px] text-neutral-500 mt-0.5 line-clamp-1">{action.subtitle}</p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3 py-1.5 text-[11.5px] font-semibold">
          {action.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* Resume row */}
      {(audio || quiz) && (
        <div className="relative mt-2.5 grid gap-2 sm:grid-cols-2">
          {audio && (
            <Link
              to="/audio-learning"
              className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-white/80 px-3 py-2 hover:border-amber-300 transition"
            >
              <Headphones className="h-4 w-4 text-amber-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-neutral-800 truncate leading-tight">
                  Resume · {audio.title || "Audio"}
                </p>
                <p className="text-[10px] text-neutral-500">{since(audio.updated_at)}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-amber-700/70" />
            </Link>
          )}
          {quiz && (
            <Link
              to={`/quiz/${quiz.quizId}`}
              className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 hover:border-emerald-300 transition"
            >
              <ClipboardList className="h-4 w-4 text-emerald-700 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-neutral-800 truncate leading-tight">
                  Finish · {quiz.quizTitle}
                </p>
                <p className="text-[10px] text-neutral-500">Started {since(quiz.startedAt)}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-700/70" />
            </Link>
          )}
        </div>
      )}
    </motion.section>
  );
}
