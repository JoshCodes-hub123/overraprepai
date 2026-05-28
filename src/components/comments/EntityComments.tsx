import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface EntityCommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}
interface AuthorMini { id: string; full_name: string | null; avatar_url: string | null; profile_image_url: string | null; }

interface Props {
  entityType: string;
  entityId: string;
  title?: string;
}

/**
 * Universal comments thread backed by `entity_comments`.
 * Drop under any opportunity/announcement/spotlight/preview section.
 */
export default function EntityComments({ entityType, entityId, title = "Discussion" }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<EntityCommentRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, AuthorMini>>({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("entity_comments")
      .select("id, user_id, body, created_at")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as EntityCommentRow[];
    setRows(list);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, profile_image_url")
        .in("id", ids);
      const m: Record<string, AuthorMini> = {};
      (profs ?? []).forEach((p: any) => { m[p.id] = p; });
      setAuthors(m);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`ec-${entityType}-${entityId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "entity_comments", filter: `entity_id=eq.${entityId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, entityId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { toast.error("Sign in to comment"); return; }
    const body = draft.trim();
    if (!body) return;
    if (body.length > 2000) { toast.error("Max 2000 chars"); return; }
    setPosting(true);
    const { error } = await (supabase as any)
      .from("entity_comments")
      .insert({ entity_type: entityType, entity_id: entityId, user_id: user.id, body });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    setDraft("");
  };

  const del = async (id: string) => {
    const { error } = await (supabase as any).from("entity_comments").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-amber-600" />
        <h2 className="text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
          {title} · {rows.length}
        </h2>
      </div>

      {user ? (
        <form onSubmit={submit} className="rounded-2xl border border-amber-100 bg-white p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Share a thought…"
            className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">{draft.length}/2000</span>
            <button
              type="submit"
              disabled={!draft.trim() || posting}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg"
            >
              <Send className="h-3.5 w-3.5" /> Post
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-amber-200 bg-amber-50/40 p-3">
          Sign in to join the discussion.
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Be the first to comment.</p>
        )}
        {rows.map((c) => {
          const a = authors[c.user_id];
          const name = a?.full_name || "Student";
          const avatar = a?.avatar_url || a?.profile_image_url || null;
          return (
            <div key={c.id} className="rounded-xl border border-neutral-200/70 bg-white p-3">
              <div className="flex items-start gap-2">
                {avatar ? (
                  <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 grid place-items-center text-[11px] font-bold shrink-0">
                    {name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-neutral-800 truncate">{name}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                  {user?.id === c.user_id && (
                    <button onClick={() => del(c.id)} className="mt-1.5 text-[11px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}