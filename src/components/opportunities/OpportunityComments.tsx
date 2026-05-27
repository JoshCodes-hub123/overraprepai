import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { CornerDownRight, Send, Trash2, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddOpportunityComment,
  useDeleteOpportunityComment,
  useOpportunityComments,
  type OppComment,
} from "@/hooks/useOpportunityComments";

interface Props { opportunityId: string }

export default function OpportunityComments({ opportunityId }: Props) {
  const { user } = useAuth();
  const { data: comments = [], isLoading } = useOpportunityComments(opportunityId);
  const add = useAddOpportunityComment(opportunityId);
  const del = useDeleteOpportunityComment(opportunityId);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const { roots, byParent } = useMemo(() => {
    const roots: OppComment[] = [];
    const byParent: Record<string, OppComment[]> = {};
    for (const c of comments) {
      if (c.parent_id) {
        (byParent[c.parent_id] ||= []).push(c);
      } else {
        roots.push(c);
      }
    }
    return { roots, byParent };
  }, [comments]);

  const submitRoot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    add.mutate({ body: draft }, { onSuccess: () => setDraft("") });
  };

  const submitReply = (parentId: string) => {
    if (!replyDraft.trim()) return;
    add.mutate(
      { body: replyDraft, parentId },
      { onSuccess: () => { setReplyDraft(""); setReplyTo(null); } },
    );
  };

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-4 w-4 text-amber-600" />
        <h2 className="text-[11px] font-bold tracking-[0.22em] uppercase text-neutral-500">
          Discussion · {comments.length}
        </h2>
      </div>

      {user ? (
        <form onSubmit={submitRoot} className="rounded-2xl border border-amber-100 bg-white p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={2}
            placeholder="Share a thought, tip, or question…"
            className="w-full resize-none bg-transparent text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">{draft.length}/2000 · be respectful</span>
            <button
              type="submit"
              disabled={!draft.trim() || add.isPending}
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

      <div className="mt-4 space-y-3">
        {isLoading && <p className="text-xs text-muted-foreground">Loading comments…</p>}
        {!isLoading && roots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Be the first to comment.</p>
        )}
        {roots.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            replies={byParent[c.id] ?? []}
            currentUserId={user?.id}
            onReply={() => { setReplyTo(c.id); setReplyDraft(""); }}
            onDelete={(id) => del.mutate(id)}
            replyOpen={replyTo === c.id}
            replyDraft={replyDraft}
            setReplyDraft={setReplyDraft}
            onSubmitReply={() => submitReply(c.id)}
            onCancelReply={() => setReplyTo(null)}
            posting={add.isPending}
          />
        ))}
      </div>
    </section>
  );
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  if (url) return <img src={url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />;
  return (
    <div className="h-7 w-7 rounded-full bg-amber-100 text-amber-700 grid place-items-center text-[11px] font-bold shrink-0">
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

function CommentItem({
  comment, replies, currentUserId, onReply, onDelete,
  replyOpen, replyDraft, setReplyDraft, onSubmitReply, onCancelReply, posting,
}: {
  comment: OppComment;
  replies: OppComment[];
  currentUserId?: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  replyOpen: boolean;
  replyDraft: string;
  setReplyDraft: (s: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  posting: boolean;
}) {
  const mine = currentUserId === comment.author_id;
  return (
    <div className="rounded-xl border border-neutral-200/70 bg-white p-3">
      <div className="flex items-start gap-2">
        <Avatar url={comment.author_avatar} name={comment.author_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-neutral-800 truncate">{comment.author_name}</p>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-neutral-700 mt-1 whitespace-pre-wrap break-words">{comment.body}</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={onReply} className="text-[11px] font-semibold text-amber-700 hover:underline inline-flex items-center gap-1">
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
            {mine && (
              <button onClick={() => onDelete(comment.id)} className="text-[11px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {replyOpen && (
        <div className="mt-2 pl-9">
          <textarea
            autoFocus
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Write a reply…"
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-2 text-sm focus:outline-none focus:border-amber-300"
          />
          <div className="flex items-center justify-end gap-2 mt-1.5">
            <button onClick={onCancelReply} className="text-[11px] font-semibold text-muted-foreground hover:underline">Cancel</button>
            <button
              onClick={onSubmitReply}
              disabled={!replyDraft.trim() || posting}
              className="inline-flex items-center gap-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[11px] font-bold px-2.5 py-1 rounded-md"
            >
              <Send className="h-3 w-3" /> Reply
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div className="mt-3 pl-9 space-y-2 border-l border-amber-100 ml-3">
          {replies.map((r) => (
            <div key={r.id} className="flex items-start gap-2 pl-2">
              <Avatar url={r.author_avatar} name={r.author_name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-bold text-neutral-800 truncate">{r.author_name}</p>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-neutral-700 mt-0.5 whitespace-pre-wrap break-words">{r.body}</p>
                {currentUserId === r.author_id && (
                  <button onClick={() => onDelete(r.id)} className="mt-1 text-[10px] font-semibold text-rose-600 hover:underline inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}