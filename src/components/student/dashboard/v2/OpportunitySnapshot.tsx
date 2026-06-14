import { Link } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  Trophy,
  Code,
  Sparkles,
  ArrowRight,
  Clock,
  Flame,
  Bookmark,
} from "lucide-react";
import { useOpportunities, type OpportunityCategory } from "@/hooks/useOpportunities";

const CAT_META: Record<
  OpportunityCategory,
  { icon: any; label: string; tint: string; chipTint: string }
> = {
  scholarship: {
    icon: GraduationCap,
    label: "Scholarship",
    tint: "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30",
    chipTint: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70",
  },
  internship: {
    icon: Briefcase,
    label: "Internship",
    tint: "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-md shadow-orange-500/30",
    chipTint: "bg-orange-50 text-orange-700 ring-1 ring-orange-200/70",
  },
  hackathon: {
    icon: Code,
    label: "Hackathon",
    tint: "bg-gradient-to-br from-violet-400 to-fuchsia-500 text-white shadow-md shadow-violet-500/30",
    chipTint: "bg-violet-50 text-violet-700 ring-1 ring-violet-200/70",
  },
  competition: {
    icon: Trophy,
    label: "Competition",
    tint: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30",
    chipTint: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/70",
  },
  tech_program: {
    icon: Sparkles,
    label: "Tech Program",
    tint: "bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-md shadow-sky-500/30",
    chipTint: "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70",
  },
  career: {
    icon: Briefcase,
    label: "Career",
    tint: "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-md shadow-rose-500/30",
    chipTint: "bg-rose-50 text-rose-700 ring-1 ring-rose-200/70",
  },
};

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function deadlinePill(days: number | null) {
  if (days === null) return { label: "Rolling", tone: "neutral" as const, hot: false };
  if (days < 0) return { label: "Closed", tone: "neutral" as const, hot: false };
  if (days === 0) return { label: "Closes today", tone: "danger" as const, hot: true };
  if (days <= 7) return { label: `${days}d left`, tone: "danger" as const, hot: true };
  if (days <= 21) return { label: `${days}d left`, tone: "warn" as const, hot: false };
  return { label: `${days}d left`, tone: "ok" as const, hot: false };
}

const PILL_TONE = {
  danger: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  warn: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  ok: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  neutral: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200",
} as const;

export function OpportunitySnapshot() {
  const { data = [], isLoading } = useOpportunities({ limit: 3 });
  const [featured, ...rest] = data;

  return (
    <section
      aria-labelledby="opp-label"
      className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/30 p-4 shadow-[0_2px_12px_-6px_rgba(217,119,6,0.18)]"
    >
      {/* Glow accent */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm shadow-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div>
            <h2 id="opp-label" className="font-display text-[14px] font-bold tracking-tight leading-none">
              Opportunities
            </h2>
            <p className="text-[10.5px] text-neutral-500 leading-none mt-0.5">
              Scholarships, internships & more
            </p>
          </div>
        </div>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-0.5 text-[11.5px] font-bold text-amber-700 hover:text-amber-800"
        >
          See all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2 relative">
          <div className="h-24 rounded-xl bg-amber-50/50 animate-pulse" />
          <div className="h-12 rounded-xl bg-amber-50/40 animate-pulse" />
        </div>
      ) : data.length === 0 ? (
        <Link
          to="/opportunities"
          className="block text-center py-5 text-[12.5px] text-neutral-500 hover:text-amber-700 relative"
        >
          New opportunities drop weekly — check back soon →
        </Link>
      ) : (
        <div className="relative space-y-2">
          {/* Featured (hero) card */}
          {featured && <FeaturedOpportunity opp={featured} />}

          {/* Compact list */}
          {rest.length > 0 && (
            <ul className="space-y-1">
              {rest.map((o) => (
                <li key={o.id}>
                  <CompactOpportunity opp={o} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function FeaturedOpportunity({ opp }: { opp: any }) {
  const meta = CAT_META[opp.category as OpportunityCategory] ?? CAT_META.career;
  const Icon = meta.icon;
  const d = daysLeft(opp.deadline);
  const pill = deadlinePill(d);

  return (
    <Link
      to={`/opportunities/${opp.id}`}
      className="group relative block overflow-hidden rounded-xl border border-amber-100 bg-white p-3 transition hover:border-amber-300 hover:shadow-md hover:shadow-amber-500/10 active:scale-[0.995]"
    >
      <div className="flex items-start gap-3">
        {/* Cover or icon */}
        {opp.cover_image_url ? (
          <div
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-amber-50"
            style={{
              backgroundImage: `url(${opp.cover_image_url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/30 to-transparent" />
            <span
              className={`absolute bottom-1 left-1 inline-flex h-5 w-5 items-center justify-center rounded-md ${meta.tint}`}
            >
              <Icon className="w-3 h-3" />
            </span>
          </div>
        ) : (
          <span
            className={`h-16 w-16 shrink-0 rounded-xl inline-flex items-center justify-center ${meta.tint}`}
          >
            <Icon className="w-7 h-7" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide ${meta.chipTint}`}
            >
              {meta.label}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${PILL_TONE[pill.tone]}`}
            >
              {pill.hot ? <Flame className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
              {pill.label}
            </span>
          </div>
          <p className="font-display text-[13.5px] font-bold leading-tight text-neutral-900 line-clamp-2">
            {opp.title}
          </p>
          <p className="text-[11px] text-neutral-500 leading-tight truncate mt-0.5">
            {opp.organization}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[10.5px] text-neutral-500">
          {typeof opp.view_count === "number" && opp.view_count > 0 && (
            <span>{opp.view_count.toLocaleString()} views</span>
          )}
          {typeof opp.bookmark_count === "number" && opp.bookmark_count > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Bookmark className="w-2.5 h-2.5" />
              {opp.bookmark_count}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2.5 py-1 text-[10.5px] font-bold text-neutral-900 shadow-sm shadow-amber-500/30 transition group-hover:shadow-md group-hover:shadow-amber-500/40">
          View
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}

function CompactOpportunity({ opp }: { opp: any }) {
  const meta = CAT_META[opp.category as OpportunityCategory] ?? CAT_META.career;
  const Icon = meta.icon;
  const d = daysLeft(opp.deadline);
  const pill = deadlinePill(d);

  return (
    <Link
      to={`/opportunities/${opp.id}`}
      className="group flex items-center gap-2.5 rounded-xl p-2 transition hover:bg-amber-50/60"
    >
      <span
        className={`h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center ${meta.tint}`}
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[12.5px] font-semibold leading-tight truncate text-neutral-900">
          {opp.title}
        </p>
        <p className="text-[10.5px] text-neutral-500 leading-tight truncate mt-0.5">
          {opp.organization}
        </p>
      </div>
      <span
        className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${PILL_TONE[pill.tone]}`}
      >
        {pill.hot ? <Flame className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
        {pill.label}
      </span>
    </Link>
  );
}

export default OpportunitySnapshot;
