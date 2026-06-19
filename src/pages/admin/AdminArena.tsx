import { useState } from "react";
import { format } from "date-fns";
import { Trophy, Plus, Play, Square, Sparkles, ShieldOff } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminArenaChallenges,
  useUpsertArenaChallenge,
  usePublishArenaChallenge,
  useSettleArenaChallenge,
  useEndArenaChallenge,
  useArenaLeaderboard,
  useDisqualifyArenaEntry,
  type ArenaChallenge,
} from "@/hooks/useArena";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ended: "bg-amber-50 text-amber-700 border-amber-200",
  settled: "bg-purple-50 text-purple-700 border-purple-200",
};

const empty = (): Partial<ArenaChallenge> => ({
  kind: "daily",
  title: "",
  description: "",
  entry_token_cost: 1,
  prize_pool_tokens: 10,
  num_questions: 10,
  time_limit_seconds: 600,
  featured: false,
  payout_split: { "1": 0.5, "2": 0.3, "3": 0.2 } as any,
  starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
});

export default function AdminArena() {
  const { data: list = [], isLoading } = useAdminArenaChallenges();
  const [editing, setEditing] = useState<Partial<ArenaChallenge> | null>(null);
  const [participantsFor, setParticipantsFor] = useState<ArenaChallenge | null>(null);
  const upsert = useUpsertArenaChallenge();
  const publish = usePublishArenaChallenge();
  const settle = useSettleArenaChallenge();
  const endIt = useEndArenaChallenge();

  return (
    <>
      <SEO title="Arena · Admin" noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-5xl">
          <PremiumPageHero
            eyebrow="ADMIN"
            title="Challenge Arena"
            subtitle="Create competitions, freeze question sets, end and settle."
            icon={Trophy}
            back="/admin/dashboard"
            right={
              <Button onClick={() => setEditing(empty())} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="h-4 w-4 mr-1.5" /> New challenge
              </Button>
            }
          />

          <div className="mt-5 space-y-3">
            {isLoading && <Card className="p-6 text-sm text-muted-foreground animate-pulse">Loading…</Card>}
            {!isLoading && list.length === 0 && (
              <Card className="p-8 text-center text-sm text-neutral-500 border-dashed border-amber-200">
                No arena challenges yet. Create one to get started.
              </Card>
            )}
            {list.map((c) => (
              <Card key={c.id} className="p-4 border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("uppercase text-[10px] font-bold tracking-wider border", STATUS_COLOR[c.status])}>
                        {c.status}
                      </Badge>
                      <Badge variant="outline" className="border-amber-300 text-amber-800 text-[10px] uppercase tracking-wider">
                        {c.kind}
                      </Badge>
                      {c.featured && (
                        <Badge className="bg-gradient-to-r from-amber-400 to-amber-600 text-white border-0">
                          <Sparkles className="h-3 w-3 mr-1" /> Featured
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-display text-base font-extrabold mt-1.5 text-neutral-900">{c.title}</h3>
                    <div className="text-[11.5px] text-neutral-500 mt-0.5">
                      Prize {c.prize_pool_tokens} · Entry {c.entry_token_cost} · {c.num_questions} Qs · {Math.round(c.time_limit_seconds/60)}m
                      <br />
                      {format(new Date(c.starts_at), "MMM d, HH:mm")} → {format(new Date(c.ends_at), "MMM d, HH:mm")}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => setParticipantsFor(c)}>Participants</Button>
                    {c.status === "draft" || c.status === "scheduled" ? (
                      <Button size="sm" onClick={() => publish.mutate(c.id)} disabled={publish.isPending} className="bg-amber-500 hover:bg-amber-600 text-white">
                        <Play className="h-3.5 w-3.5 mr-1.5" /> Publish
                      </Button>
                    ) : null}
                    {c.status === "live" && (
                      <Button size="sm" variant="outline" onClick={() => endIt.mutate(c.id)} disabled={endIt.isPending}>
                        <Square className="h-3.5 w-3.5 mr-1.5" /> Force end
                      </Button>
                    )}
                    {(c.status === "ended" || c.status === "live") && (
                      <Button size="sm" onClick={() => settle.mutate(c.id)} disabled={settle.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Trophy className="h-3.5 w-3.5 mr-1.5" /> Settle
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>

      <EditDialog
        open={!!editing}
        value={editing}
        onClose={() => setEditing(null)}
        onSave={async (payload) => {
          await upsert.mutateAsync(payload);
          setEditing(null);
        }}
        saving={upsert.isPending}
      />

      <ParticipantsDialog challenge={participantsFor} onClose={() => setParticipantsFor(null)} />
    </>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditDialog({
  open, value, onClose, onSave, saving,
}: {
  open: boolean;
  value: Partial<ArenaChallenge> | null;
  onClose: () => void;
  onSave: (v: Partial<ArenaChallenge>) => Promise<void>;
  saving: boolean;
}) {
  const [v, setV] = useState<Partial<ArenaChallenge> | null>(value);
  if (open && v?.id !== value?.id) setV(value);

  const set = (patch: Partial<ArenaChallenge>) => setV((prev) => ({ ...(prev ?? {}), ...patch }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {v?.id ? "Edit challenge" : "New challenge"}
          </DialogTitle>
          <DialogDescription>Compose an academic competition for students.</DialogDescription>
        </DialogHeader>
        {v && (
          <div className="space-y-4 py-2">
            <div>
              <Label>Title</Label>
              <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Friday Physics Cup" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={v.description ?? ""} onChange={(e) => set({ description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kind</Label>
                <Select value={v.kind ?? "daily"} onValueChange={(val) => set({ kind: val as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Course ID (optional)</Label>
                <Input value={v.course_id ?? ""} onChange={(e) => set({ course_id: e.target.value || null })} placeholder="leave blank = all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Entry cost (tokens)</Label>
                <Input type="number" min={0} value={v.entry_token_cost ?? 0} onChange={(e) => set({ entry_token_cost: parseInt(e.target.value || "0") })} />
              </div>
              <div>
                <Label>Prize pool (tokens)</Label>
                <Input type="number" min={0} value={v.prize_pool_tokens ?? 0} onChange={(e) => set({ prize_pool_tokens: parseInt(e.target.value || "0") })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label># Questions</Label>
                <Input type="number" min={1} max={100} value={v.num_questions ?? 10} onChange={(e) => set({ num_questions: parseInt(e.target.value || "10") })} />
              </div>
              <div>
                <Label>Time limit (sec)</Label>
                <Input type="number" min={30} value={v.time_limit_seconds ?? 600} onChange={(e) => set({ time_limit_seconds: parseInt(e.target.value || "600") })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts at</Label>
                <Input type="datetime-local" value={toLocalInput(v.starts_at)} onChange={(e) => set({ starts_at: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <Label>Ends at</Label>
                <Input type="datetime-local" value={toLocalInput(v.ends_at)} onChange={(e) => set({ ends_at: new Date(e.target.value).toISOString() })} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={!!v.featured} onCheckedChange={(c) => set({ featured: c })} />
              <Label>Featured on dashboard</Label>
            </div>
            <div>
              <Label>Payout split (JSON, rank → share)</Label>
              <Textarea
                value={JSON.stringify(v.payout_split ?? {})}
                rows={2}
                onChange={(e) => {
                  try { set({ payout_split: JSON.parse(e.target.value) as any }); } catch {}
                }}
              />
              <p className="text-[11px] text-neutral-500 mt-1">Default: 50% / 30% / 20% for top 3.</p>
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => v && onSave(v)} disabled={saving || !v?.title} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ParticipantsDialog({
  challenge, onClose,
}: { challenge: ArenaChallenge | null; onClose: () => void }) {
  const { data: board = [] } = useArenaLeaderboard(challenge?.id, challenge?.status === "live");
  const dq = useDisqualifyArenaEntry();
  return (
    <Dialog open={!!challenge} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{challenge?.title}</DialogTitle>
          <DialogDescription>{board.length} entrants</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {board.length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
          {board.map((row: any) => (
            <div key={row.user_id} className="flex items-center gap-3 p-2 rounded-lg border border-neutral-200">
              <div className="w-7 text-center font-bold text-neutral-600">#{row.rank}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{row.full_name ?? "Anonymous"}</div>
                <div className="text-[11px] text-neutral-500">{row.score} correct · {row.accuracy}%</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => row.entry_id && dq.mutate(row.entry_id)}>
                <ShieldOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
