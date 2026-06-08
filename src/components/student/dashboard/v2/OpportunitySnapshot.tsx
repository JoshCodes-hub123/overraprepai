import { Link } from "react-router-dom";
import { GraduationCap, Briefcase, Trophy, Code, Sparkles, ArrowRight } from "lucide-react";
import { useOpportunities, type OpportunityCategory } from "@/hooks/useOpportunities";

const CAT_META: Record<OpportunityCategory, { icon: any; tint: string }> = {
  scholarship:  { icon: GraduationCap, tint: "bg-emerald-100 text-emerald-700" },
  internship:   { icon: Briefcase,     tint: "bg-orange-100 text-orange-700" },
  hackathon:    { icon: Code,          tint: "bg-violet-100 text-violet-700" },
  competition:  { icon: Trophy,        tint: "bg-amber-100 text-amber-700" },
  tech_program: { icon: Sparkles,      tint: "bg-sky-100 text-sky-700" },
  career:       { icon: Briefcase,     tint: "bg-rose-100 text-rose-700" },
};

export function OpportunitySnapshot() {
  const { data = [], isLoading } = useOpportunities({ limit: 2 });

  return (
    <section aria-labelledby="opp-label" className="rounded-2xl border border-amber-100 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 id="opp-label" className="font-display text-[14px] font-bold tracking-tight">
          Opportunity Snapshot
        </h2>
        <Link to="/opportunities" className="text-[11.5px] font-bold text-amber-700 hover:text-amber-800">
          View All
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-amber-50/40 animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <Link to="/opportunities" className="block text-center py-4 text-[12.5px] text-neutral-500 hover:text-amber-700">
          New opportunities drop weekly — check back soon →
        </Link>
      ) : (
        <ul className="space-y-1.5">
          {data.map((o) => {
            const meta = CAT_META[o.category] ?? CAT_META.career;
            const Icon = meta.icon;
            const deadline = o.deadline
              ? new Date(o.deadline).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
              : null;
            return (
              <li key={o.id}>
                <Link
                  to={`/opportunities/${o.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-amber-50/40 transition"
                >
                  <span className={`h-10 w-10 shrink-0 rounded-xl inline-flex items-center justify-center ${meta.tint}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[13px] font-bold leading-tight truncate">{o.title}</p>
                    <p className="text-[11px] text-neutral-500 leading-tight truncate mt-0.5">
                      {deadline ? `Apply before ${deadline}` : o.organization}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-300 shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default OpportunitySnapshot;
