import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, ExternalLink, Bookmark, Check, Share2, Building2, MapPin, Award, Sparkles } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { SEO } from "@/components/seo/SEO";
import { useOpportunity, useOpportunityBookmarks, useToggleOpportunityBookmark, useOpportunities } from "@/hooks/useOpportunities";
import { useMyApplicationFor, useSetApplicationStatus, type AppStatus } from "@/hooks/useOpportunityApplications";
import { useAuth } from "@/hooks/useAuth";
import { OpportunityListItem } from "@/components/opportunities/OpportunityCard";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: op, isLoading } = useOpportunity(id);
  const { data: bookmarks = new Set<string>() } = useOpportunityBookmarks();
  const toggle = useToggleOpportunityBookmark();
  const { data: myApp } = useMyApplicationFor(id);
  const setStatus = useSetApplicationStatus();
  const { data: related = [] } = useOpportunities({ category: op?.category, limit: 4 });

  if (isLoading || !op) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-amber-400 animate-pulse" />
      </div>
    );
  }
  const isBookmarked = bookmarks.has(op.id);
  const status: AppStatus | null = (myApp?.status as AppStatus | undefined) ?? null;
  const STATUSES: { v: AppStatus; label: string }[] = [
    { v: "interested", label: "Interested" },
    { v: "applied", label: "Applied" },
    { v: "accepted", label: "Accepted" },
    { v: "rejected", label: "Rejected" },
  ];

  const requireAuth = (action: () => void, msg: string) => {
    if (!user) {
      toast.error(msg, { action: { label: "Sign in", onClick: () => navigate("/auth") } });
      return;
    }
    action();
  };

  const share = async () => {
    const url = window.location.href;
    const text = `${op.title} — ${op.organization} (via OverraPrep)`;
    if (navigator.share) {
      try { await navigator.share({ title: op.title, text, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't share");
    }
  };

  const daysLeft = op.deadline ? differenceInDays(new Date(op.deadline), new Date()) : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": op.category === "scholarship" ? "EducationalOccupationalProgram" : "JobPosting",
    name: op.title,
    description: op.description.slice(0, 500),
    datePosted: op.created_at,
    validThrough: op.deadline ?? undefined,
    hiringOrganization: { "@type": "Organization", name: op.organization },
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  return (
    <>
      <SEO title={`${op.title} — Opportunity Hub`} description={op.description.slice(0, 150)} url={typeof window !== "undefined" ? window.location.href : undefined} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-background">
        {/* Full-bleed hero */}
        <div className="relative">
          <div className="relative h-[44vh] min-h-[260px] max-h-[420px] bg-gradient-to-br from-amber-200 via-amber-100 to-white overflow-hidden">
            {op.cover_image_url && (
              <img src={op.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute top-3 left-3 z-10">
              <Link to="/opportunities" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur text-[12px] font-bold text-neutral-800 hover:bg-white">
                <ArrowLeft className="h-3.5 w-3.5" /> Hub
              </Link>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <div className="container mx-auto max-w-3xl">
                <span className="text-[10px] font-bold uppercase tracking-[0.22em] px-2.5 py-1 rounded-md bg-amber-500 text-white shadow-sm">
                  {op.category.replace("_", " ")}
                </span>
                <h1 className="font-display text-2xl sm:text-4xl font-bold text-white mt-3 leading-tight drop-shadow-md">
                  {op.title}
                </h1>
                <p className="text-white/90 text-sm sm:text-base mt-2 inline-flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> {op.organization}
                  {op.university && <><span className="opacity-60">·</span><MapPin className="h-3.5 w-3.5" /> {op.university}</>}
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-6 max-w-3xl">
          {/* Key facts strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 -mt-10 relative z-10 mb-6">
            <div className="rounded-2xl bg-white border border-amber-100 shadow-sm p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Deadline</div>
              <div className="text-[13px] font-bold text-neutral-800 mt-1">
                {op.deadline ? format(new Date(op.deadline), "MMM d, yyyy") : "Rolling"}
              </div>
              {daysLeft !== null && daysLeft >= 0 && (
                <div className={`text-[11px] mt-0.5 ${daysLeft <= 3 ? "text-rose-600 font-bold" : "text-muted-foreground"}`}>
                  {daysLeft === 0 ? "Today" : `${daysLeft} days left`}
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-white border border-amber-100 shadow-sm p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Organization</div>
              <div className="text-[13px] font-bold text-neutral-800 mt-1 truncate">{op.organization}</div>
            </div>
            <div className="rounded-2xl bg-white border border-amber-100 shadow-sm p-3 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Category</div>
              <div className="text-[13px] font-bold text-neutral-800 mt-1 capitalize">{op.category.replace("_", " ")}</div>
            </div>
          </div>

          {/* Action row */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {isSafeHttpUrl(op.apply_url) && (
              <a href={op.apply_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm shadow-md shadow-amber-200/60">
                Apply now <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => requireAuth(() => toggle.mutate({ id: op.id, current: isBookmarked }), "Sign in to save")}
              className="inline-flex items-center gap-2 border border-amber-200 bg-white px-4 py-2.5 rounded-xl text-sm font-bold text-amber-800 hover:bg-amber-50"
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-amber-500" : ""}`} />
              {isBookmarked ? "Saved" : "Save"}
            </button>
            <button
              onClick={share}
              className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-4 py-2.5 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-50"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>

          {/* Body */}
          <article className="prose prose-sm sm:prose-base prose-neutral max-w-none prose-headings:font-display prose-headings:font-bold prose-a:text-amber-700">
            <ReactMarkdown>{op.description}</ReactMarkdown>
          </article>

          {/* Application tracker */}
          {user ? (
            <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-amber-700" />
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Track your application</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => {
                  const active = status === s.v;
                  return (
                    <button key={s.v}
                      onClick={() => setStatus.mutate(
                        { opportunityId: op.id, status: s.v },
                        { onSuccess: () => toast.success(`Marked as ${s.label.toLowerCase()}`) },
                      )}
                      className={`text-[12px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border transition-colors inline-flex items-center gap-1 ${
                        active ? "bg-amber-500 border-amber-500 text-white"
                               : "bg-white border-amber-100 text-muted-foreground hover:border-amber-200"
                      }`}>
                      {active && <Check className="h-3 w-3" />} {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 text-center">
              <p className="text-sm font-semibold text-amber-900">Create a free account to save, comment, and track applications.</p>
              <button onClick={() => navigate("/auth")} className="mt-3 inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2 rounded-lg text-sm">
                Sign in / Sign up
              </button>
            </div>
          )}

          {/* Related */}
          {related.filter((r) => r.id !== op.id).slice(0, 3).length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="h-3 w-0.5 rounded-full bg-amber-500" />
                <h2 className="text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">More like this</h2>
              </div>
              <div className="grid gap-2">
                {related.filter((r) => r.id !== op.id).slice(0, 3).map((r) => (
                  <OpportunityListItem key={r.id} op={r} />
                ))}
              </div>
            </div>
          )}

          <div className="h-12" />
        </main>
      </div>
    </>
  );
}