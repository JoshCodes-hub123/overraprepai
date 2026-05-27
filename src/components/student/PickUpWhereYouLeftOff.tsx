import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, ClipboardList, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { listRecentAudioSessions, type AudioSessionRow } from "@/lib/audioSessions";

interface OpenQuiz {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  startedAt: string;
}

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const since = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

/**
 * "Pick up where you left off" — surfaces the most recent unfinished
 * audio session and the most recent in-progress quiz attempt, so users
 * can return to mid-session work in one tap. Renders nothing when there
 * is nothing pending.
 */
export const PickUpWhereYouLeftOff = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [audio, setAudio] = useState<AudioSessionRow | null>(null);
  const [quiz, setQuiz] = useState<OpenQuiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [audioSessions, quizRes] = await Promise.all([
        listRecentAudioSessions(1),
        supabase
          .from("quiz_attempts")
          .select("id, quiz_id, started_at, quizzes(id, title)")
          .eq("user_id", user.id)
          .is("completed_at", null)
          .order("started_at", { ascending: false })
          .limit(1),
      ]);
      if (cancelled) return;
      const a = audioSessions[0] ?? null;
      // Only show audio if there is meaningful unfinished time (>10s and <95% done when duration known)
      const showAudio =
        a &&
        a.position_seconds > 10 &&
        (!a.duration_seconds || a.position_seconds < a.duration_seconds * 0.95);
      setAudio(showAudio ? a : null);
      const q = (quizRes.data?.[0] ?? null) as any;
      setQuiz(
        q && q.quizzes
          ? { attemptId: q.id, quizId: q.quiz_id, quizTitle: q.quizzes.title, startedAt: q.started_at }
          : null
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || (!audio && !quiz)) return null;

  return (
    <section aria-label="Pick up where you left off" className="mb-6">
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <span className="h-3 w-0.5 rounded-full bg-amber-500" />
        <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
          Pick up where you left off
        </h2>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {audio && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate("/audio-learning")}
            className="group flex items-center gap-3 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white px-4 py-3.5 text-left shadow-[0_4px_18px_-12px_rgba(180,140,40,0.25)] hover:shadow-[0_10px_24px_-12px_rgba(180,140,40,0.35)] transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Headphones className="h-5 w-5 text-amber-700" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-700/80">
                Resume listening
              </div>
              <div className="font-display text-[14px] font-bold text-neutral-800 truncate leading-tight">
                {audio.title || "Audio session"}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {formatTime(audio.position_seconds)}
                {audio.duration_seconds ? ` / ${formatTime(audio.duration_seconds)}` : ""}
                {" · "}
                {since(audio.updated_at)}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}

        {quiz && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(`/quiz/${quiz.quizId}`)}
            className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white px-4 py-3.5 text-left shadow-[0_4px_18px_-12px_rgba(20,120,80,0.2)] hover:shadow-[0_10px_24px_-12px_rgba(20,120,80,0.3)] transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-emerald-700" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-700/80">
                Finish quiz
              </div>
              <div className="font-display text-[14px] font-bold text-neutral-800 truncate leading-tight">
                {quiz.quizTitle}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Started {since(quiz.startedAt)}
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-700 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        )}
      </div>
    </section>
  );
};

export default PickUpWhereYouLeftOff;