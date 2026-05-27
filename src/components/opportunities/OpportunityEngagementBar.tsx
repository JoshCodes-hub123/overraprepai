import { Eye, MessageCircle, Bookmark } from "lucide-react";
import {
  REACTION_EMOJIS,
  useOpportunityReactions,
  useToggleOpportunityReaction,
  type ReactionEmoji,
} from "@/hooks/useOpportunityComments";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  opportunityId: string;
  viewCount: number;
  commentCount: number;
  bookmarkCount: number;
}

export default function OpportunityEngagementBar({
  opportunityId, viewCount, commentCount, bookmarkCount,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data } = useOpportunityReactions(opportunityId);
  const toggle = useToggleOpportunityReaction(opportunityId);
  const mine = data?.mine ?? null;
  const counts = data?.counts ?? {};

  const requireAuth = () => {
    if (!user) {
      toast.error("Sign in to react", { action: { label: "Sign in", onClick: () => navigate("/auth") } });
      return false;
    }
    return true;
  };

  return (
    <div className="mt-6 rounded-2xl border border-neutral-200/70 bg-white p-3 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-3 text-[12px] text-neutral-600">
        <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {viewCount.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {commentCount.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1"><Bookmark className="h-3.5 w-3.5" /> {bookmarkCount.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        {REACTION_EMOJIS.map((e) => {
          const active = mine === e;
          const n = counts[e] ?? 0;
          return (
            <button
              key={e}
              onClick={() => requireAuth() && toggle.mutate(e as ReactionEmoji)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[12px] transition-colors ${
                active
                  ? "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-amber-200"
              }`}
              aria-label={`React with ${e}`}
            >
              <span>{e}</span>
              {n > 0 && <span className="font-semibold tabular-nums">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}