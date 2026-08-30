import { Link } from "react-router-dom";
import { Bookmark, Newspaper } from "lucide-react";

import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import { BookmarkArticleButton } from "@/components/posts/BookmarkArticleButton";
import { useSavedPosts } from "@/hooks/usePosts";

function readTime(body: string) {
  const words = (body ?? "").trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/** The student's personal reading list of saved articles. */
const SavedArticles = () => {
  const { data: posts = [], isLoading } = useSavedPosts();

  return (
    <>
      <SEO title="Saved articles" description="Articles you bookmarked to read later." noindex />
      <Screen>
        <ScreenHeader
          chip={
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">Library</span>
          }
          title="Saved articles"
          subtitle="Everything you bookmarked, ready when you are."
        />

        {isLoading ? (
          <div className="space-y-3">
            <BrandSkeleton h={96} />
            <BrandSkeleton h={96} />
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-5 w-5" />}
            title="Nothing saved yet"
            description="Tap the bookmark icon on any article to keep it here for later."
            action={<BrandButton to="/posts">Browse articles</BrandButton>}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/posts/${p.id}`}
                className="flex gap-3 overflow-hidden rounded-3xl border border-brand-line bg-brand-surface p-3 transition-all hover:-translate-y-0.5 hover:bg-brand-soft"
              >
                <span className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-env-soft">
                  {p.cover_image_url ? (
                    <img
                      src={p.cover_image_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Newspaper className="h-6 w-6 text-env" aria-hidden />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block font-display text-[15px] font-semibold leading-snug tracking-tight text-brand-ink">
                    {p.title}
                  </span>
                  <span className="mt-1 block truncate text-[12.5px] font-medium text-brand-ink-soft">
                    {p.author?.full_name ?? p.organization ?? "OverraPrep"} · {readTime(p.body)}
                  </span>
                </span>
                <BookmarkArticleButton postId={p.id} className="self-start" />
              </Link>
            ))}
          </div>
        )}
      </Screen>
    </>
  );
};

export default SavedArticles;
