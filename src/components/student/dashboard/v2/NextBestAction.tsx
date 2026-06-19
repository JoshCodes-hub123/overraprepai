import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Target, Brain, Flame, BookOpen, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTodayMission, useReadinessAll, useSuccessScore } from "@/hooks/useIntelligence";
import { useDueCards } from "@/hooks/useSRS";

type Action = {
  label: string;
  title: string;
  subtitle: string;
  to: string;
  icon: typeof Target;
  cta: string;
};

/**
 * NextBestAction — single calm hero card that always tells the student
 * the ONE most useful thing to do right now. Fully responsive.
 */
export default function NextBestAction() {
  const { profile } = useAuth();
  const { data: mission } = useTodayMission();
  const { data: readiness = [] } = useReadinessAll();
  const { data: due = [] } = useDueCards();
  const { data: score } = useSuccessScore();

  const action: Action = useMemo(() => {
    // 1) Profile not complete → set it up
    if (!profile?.academic_path || !profile?.department) {
      return {
        label: "Set up your profile",
        title: "Personalize your dashboard",
        subtitle: "Add your path & department so we can tailor everything.",
        to: "/profile/edit",
        icon: Sparkles,
        cta: "Complete profile",
      };
    }
    // 2) Due flashcards waiting
    if (due.length > 0) {
      return {
        label: "Review now",
        title: `${due.length} card${due.length > 1 ? "s" : ""} ready for review`,
        subtitle: "Reinforce what you've learned. 2 minutes is enough.",
        to: "/review",
        icon: Brain,
        cta: "Start review",
      };
    }
    // 3) Weakest course → focus session
    const weakest = [...readiness].sort((a, b) => a.readiness - b.readiness)[0];
    if (weakest && weakest.readiness < 70) {
      return {
        label: "Focus area",
        title: `Strengthen ${weakest.course_code ?? weakest.course_name ?? "your weak course"}`,
        subtitle: `Readiness ${weakest.readiness}% — predicted grade ${weakest.predicted_grade}.`,
        to: `/study-hub/${weakest.course_id}`,
        icon: Target,
        cta: "Study now",
      };
    }
    // 4) Mission tasks pending
    const pending = mission?.tasks?.find((t) => !t.done);
    if (pending) {
      return {
        label: "Today's mission",
        title: pending.label,
        subtitle: `Streak: ${mission?.streak ?? 0} days — keep it alive.`,
        to: pending.link || "/student/dashboard",
        icon: Flame,
        cta: "Go",
      };
    }
    // 5) Push toward Arena to climb leaderboard
    if ((score?.score ?? 0) < 80) {
      return {
        label: "Climb the ranks",
        title: "Join a live Arena challenge",
        subtitle: "Quick win — earn points and boost your success score.",
        to: "/arena",
        icon: Trophy,
        cta: "Enter Arena",
      };
    }
    // 6) Default: explore courses
    return {
      label: "Keep momentum",
      title: "Pick a course to study",
      subtitle: "A short session today compounds into mastery this week.",
      to: "/study-hub",
      icon: BookOpen,
      cta: "Browse courses",
    };
  }, [profile, mission, readiness, due, score]);

  const Icon = action.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Next best action"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-200/70 bg-gradient-to-br from-white via-amber-50/40 to-white shadow-[0_8px_28px_-12px_rgba(180,140,40,0.25)]"
    >
      <div aria-hidden className="absolute -top-16 -right-12 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
      <div aria-hidden className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-orange-100/50 blur-3xl" />

      <div className="relative p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div className="shrink-0 h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md flex items-center justify-center">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-amber-700">
              {action.label}
            </p>
            <h2 className="font-display text-[17px] sm:text-[20px] leading-tight font-extrabold text-foreground mt-0.5 line-clamp-2">
              {action.title}
            </h2>
            <p className="text-[12.5px] sm:text-[13.5px] text-muted-foreground mt-1 line-clamp-2">
              {action.subtitle}
            </p>
          </div>
        </div>

        <Link
          to={action.to}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background px-4 sm:px-5 py-2.5 text-[13px] sm:text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition w-full sm:w-auto"
        >
          {action.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.section>
  );
}
