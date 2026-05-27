import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useOpportunities, useOpportunitiesRealtime } from "@/hooks/useOpportunities";
import { OpportunityListItem } from "@/components/opportunities/OpportunityCard";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles } from "lucide-react";

interface Props {
  university?: string;
}

export const OpportunityHubPreview = ({ university = "FUTA" }: Props) => {
  const navigate = useNavigate();
  const { data: live = [] } = useOpportunities({ limit: 4 });
  const qc = useQueryClient();

  // Live updates — new opportunities appear instantly in the dashboard.
  useEffect(() => {
    const ch = supabase
      .channel("opportunities-dashboard")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => qc.invalidateQueries({ queryKey: ["opportunities"] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const now = Date.now();
  const isFresh = (iso: string) => now - new Date(iso).getTime() < 1000 * 60 * 60 * 48;

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

      {live.length === 0 ? (
        <button
          type="button"
          onClick={() => navigate("/opportunities")}
          className="w-full flex items-center gap-3 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4 text-left hover:bg-amber-50/60"
        >
          <span className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-700" />
          </span>
          <span className="text-[13px] text-amber-900">
            <span className="font-bold block">Discover scholarships, internships & more</span>
            <span className="text-[11px] text-amber-700/80">Curated for university students</span>
          </span>
        </button>
      ) : (
        <div className="grid gap-2">
          {live.slice(0, 4).map((op, i) => (
            <motion.div
              key={op.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            >
              <OpportunityListItem op={op} isNew={isFresh(op.created_at)} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
};

export default OpportunityHubPreview;