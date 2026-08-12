import { Link } from "react-router-dom";
import { Newspaper } from "lucide-react";
import type { Post } from "@/hooks/usePosts";

function readTime(body: string) {
  const words = (body ?? "").trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

/**
 * "Top articles today" — a compact, image-led strip. Cover image on top,
 * small typographic block underneath so the dashboard stays calm.
 */
export function TopArticlesStrip({ items }: { items: Post[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {items.map((p) => (
          <Link
            key={p.id}
            to={`/posts/${p.id}`}
            className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-3xl border border-brand-line bg-brand-surface transition-all hover:-translate-y-0.5 hover:bg-brand-soft"
          >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-env-soft">
              {p.cover_image_url ? (
                <img
                  src={p.cover_image_url}
                  alt={p.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <Newspaper className="h-8 w-8 text-env" aria-hidden />
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-tight text-brand-ink">
                {p.title}
              </p>
              <p className="mt-auto truncate pt-2 text-[12px] font-medium text-brand-ink-soft">
                {p.author?.full_name ?? p.organization ?? "OverraPrep"} · {readTime(p.body)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TopArticlesStrip;
