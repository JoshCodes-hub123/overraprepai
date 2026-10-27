import React from "react";
import { motion } from "framer-motion";
import { BookCheck, GraduationCap, Sparkles, TrendingUp } from "lucide-react";

interface StatItem {
  icon: React.ComponentType<{ className?: string }>;
  metric: string;
  label: string;
}

const STAT_ITEMS: StatItem[] = [
  {
    icon: BookCheck,
    metric: "14,000+",
    label: "Verified Past Questions",
  },
  {
    icon: GraduationCap,
    metric: "All Major",
    label: "Nigerian Universities",
  },
  {
    icon: Sparkles,
    metric: "Syllabus-Aligned",
    label: "Practice & Explanations",
  },
  {
    icon: TrendingUp,
    metric: "Better Results",
    label: "Track, Improve, Succeed",
  },
];

export const TrustStrip: React.FC = () => {
  return (
    <section
      className="relative -mt-6 sm:-mt-8 lg:-mt-10 pb-10 sm:pb-14 z-20"
      aria-label="Verified Academic Metrics"
    >
      <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl sm:rounded-3xl bg-[#FCFBF8] border border-[#EAE4D9] shadow-[0_12px_35px_-10px_rgba(28,25,23,0.06),0_1px_3px_rgba(28,25,23,0.03)] p-4 sm:p-6 lg:p-7"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#EAE4D9]/80">
            {STAT_ITEMS.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.metric}
                  className={`flex items-center gap-3.5 sm:gap-4 py-3 sm:py-2 ${
                    index === 0
                      ? "sm:pr-4 lg:pr-6"
                      : index === STAT_ITEMS.length - 1
                      ? "sm:pl-4 lg:pl-6"
                      : "sm:px-4 lg:px-6"
                  }`}
                >
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#FAF2DF] border border-[#E5D7B5] flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-[#8C6B10]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-[#18181B] leading-none">
                      {item.metric}
                    </p>
                    <p className="text-xs sm:text-[13px] text-[#71717A] font-medium leading-snug mt-1">
                      {item.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustStrip;
