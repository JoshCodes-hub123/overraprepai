import { Link } from "react-router-dom";
import { Loader2, BookOpenCheck, Layers, Flame, Trophy, Sparkles, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRecentScoringActivity, type ScoringActivityRow } from "@/hooks/useLeaderboards";
import { resolveAvatarUrl } from "@/lib/avatar";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function describe(row: ScoringActivityRow): { Icon: any; tint: string; text: string } {
  const meta = row.meta || {};
  switch (row.verb) {
    case "quiz_completed":
    case "quiz_attempted":
      return {
        Icon: BookOpenCheck, tint: "text-emerald-600 bg-emerald-50",
        text: `finished a quiz${meta.score != null ? ` · ${Math.round(Number(meta.score))}%` : ""}`,
      };
    case "flashcard_reviewed":
    case "srs_reviewed":
      return {
        Icon: Layers, tint: "text-blue-600 bg-blue-50",
        text: `reviewed ${meta.count ?? ""} flashcard${(meta.count ?? 1) === 1 ? "" : "s"}`.trim(),
      };
    case "streak_updated":
    case "streak_milestone":
      return {
        Icon: Flame, tint: "text-orange-600 bg-orange-50",
        text: `hit a ${meta.streak ?? ""}-day streak`.replace(" -day", ""),
      };
    case "badge_earned":
      return { Icon: Award, tint: "text-amber-700 bg-amber-50", text: `earned the ${meta.badge ?? "new"} badge` };
    case "challenge_completed":
      return { Icon: Trophy, tint: "text-amber-700 bg-amber-50", text: `completed a challenge` };
    case "challenge_progress":
      return { Icon: Sparkles, tint: "text-amber-700 bg-amber-50", text: `made challenge progress` };
    default:
      return { Icon: Sparkles, tint: "text-muted-foreground bg-muted", text: row.verb.replace(/_/g, " ") };
  }
}

export function ScoringActivityFeed({ limit = 20 }: { limit?: number }) {
  const { data, isLoading, isError, error, refetch } = useRecentScoringActivity(limit);

  return (
    <div className="bg-card rounded-2xl border border-amber-100/70 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold">Recent activity</h3>
          <p className="text-[11px] text-muted-foreground">Actions that move students up the leaderboard.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-600" /></div>
      ) : isError ? (
        <div className="text-center py-8 px-2">
          <p className="text-sm font-semibold text-foreground">Couldn't load activity</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as any)?.message || "Please retry."}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900"
          >
            <Loader2 className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No scoring activity yet. Take a quiz or review flashcards to appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {data!.map((row) => {
            const { Icon, tint, text } = describe(row);
            return (
              <li key={row.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50/40 transition-colors">
                <Link to={row.actor_id ? `/profile/${row.actor_id}` : "#"} className="shrink-0">
                  <Avatar className="w-8 h-8 border border-amber-100">
                    <AvatarImage src={resolveAvatarUrl(row)} alt={row.full_name || ""} />
                    <AvatarFallback className="bg-amber-100 text-amber-800 text-xs font-semibold">
                      {row.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] leading-tight truncate">
                    <span className="font-semibold">{row.full_name || "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{text}</span>
                  </p>
                  <p className="text-[10.5px] text-muted-foreground mt-0.5">{timeAgo(row.created_at)}</p>
                </div>
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${tint}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ScoringActivityFeed;
