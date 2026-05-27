import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAllChallenges, type Challenge } from "@/hooks/useChallenges";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

const GOAL_TYPES = [
  { value: "study_days", label: "Study days (any quiz/day)" },
  { value: "quizzes", label: "Quizzes completed" },
  { value: "flashcards", label: "Flashcards reviewed" },
  { value: "audio_sessions", label: "Audio sessions completed" },
  { value: "early_revision", label: "Early revision (manual)" },
];

const ICONS = ["flame", "trophy", "zap", "headphones", "clock", "target", "award"];

type Form = Partial<Challenge> & { slug: string; title: string };

const blank: Form = {
  slug: "",
  title: "",
  description: "",
  icon: "target",
  goal_type: "quizzes",
  goal_target: 5,
  duration_days: 7,
  reward_tokens: 10,
  badge_slug: "",
  is_active: true,
  sort_order: 99,
};

export default function AdminChallenges() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: challenges = [] } = useAllChallenges();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [form, setForm] = useState<Form>(blank);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        description: form.description ?? "",
        icon: form.icon ?? "target",
        goal_type: form.goal_type,
        goal_target: Number(form.goal_target) || 1,
        duration_days: Number(form.duration_days) || 7,
        reward_tokens: Number(form.reward_tokens) || 0,
        badge_slug: form.badge_slug || null,
        is_active: form.is_active ?? true,
        sort_order: Number(form.sort_order) || 99,
      };
      if (editing) {
        const { error } = await (supabase as any).from("challenges").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("challenges").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Challenge updated" : "Challenge created");
      setOpen(false);
      setEditing(null);
      setForm(blank);
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Challenge) => {
      const { error } = await (supabase as any)
        .from("challenges")
        .update({ is_active: !c.is_active })
        .eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenges"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const startEdit = (c: Challenge) => {
    setEditing(c);
    setForm({
      slug: c.slug,
      title: c.title,
      description: c.description,
      icon: c.icon,
      goal_type: c.goal_type,
      goal_target: c.goal_target,
      duration_days: c.duration_days,
      reward_tokens: c.reward_tokens,
      badge_slug: c.badge_slug ?? "",
      is_active: c.is_active,
      sort_order: c.sort_order,
    });
    setOpen(true);
  };

  return (
    <>
      <SEO title="Admin · Challenges" description="Manage student challenges" noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-tight">Challenges</h1>
              <p className="text-sm text-muted-foreground">Curate weekly goals students can opt into.</p>
            </div>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setForm(blank); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Plus className="h-4 w-4 mr-1" /> New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editing ? "Edit challenge" : "New challenge"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="slug-here" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={!!editing} />
                    <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <Textarea placeholder="Short description" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={form.goal_type}
                      onChange={(e) => setForm({ ...form, goal_type: e.target.value })}
                    >
                      {GOAL_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    >
                      {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" placeholder="Target" value={form.goal_target ?? 0} onChange={(e) => setForm({ ...form, goal_target: Number(e.target.value) })} />
                    <Input type="number" placeholder="Days" value={form.duration_days ?? 7} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
                    <Input type="number" placeholder="Tokens" value={form.reward_tokens ?? 0} onChange={(e) => setForm({ ...form, reward_tokens: Number(e.target.value) })} />
                  </div>
                  <Input placeholder="Badge slug (optional)" value={form.badge_slug ?? ""} onChange={(e) => setForm({ ...form, badge_slug: e.target.value })} />
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Active</label>
                    <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  </div>
                  <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !form.slug || !form.title}>
                    {save.isPending ? "Saving…" : editing ? "Save changes" : "Create challenge"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            {challenges.map((c) => (
              <Card key={c.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{c.title}</span>
                    {c.is_seeded && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">seeded</span>}
                    {!c.is_active && <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">paused</span>}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {c.goal_type} · target {c.goal_target} · {c.duration_days}d · {c.reward_tokens} tokens
                  </div>
                </div>
                <Switch checked={c.is_active} onCheckedChange={() => toggleActive.mutate(c)} />
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Delete "${c.title}"?`)) remove.mutate(c.id); }}>
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}