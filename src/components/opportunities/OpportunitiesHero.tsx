import { Sparkles, Plus } from "lucide-react";
import { SuggestOpportunityDialog } from "@/components/opportunities/SuggestOpportunityDialog";

interface Props {
  liveCount: number;
}

/**
 * Editorial hero band for /opportunities — large display headline,
 * soft gold gradient, live count badge, and a "Submit your program"
 * CTA so partners feel invited to be featured.
 */
export const OpportunitiesHero = ({ liveCount }: Props) => {
  return (
    <section className="relative overflow-hidden rounded-3xl mb-6 border border-amber-200/60">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-amber-50 to-white" />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(180,140,40,0.5) 0, transparent 40%), radial-gradient(circle at 80% 60%, rgba(217,169,40,0.5) 0, transparent 50%)",
        }}
      />
      {/* Decorative orb */}
      <div className="absolute -top-12 -right-10 w-48 h-48 rounded-full bg-gradient-to-br from-amber-300/40 to-amber-500/20 blur-2xl" />

      <div className="relative p-5 sm:p-8">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 backdrop-blur border border-amber-200 mb-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-600" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">
            {liveCount} {liveCount === 1 ? "opportunity" : "opportunities"} live
          </span>
        </div>

        <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-neutral-900 leading-tight tracking-tight max-w-2xl">
          Scholarships, internships & competitions{" "}
          <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
            curated for Nigerian students.
          </span>
        </h1>
        <p className="text-[13px] sm:text-[14.5px] text-neutral-600 mt-2.5 max-w-xl leading-relaxed">
          Hand-picked daily. Apply early, track your progress, and never miss a deadline.
          Partners and tutors — submit your program to be featured.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SuggestOpportunityDialog />
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 backdrop-blur border border-amber-200/70 text-[11.5px] font-semibold text-amber-800">
            <Sparkles className="h-3.5 w-3.5" /> Updated daily by OverraPrep
          </span>
        </div>
      </div>
    </section>
  );
};

export default OpportunitiesHero;
