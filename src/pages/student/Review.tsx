import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Loader2, WifiOff, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useDueCards, useReviewCard, useSrsStats,
  useFlushQueueOnReconnect, useUpcomingCards,
} from "@/hooks/useSRS";
import { sm2, forecastByDay } from "@/lib/srs";
import { SEO } from "@/components/seo/SEO";
import { format } from "date-fns";

const GRADES = [
  { q: 0, label: "Again", desc: "Forgot", color: "bg-red-500 hover:bg-red-600" },
  { q: 3, label: "Hard",  desc: "Tough",  color: "bg-orange-500 hover:bg-orange-600" },
  { q: 4, label: "Good",  desc: "OK",     color: "bg-emerald-500 hover:bg-emerald-600" },
  { q: 5, label: "Easy",  desc: "Easy",   color: "bg-primary hover:bg-primary/90" },
];

function formatNextInterval(days: number) {
  if (days <= 0) return "<10m";
  if (days < 1) return "today";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

export default function Review() {
  const nav = useNavigate();
  const { data: cards = [], isLoading } = useDueCards();
  const { data: stats } = useSrsStats();
  const { data: upcoming = [] } = useUpcomingCards(7);
  const review = useReviewCard();
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  useFlushQueueOnReconnect();

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const card = cards[idx];

  const grade = async (q: number) => {
    if (!card) return;
    await review.mutateAsync({ card, quality: q });
    setRevealed(false);
    setIdx(i => i + 1);
  };

  const previews = card
    ? GRADES.map(g => ({ ...g, next: sm2(card, g.q) }))
    : [];

  const forecast = forecastByDay(upcoming, 7);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Daily Review" description="Spaced repetition queue" />
      <div className="max-w-md mx-auto px-4 pt-4">
        <PremiumPageHero
          eyebrow="DAILY REVIEW"
          title="Lock it into memory"
          subtitle={stats ? `${Math.max(0, stats.due - idx)} due · ${stats.total} total in your deck` : "Loading your review queue…"}
          icon={Sparkles}
          back
          size="sm"
          right={!online ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-white/85 border border-amber-200 px-2 py-1 rounded-full">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          ) : null}
        />
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : !card ? (
          <div className="text-center py-12">
            <Sparkles className="w-14 h-14 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">All caught up! 🎉</h2>
            <p className="text-sm text-muted-foreground mb-5">No cards due right now.</p>
            <Button onClick={() => nav("/library")}>Add more from Library</Button>

            {forecast.some(f => f.count > 0) && (
              <div className="mt-8 text-left rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                  <Calendar className="w-4 h-4 text-primary" /> Upcoming this week
                </h3>
                <div className="space-y-1.5">
                  {forecast.map(f => (
                    <div key={f.day} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{format(new Date(f.day), "EEE, MMM d")}</span>
                      <span className="font-mono font-semibold">{f.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border-2 border-primary/20 bg-card p-6 min-h-[260px] flex flex-col items-center justify-center text-center shadow-sm">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Question {card.repetitions === 0 ? "· new" : `· rep ${card.repetitions}`}
                </p>
                <p className="text-lg font-semibold whitespace-pre-wrap">{card.front}</p>
                {revealed && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full mt-6 pt-6 border-t border-border/60"
                  >
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Answer</p>
                    <p className="text-base whitespace-pre-wrap">{card.back}</p>
                  </motion.div>
                )}
              </div>

              {!revealed ? (
                <Button onClick={() => setRevealed(true)} className="w-full" size="lg">
                  Show Answer
                </Button>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {previews.map(g => (
                    <Button
                      key={g.q}
                      onClick={() => grade(g.q)}
                      disabled={review.isPending}
                      className={`${g.color} text-white flex flex-col h-auto py-2.5`}
                    >
                      <span className="font-semibold text-sm">{g.label}</span>
                      <span className="text-[10px] opacity-90">{formatNextInterval(g.next.interval_days || 0)}</span>
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
