import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { AdminPersistentHeader } from "@/components/admin/AdminPersistentHeader";

const ACTIONS = ["", "tutor_status_change", "revoke_all_sessions", "suspicious_purchase_burst", "role_switch", "role_blocked"];

export default function AdminAudit() {
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-audit", action, q],
    queryFn: async () => {
      let req: any = (supabase.from as any)("audit_logs")
        .select("id, action, admin_id, table_name, record_id, new_data, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (action) req = req.eq("action", action);
      const { data, error } = await req;
      if (error) throw error;
      const list = data ?? [];
      if (!q) return list;
      const needle = q.toLowerCase();
      return list.filter((r: any) =>
        JSON.stringify(r.new_data ?? {}).toLowerCase().includes(needle) ||
        (r.action ?? "").toLowerCase().includes(needle) ||
        (r.record_id ?? "").toLowerCase().includes(needle));
    },
  });

  return (
    <>
      <SEO title="Admin · Audit logs" description="Search admin audit trail" />
      <div className="min-h-screen bg-background pb-16">
        <AdminPersistentHeader showNavStrip={true} />
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold">Audit logs</h1>
          </div>
        </header>
        <main className="container mx-auto px-4 py-5 max-w-4xl">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search action, record id, JSON…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="border rounded-md h-10 px-3 text-sm bg-background"
              value={action} onChange={(e) => setAction(e.target.value)}>
              {ACTIONS.map(a => <option key={a} value={a}>{a || "All actions"}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-amber-100/70 bg-card divide-y divide-amber-50">
            {isLoading && <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>}
            {!isLoading && rows.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No events.</div>}
            {rows.map((r: any) => (
              <details key={r.id} className="p-3 group">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{r.action}</div>
                    <div className="text-[11.5px] text-muted-foreground truncate">
                      {r.table_name} · {r.record_id?.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                </summary>
                <pre className="mt-2 text-[11px] bg-amber-50/40 border border-amber-100/60 rounded-md p-2 overflow-x-auto">
{JSON.stringify(r.new_data, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}