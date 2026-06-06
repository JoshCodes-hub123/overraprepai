import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useActiveExamGoal, useWeaknessSignals } from "@/hooks/useReadiness";

/**
 * TodayCard — the single primary CTA on Home.
 * Picks the most useful next action based on the student's state.
 */
export const TodayCard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: goal } = useActiveExamGoal();
  const { data: weak = [] } = useWeaknessSignals(1);

  const path = (profile as any)?.academic_path;
  let title = "Start your first quiz";
  let subtitle = "Pick a course and warm up in 5 minutes.";
  let to = "/courses";

  if (!path) {
    title = "Set up your prep";
    subtitle = "Tell us your track so we can tailor everything.";
    to = "/profile/preparation";
  } else if (goal?.target_date) {
    title = "Continue your exam plan";
    subtitle = weak[0]?.topic
      ? `Today's focus: ${weak[0].topic}`
      : "Open today's recommended drill.";
    to = "/exams";
  } else if (path === "university") {
    title = "Practice a quiz today";
    subtitle = "Sharpen one course in 10 minutes.";
    to = "/courses";
  } else {
    title = "Practice a subject today";
    subtitle = "Sharpen one subject in 10 minutes.";
    to = "/subjects";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="my-4"
    >
      <Card
        onClick={() => navigate(to)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && navigate(to)}
        className="cursor-pointer relative overflow-hidden border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-5 hover:shadow-[0_12px_30px_-14px_rgba(180,140,40,0.5)] hover:-translate-y-0.5 transition-all"
      >
        <div className="flex items-start gap-4">
          <span className="h-12 w-12 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
            <Sparkles className="h-6 w-6 text-white" strokeWidth={2} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-amber-700/80">
              Your next step
            </div>
            <div className="font-display text-lg font-extrabold text-neutral-900 leading-tight mt-1">
              {title}
            </div>
            <div className="text-sm text-neutral-600 mt-0.5 line-clamp-2">
              {subtitle}
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-amber-700 shrink-0 mt-1" />
        </div>
      </Card>
    </motion.div>
  );
};

export default TodayCard;
