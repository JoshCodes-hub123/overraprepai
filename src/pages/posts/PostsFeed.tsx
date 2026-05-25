import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Heart, MessageCircle, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { usePosts, type PostType } from "@/hooks/usePosts";
import { useAuth } from "@/hooks/useAuth";

const TABS: { id: PostType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "showcase", label: "Showcase" },
  { id: "opportunity", label: "Opportunities" },
  { id: "article", label: "Articles" },
  { id: "announcement", label: "News" },
];

const typeBadge: Record<PostType, string> = {
  showcase: "bg-violet-50 text-violet-800 border-violet-200",
  opportunity: "bg-amber-50 text-amber-800 border-amber-200",
  article: "bg-sky-50 text-sky-800 border-sky-200",
  announcement: "bg-rose-50 text-rose-800 border-rose-200",
};

export default function PostsFeed() {
  const [tab, setTab] = useState<PostType | "all">("all");
  const { user } = useAuth();
  const { data: posts = [], isLoading } = usePosts({ type: tab });

  return (
    <>
      <SEO title="Stories — OverraPrep" description="Talent showcases, opportunities and articles from the OverraPrep community." />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Stories & Opportunities</h1>
            {user && (
              <Link to="/posts/new"
                className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold px-3 py-1.5">
                <Plus className="h-3.5 w-3.5" /> New
              </Link>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-3xl">
          <p className="text-[12.5px] text-muted-foreground mb-3">
            Showcase talent, share opportunities and read stories from across the OverraPrep community.
          </p>

          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`shrink-0 text-[12px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md border transition-colors ${
                  tab === t.id
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-card border-amber-100/70 text-muted-foreground hover:border-amber-200"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-amber-200/70 bg-amber-50/40">
              <Sparkles className="h-6 w-6 mx-auto text-amber-500 mb-2" />
              <p className="text-sm text-muted-foreground">Nothing here yet. Be the first to post!</p>
              {user && (
                <Link to="/posts/new" className="inline-block mt-3 text-amber-700 font-semibold text-sm hover:underline">
                  Compose a post →
                </Link>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {posts.map((p) => (
                <Link key={p.id} to={`/posts/${p.id}`}
                  className="group rounded-2xl overflow-hidden border border-amber-100/70 bg-card hover:shadow-md transition-shadow">
                  {p.cover_image_url ? (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img src={p.cover_image_url} alt={p.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-amber-100 via-amber-50 to-white" />
                  )}
                  <div className="p-3.5">
                    <span className={`inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeBadge[p.type]}`}>
                      {p.type}
                    </span>
                    <h3 className="font-display font-bold text-[15px] leading-snug mt-1.5 line-clamp-2">{p.title}</h3>
                    {p.subtitle && <p className="text-[12.5px] text-muted-foreground line-clamp-2 mt-0.5">{p.subtitle}</p>}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="text-[11.5px] text-muted-foreground truncate">
                        {p.author?.full_name || "Anonymous"}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-0.5"><Heart className="h-3 w-3" /> {p.like_count}</span>
                        <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {p.comment_count}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}