import { useState } from "react";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, CheckCircle2 } from "lucide-react";
import AdminReferralsPanel from "@/components/admin/AdminReferralsPanel";
import { useCampusBattles, useCreateBattle, useSettleBattle, usePromoteAmbassador, useAmbassadorLeaderboard, useUniversityRankings } from "@/hooks/useGrowth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminGrowth() {
  const { data: battles = [] } = useCampusBattles();
  const { data: amb = [] } = useAmbassadorLeaderboard();
  const { data: unis = [] } = useUniversityRankings();
  const create = useCreateBattle();
  const settle = useSettleBattle();
  const promote = usePromoteAmbassador();
  const [form, setForm] = useState<any>({ title: "", description: "", scope: "university", side_a: "", side_b: "", university_filter: "", ends_at: "", prize_summary: "" });
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteTier, setPromoteTier] = useState("rookie");

  const submit = () => {
    if (!form.title || !form.side_a || !form.side_b || !form.ends_at) return toast.error("Fill required fields");
    create.mutate({ ...form, ends_at: new Date(form.ends_at).toISOString() });
  };

  const doPromote = async () => {
    if (!promoteEmail) return;
    const { data } = await (supabase as any).from("profiles").select("id").eq("email", promoteEmail).maybeSingle();
    if (!data?.id) return toast.error("User not found");
    promote.mutate({ userId: data.id, tier: promoteTier });
  };

  return (
    <>
      <SEO title="Admin · Growth" description="Manage campus battles, ambassadors and growth analytics." url="https://overraprep.com/admin/growth" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="admin" />
        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <PremiumPageHero eyebrow="ADMIN" title="Growth Engine" subtitle="Battles, ambassadors and growth analytics." icon={Trophy} back />

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-600" /> Create Battle</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="university">University</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Side A</Label><Input value={form.side_a} onChange={(e) => setForm({ ...form, side_a: e.target.value })} placeholder="e.g. FUTA" /></div>
              <div><Label>Side B</Label><Input value={form.side_b} onChange={(e) => setForm({ ...form, side_b: e.target.value })} placeholder="e.g. OAU" /></div>
              {form.scope !== "university" && (
                <div><Label>University filter (optional)</Label><Input value={form.university_filter} onChange={(e) => setForm({ ...form, university_filter: e.target.value })} /></div>
              )}
              <div><Label>Ends at</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Prize summary</Label><Input value={form.prize_summary} onChange={(e) => setForm({ ...form, prize_summary: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <Button onClick={submit} disabled={create.isPending} className="mt-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white">Create battle</Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold mb-3">All battles</h2>
            <div className="divide-y">
              {battles.map((b: any) => (
                <div key={b.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.side_a} vs {b.side_b} · {b.status}</p>
                  </div>
                  {b.status !== "ended" && (
                    <Button size="sm" variant="outline" onClick={() => settle.mutate(b.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End & settle
                    </Button>
                  )}
                </div>
              ))}
              {battles.length === 0 && <p className="text-sm text-muted-foreground py-3">No battles yet.</p>}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold mb-3">Promote ambassador</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input placeholder="student email" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} />
              <Select value={promoteTier} onValueChange={setPromoteTier}>
                <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rookie">Rookie</SelectItem>
                  <SelectItem value="rising">Rising</SelectItem>
                  <SelectItem value="star">Star</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={doPromote} disabled={promote.isPending} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">Promote</Button>
            </div>
            <div className="divide-y mt-4">
              {amb.slice(0, 10).map((a) => (
                <div key={a.user_id} className="py-2 flex items-center justify-between text-sm">
                  <span>{a.full_name || a.user_id.slice(0, 8)} · <span className="text-muted-foreground">{a.tier}</span></span>
                  <span className="font-semibold text-amber-700">{Math.round(a.score)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-display text-lg font-bold mb-3">Growth analytics (30d)</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-muted-foreground">Universities</p><p className="text-2xl font-bold text-amber-700">{unis.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Active students</p><p className="text-2xl font-bold text-amber-700">{unis.reduce((a, u) => a + u.active_students, 0)}</p></div>
              <div><p className="text-xs text-muted-foreground">Arena entries</p><p className="text-2xl font-bold text-amber-700">{unis.reduce((a, u) => a + u.arena_count, 0)}</p></div>
            </div>
          </Card>

          <AdminReferralsPanel />
        </main>
      </div>
    </>
  );
}
