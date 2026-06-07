import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Row {
  id: string; full_name: string | null; email: string | null;
  university: string | null; created_at: string;
  score?: number; devices?: number;
}

export default function AdminTrust() {
  const [minDevices, setMinDevices] = useState(2);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-trust", minDevices],
    queryFn: async () => {
      // Pull recent device-history records grouped by user
      const { data: hist } = await (supabase.from as any)("device_login_history")
        .select("user_id, id, last_active_at").order("last_active_at", { ascending: false }).limit(500);
      const grouped = new Map<string, number>();
      (hist ?? []).forEach((d: any) => grouped.set(d.user_id, (grouped.get(d.user_id) ?? 0) + 1));
      const userIds = Array.from(grouped.entries()).filter(([, n]) => n >= minDevices).map(([id]) => id).slice(0, 50);
      if (userIds.length === 0) return [];
      const { data: profiles } = await (supabase as any).rpc("admin_get_profile_contacts", { _ids: userIds });
      return (profiles ?? []).map((p: any) => ({ ...p, devices: grouped.get(p.id) ?? 0 })) as Row[];
    },
  });

  const revoke = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase as any).rpc("admin_revoke_all_sessions", { _user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-trust"] }); toast.success("Sessions revoked"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <>
      <SEO title="Admin · Trust" description="Trust score and device anomalies" />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Trust &amp; sessions</h1>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-4xl">
          <div className="flex items-center gap-2 mb-4 text-sm">
            <label className="text-muted-foreground">Min devices</label>
            <select className="border rounded-md h-9 px-2 bg-background"
              value={minDevices} onChange={(e) => setMinDevices(Number(e.target.value))}>
              {[1,2,3,5,8].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-amber-100/70 bg-card divide-y divide-amber-50">
            {isLoading && <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>}
            {!isLoading && rows.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No outliers right now.</div>}
            {rows.map((u) => (
              <div key={u.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate flex items-center gap-2">
                    {u.full_name ?? "Unknown"}
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200/70 text-amber-800">
                      <ShieldAlert className="h-3 w-3" /> {u.devices} devices
                    </span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{u.email} · {u.university ?? "—"}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => revoke.mutate(u.id)}>
                  <LogOut className="h-3.5 w-3.5 mr-1" /> Revoke
                </Button>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}