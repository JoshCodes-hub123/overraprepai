import { Link } from "react-router-dom";
import { GraduationCap, Sparkles, Timer } from "lucide-react";
import { Opportunity } from "@/hooks/useOpportunities";

const LABEL: Record<string, string> = {
  scholarship: "Scholarship",
  internship: "Internship",
  hackathon: "Hackathon",
  competition: "Competition",
  tech_program: "Tech program",
  career: "Career",
};

function deadlineLabel(deadline: string | null) {
  if (!deadline) return "Open now";
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 30) return `${days} days left`;
  return new Date(deadline).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Horizontally scrolling strip of the freshest scholarships and opportunities.
 * Keeps the dashboard rich without adding a wall of cards.
 */
export function OpportunityStrip({ items }: { items: Opportunity[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {items.map((o) => (
          <Link
            key={o.id}
            to={`/opportunities/${o.id}`}
            className="group relative flex w-[248px] shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-brand-line bg-brand-surface p-4 transition-all hover:-translate-y-0.5 hover:bg-brand-soft"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-env-soft blur-2xl"
            />
            <span className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-env-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-env">
                {o.category === "scholarship" ? (
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                )}
                {LABEL[o.category] ?? "Opportunity"}
              </span>
              <span className="mt-2.5 block line-clamp-2 text-[15px] font-bold leading-snug text-brand-ink">
                {o.title}
              </span>
              {o.organization && (
                <span className="mt-1 block truncate text-[12.5px] text-brand-ink-soft">
                  {o.organization}
                </span>
              )}
            </span>
            <span className="relative mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-ink-soft">
              <Timer className="h-3.5 w-3.5" aria-hidden />
              {deadlineLabel(o.deadline)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default OpportunityStrip;
