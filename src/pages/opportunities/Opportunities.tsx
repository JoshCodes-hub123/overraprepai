import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Bookmark } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useOpportunities, useOpportunityBookmarks, useOpportunitiesRealtime, type OpportunityCategory } from "@/hooks/useOpportunities";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import RecommendedOpportunities from "@/components/opportunities/RecommendedOpportunities";
import { SuggestOpportunityDialog } from "@/components/opportunities/SuggestOpportunityDialog";
import { OpportunitiesHero } from "@/components/opportunities/OpportunitiesHero";
import { OpportunityTicker } from "@/components/opportunities/OpportunityTicker";

const CATEGORIES: { id: OpportunityCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "internship", label: "Internships" },
  { id: "scholarship", label: "Scholarships" },
  { id: "hackathon", label: "Hackathons" },
  { id: "competition", label: "Competitions" },
  { id: "tech_program", label: "Tech Programs" },
  { id: "career", label: "Careers" },
];

export default function Opportunities() {
  useOpportunitiesRealtime();
  const navigate = useNavigate();
  const { primaryRole } = useAuth();
  const home =
    primaryRole === "admin" ? "/admin/dashboard"
    : primaryRole === "tutor" ? "/tutor/dashboard"
    : (primaryRole as any) === "school_owner" ? "/school/dashboard"
    : (primaryRole as any) === "parent" ? "/parent/dashboard"
    : "/student/dashboard";
  const [cat, setCat] = useState<OpportunityCategory | "all">("all");
  const [savedOnly, setSavedOnly] = useState(false);
  const { data: items = [], isLoading } = useOpportunities(
    cat === "all" ? undefined : { category: cat },
  );
  const { data: bookmarks = new Set<string>() } = useOpportunityBookmarks();
  const visible = savedOnly ? items.filter((o) => bookmarks.has(o.id)) : items;

  return (
    <>
      <SEO title="Opportunity Hub — OverraPrep AI" description="Internships, scholarships, hackathons and more for Nigerian university students." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate(home)} className="text-muted-foreground" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-display text-base font-bold">Opportunity Hub</h1>
            <div className="ml-auto">
              <SuggestOpportunityDialog />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-3xl">
          <OpportunityTicker className="mb-4" />
          <OpportunitiesHero liveCount={items.length} />

          {cat === "all" && <RecommendedOpportunities />}


          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            <button
              onClick={() => setSavedOnly((s) => !s)}
              className={`shrink-0 inline-flex items-center gap-1 text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border transition-colors ${
                savedOnly
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-card border-amber-100/70 text-muted-foreground hover:border-amber-200"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${savedOnly ? "fill-white" : ""}`} />
              Saved {bookmarks.size > 0 && <span className="ml-1 tabular-nums">({bookmarks.size})</span>}
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCat(c.id); setSavedOnly(false); }}
                className={`shrink-0 text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border transition-colors ${
                  cat === c.id && !savedOnly
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-card border-amber-100/70 text-muted-foreground hover:border-amber-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-12">Loading opportunities…</div>
          ) : visible.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12 rounded-2xl border border-dashed border-amber-200/70 bg-amber-50/40">
              {savedOnly ? "Nothing saved yet. Tap the bookmark icon on an opportunity to save it." : "No opportunities yet in this category. Check back soon."}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visible.map((op) => (
                <OpportunityCard key={op.id} op={op} bookmarked={bookmarks.has(op.id)} />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}