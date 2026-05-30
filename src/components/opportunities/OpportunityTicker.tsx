import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, GraduationCap, Briefcase, Trophy, Code2, Rocket } from "lucide-react";
import { differenceInDays } from "date-fns";
import { useOpportunities, type OpportunityCategory } from "@/hooks/useOpportunities";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const ICONS: Record<OpportunityCategory, typeof Sparkles> = {
  scholarship: GraduationCap,
  internship: Briefcase,
  hackathon: Code2,
  competition: Trophy,
  tech_program: Rocket,
  career: Briefcase,
};

const LABELS: Record<OpportunityCategory, string> = {
  scholarship: "Scholarship",
  internship: "Internship",
  hackathon: "Hackathon",
  competition: "Competition",
  tech_program: "Tech Program",
  career: "Career",
};

function deadlinePhrase(deadline: string | null): string {
  if (!deadline) return "rolling deadline";
  const days = differenceInDays(new Date(deadline), new Date());
  if (days < 0) return "closed";
  if (days === 0) return "closes today";
  if (days === 1) return "closes tomorrow";
  if (days <= 30) return `closes in ${days}d`;
  return `closes in ${Math.ceil(days / 7)}w`;
}

/**
 * Live "opportunities ticker" — horizontal marquee strip surfacing the
 * newest scholarships, internships, hackathons. Subscribes to the
 * `opportunities` table so newly posted items animate in immediately.
 *
 * Respects prefers-reduced-motion: falls back to a static rotating
 * single-line carousel.
 */
export const OpportunityTicker = ({ className }: { className?: string }) => {
  const { data: items = [] } = useOpportunities({ limit: 10 });
  const qc = useQueryClient();
  const [flash, setFlash] = useState(false);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Realtime — flash gold + invalidate when a new opportunity lands.
  useEffect(() => {
    const ch = supabase
      .channel("opportunity-ticker")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "opportunities" },
        () => {
          qc.invalidateQueries({ queryKey: ["opportunities"] });
          setFlash(true);
          setTimeout(() => setFlash(false), 1500);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  if (items.length === 0) return null;

  // Duplicate items so the marquee loop is seamless.
  const loop = [...items, ...items];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-white to-amber-50",
        "shadow-[0_2px_12px_-4px_rgba(217,169,40,0.25)] transition-shadow",
        flash && "ring-2 ring-amber-400 shadow-[0_0_20px_-4px_rgba(217,169,40,0.6)]",
        className,
      )}
      aria-label="Latest opportunities"
    >
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-amber-50 to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-amber-50 to-transparent z-10" />

      {/* Live dot */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600" />
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700 hidden sm:inline">
          Live
        </span>
      </div>

      <div className="pl-14 sm:pl-20 pr-3 py-2.5">
        <div
          className={cn(
            "flex items-center gap-6 whitespace-nowrap",
            reduceMotion.current ? "" : "animate-marquee hover:[animation-play-state:paused]",
          )}
          style={{ animationDuration: `${Math.max(20, loop.length * 4)}s` }}
        >
          {loop.map((op, i) => {
            const Icon = ICONS[op.category] ?? Sparkles;
            return (
              <Link
                key={`${op.id}-${i}`}
                to={`/opportunities/${op.id}`}
                className="inline-flex items-center gap-2 text-[12.5px] font-medium text-neutral-700 hover:text-amber-800 group"
              >
                <Icon className="h-3.5 w-3.5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-amber-800">{LABELS[op.category]}</span>
                <span className="opacity-60">·</span>
                <span className="font-semibold truncate max-w-[18ch]">{op.title}</span>
                <span className="opacity-60">·</span>
                <span className="text-amber-700 font-bold">{deadlinePhrase(op.deadline)}</span>
                <span className="ml-2 text-amber-400">✦</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OpportunityTicker;
