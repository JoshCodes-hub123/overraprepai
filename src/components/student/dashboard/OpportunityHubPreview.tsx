import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, GraduationCap, Trophy, Compass, ArrowRight, type LucideIcon } from "lucide-react";
import { useOpportunities } from "@/hooks/useOpportunities";

interface OpportunityCard {
  icon: LucideIcon;
  label: string;
  hint: string;
}

const CARDS: OpportunityCard[] = [
  { icon: Briefcase,      label: "Internships",  hint: "Build experience" },
  { icon: GraduationCap,  label: "Scholarships", hint: "Fund your studies" },
  { icon: Trophy,         label: "Hackathons",   hint: "Compete & learn" },
  { icon: Compass,        label: "Opportunities", hint: "Discover more" },
];

interface Props {
  university?: string;
}

/**
 * Calm 2x2 grid placeholder for the Opportunity Hub.
 * Structured for future university-scoped filtering — no data fetching yet.
 */
export const OpportunityHubPreview = ({ university = "FUTA" }: Props) => {
  const navigate = useNavigate();
  const { data: live = [] } = useOpportunities({ limit: 4 });
  const hasLive = live.length > 0;

  return (
    <section aria-label="Opportunity hub" className="mb-7">
      <div className="flex items-end justify-between mb-3 px-0.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-0.5 rounded-full bg-amber-500" />
            <h2 className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
              Opportunity hub
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1 ml-3.5">
            Curated for {university} students
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/opportunities")}
          className="text-[11px] font-bold tracking-wider uppercase text-amber-700 hover:text-amber-800"
        >
          See all →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {(hasLive
          ? live.slice(0, 4).map((op) => ({
              icon: op.category === "scholarship" ? GraduationCap
                  : op.category === "hackathon" || op.category === "competition" ? Trophy
                  : op.category === "internship" ? Briefcase : Compass,
              label: op.title,
              hint: op.organization,
              href: `/opportunities/${op.id}`,
            }))
          : CARDS.map((c) => ({ icon: c.icon, label: c.label, hint: c.hint, href: "/opportunities" }))
        ).map((c, i) => {
          const Icon = c.icon as LucideIcon;
          return (
            <motion.button
              key={c.label}
              type="button"
              onClick={() => navigate(c.href)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.98 }}
              className="group relative flex items-center gap-3 rounded-2xl border border-neutral-100 bg-white p-3.5 min-h-[72px] text-left hover:border-amber-200 hover:shadow-[0_8px_22px_-12px_rgba(180,140,40,0.3)] hover:-translate-y-0.5 transition-all"
              aria-label={c.label}
            >
              <span className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon className="h-[18px] w-[18px] text-amber-700" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[13px] font-bold text-neutral-800 leading-tight line-clamp-2">
                  {c.label}
                </span>
                <span className="block text-[10.5px] text-neutral-400 mt-0.5 truncate">
                  {c.hint}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default OpportunityHubPreview;