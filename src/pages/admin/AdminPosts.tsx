import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePendingPosts, usePosts } from "@/hooks/usePosts";
import { toast } from "sonner";

export default function AdminPosts() {
  const { data: pending = [] } = usePendingPosts();
  const { data: published = [] } = usePosts({ type: "all" });
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["posts-pending"] });
    qc.invalidateQueries({ queryKey: ["posts-feed"] });
  };

  const publish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("posts").update({ status: "published" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Published"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const unpublish = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)("posts").update({ status: "archived" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Archived"); invalidate(); },
  });

  return (
    <>
      <SEO title="Admin · Posts" description="Review and publish posts" />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Posts & Stories</h1>
            <Link to="/posts/new" className="ml-auto text-[12px] font-semibold text-amber-700 hover:underline">+ Compose</Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <section>
            <h2 className="font-display font-bold text-lg mb-3">Awaiting review ({pending.length})</h2>
            <div className="space-y-2 mb-8">
              {pending.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border border-amber-200/80 bg-amber-50/40">
                  <div className="flex items-start gap-3">
                    {p.cover_image_url && <img src={p.cover_image_url} className="h-14 w-20 object-cover rounded" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold truncate">{p.title}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {p.type} · by {p.author?.full_name || "Member"} · {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Link to={`/posts/${p.id}`} className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 py-1 rounded border border-amber-200 text-amber-800 hover:bg-amber-50">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </Link>
                    <Button size="sm" onClick={() => publish.mutate(p.id)} className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white">
                      <Check className="h-3.5 w-3.5 mr-1" /> Publish
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove.mutate(p.id)} className="h-7 text-rose-600 border-rose-200 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {pending.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Nothing pending.</p>}
            </div>
          </section>

          <section>
            <h2 className="font-display font-bold text-lg mb-3">Published ({published.length})</h2>
            <div className="space-y-2">
              {published.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-100/70 bg-card">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{p.title}</div>
                    <div className="text-[11.5px] text-muted-foreground">{p.type} · {p.like_count} likes · {p.comment_count} comments</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link to={`/posts/${p.id}`} className="p-1 text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></Link>
                    <button onClick={() => unpublish.mutate(p.id)} className="text-[11px] font-semibold px-2 py-1 rounded border border-amber-200 text-amber-800 hover:bg-amber-50">Archive</button>
                    <button onClick={() => remove.mutate(p.id)} className="text-rose-600 hover:text-rose-700 p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
              {published.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No published posts yet.</p>}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}