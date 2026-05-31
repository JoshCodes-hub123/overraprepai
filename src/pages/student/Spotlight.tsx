import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, ExternalLink } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useSpotlights } from "@/hooks/useSpotlights";
import { useAuth } from "@/hooks/useAuth";

const CAT_LABEL: Record<string, string> = {
  graduating: "Top Graduate",
  innovator: "Innovator",
  hackathon: "Hackathon Winner",
  scholarship: "Scholarship Winner",
  top_performer: "Top Performer",
};

export default function Spotlight() {
  const { data: items = [], isLoading } = useSpotlights();
  const navigate = useNavigate();
  const { primaryRole } = useAuth();
  const home =
    primaryRole === "admin" ? "/admin/dashboard"
    : primaryRole === "tutor" ? "/tutor/dashboard"
    : (primaryRole as any) === "school_owner" ? "/school/dashboard"
    : (primaryRole as any) === "parent" ? "/parent/dashboard"
    : "/student/dashboard";

  return (
    <>
      <SEO title="Student Spotlight — OverraPrep AI" description="Celebrating outstanding students." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => navigate(home)} className="text-muted-foreground" aria-label="Back to dashboard"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-display text-base font-bold">Student Spotlight</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-5 max-w-3xl">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-12 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No spotlights yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {items.map((s) => (
                <article key={s.id} className="rounded-2xl border border-amber-100/70 bg-card overflow-hidden">
                  {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-36 object-cover" />}
                  <div className="p-4">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/70 text-amber-800">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-500"/> {CAT_LABEL[s.category] ?? s.category}
                    </span>
                    <h3 className="font-display text-[15px] font-bold mt-2 leading-snug">{s.title}</h3>
                    {s.summary && <p className="text-[12.5px] text-muted-foreground mt-1">{s.summary}</p>}
                    {s.link_url && (
                      <a href={s.link_url} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-amber-700 hover:text-amber-800">
                        Read more <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}