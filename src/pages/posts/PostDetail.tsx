import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Bookmark, Share2, ExternalLink, Send } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePost, usePostLike, usePostBookmark, usePostComments } from "@/hooks/usePosts";
import { toast } from "sonner";

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: post, isLoading } = usePost(id);
  const { liked, toggle: toggleLike } = usePostLike(id);
  const { bookmarked, toggle: toggleBookmark } = usePostBookmark(id);
  const { data: comments = [] } = usePostComments(id);
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Sign in to comment");
      const { error } = await (supabase.from as any)("post_comments")
        .insert({ post_id: id, author_id: user.id, body: comment.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["post-comments", id] });
      qc.invalidateQueries({ queryKey: ["post", id] });
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const share = async () => {
    const url = window.location.href;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: post?.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm text-muted-foreground">This post isn't available.</p>
      <Link to="/feed" className="text-amber-700 font-semibold text-sm hover:underline">Back to Stories</Link>
    </div>
  );

  const authorName = post.author?.full_name || "OverraPrep";
  const isOpportunity = post.type === "opportunity";

  return (
    <>
      <SEO title={`${post.title} — OverraPrep`} description={post.subtitle || post.title} />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/feed" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-sm font-bold truncate">{post.title}</h1>
            <button onClick={share} className="ml-auto text-muted-foreground hover:text-foreground">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </header>

        <article className="container mx-auto px-4 py-6 max-w-2xl">
          {post.cover_image_url && (
            <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-muted mb-5">
              <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          <span className="inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">
            {post.type}
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold leading-tight mt-2">{post.title}</h1>
          {post.subtitle && <p className="text-base text-muted-foreground mt-1">{post.subtitle}</p>}

          <div className="flex items-center gap-2 mt-4 mb-5">
            <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 font-semibold">
              {authorName[0]?.toUpperCase()}
            </div>
            <div className="text-[12.5px]">
              <div className="font-semibold">{authorName}</div>
              <div className="text-muted-foreground">{new Date(post.published_at || post.created_at).toLocaleDateString()}</div>
            </div>
          </div>

          {isOpportunity && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 mb-5 text-[12.5px] space-y-1">
              {post.organization && <div><span className="font-semibold">Organization:</span> {post.organization}</div>}
              {post.category && <div><span className="font-semibold">Category:</span> {post.category}</div>}
              {post.deadline && <div><span className="font-semibold">Deadline:</span> {new Date(post.deadline).toLocaleDateString()}</div>}
              {post.apply_url && (
                <a href={post.apply_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-700 font-semibold hover:underline mt-1">
                  Apply now <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          <div className="prose prose-sm sm:prose-base max-w-none prose-headings:font-display prose-img:rounded-xl prose-img:my-4 prose-a:text-amber-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body || ""}</ReactMarkdown>
          </div>

          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5">
              {post.tags.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">#{t}</span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-amber-100/70">
            <Button variant="outline" size="sm" onClick={() => toggleLike.mutate()}
              className={liked ? "border-rose-300 text-rose-600 bg-rose-50" : ""}>
              <Heart className={`h-4 w-4 mr-1.5 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
              {post.like_count}
            </Button>
            <Button variant="outline" size="sm" onClick={() => toggleBookmark.mutate()}
              className={bookmarked ? "border-amber-300 text-amber-700 bg-amber-50" : ""}>
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-amber-500 text-amber-600" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <section className="mt-8">
            <h2 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Comments ({post.comment_count})
            </h2>
            {user ? (
              <div className="flex items-start gap-2">
                <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment…" className="flex-1" />
                <Button size="sm" onClick={() => addComment.mutate()}
                  disabled={!comment.trim() || addComment.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link to="/auth" className="text-amber-700 font-semibold hover:underline">Sign in</Link> to comment.
              </p>
            )}
            <div className="space-y-3 mt-4">
              {comments.map((c: any) => (
                <div key={c.id} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30">
                  <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-900 font-semibold text-sm shrink-0">
                    {(c.author?.full_name || "U")[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold">{c.author?.full_name || "Member"}</div>
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Be the first to comment.</p>}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}