import { Bookmark } from "lucide-react";
import { usePostBookmark } from "@/hooks/usePosts";
import { cn } from "@/lib/utils";

/**
 * Small save-toggle for an article card. Stops the parent link from
 * navigating so a tap only bookmarks.
 */
export function BookmarkArticleButton({
  postId,
  className,
}: {
  postId: string;
  className?: string;
}) {
  const { bookmarked, toggle } = usePostBookmark(postId);
  return (
    <button
      type="button"
      aria-label={bookmarked ? "Remove from saved articles" : "Save article"}
      aria-pressed={bookmarked}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate();
      }}
      disabled={toggle.isPending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-line bg-brand-surface/90 backdrop-blur transition-colors",
        bookmarked && "border-env bg-env-soft text-env",
        className,
      )}
    >
      <Bookmark className={cn("h-4 w-4", bookmarked ? "fill-current text-env" : "text-brand-ink-soft")} aria-hidden />
    </button>
  );
}

export default BookmarkArticleButton;
