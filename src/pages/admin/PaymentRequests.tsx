import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, Download, Search, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/exportCsv";

const NAIRA_PER_TOKEN = 25;

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="p-4">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="font-display text-2xl font-extrabold mt-1">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </Card>
);

const AdminPayments = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [adjustOpen, setAdjustOpen] = useState<{ userId: string; name: string } | null>(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["admin-wallet-topups"],
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from("payment_transactions")
        .select("*")
        .eq("plan_id", "wallet_topup")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string))) as string[];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,email,ai_token_balance").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id) }));
    },
  });

  const filtered = useMemo(() => {
    return txs.filter((t: any) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.reference?.toLowerCase().includes(q) ||
        t.profile?.email?.toLowerCase().includes(q) ||
        t.profile?.full_name?.toLowerCase().includes(q)
      );
    });
  }, [txs, statusFilter, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const success = txs.filter((t: any) => t.status === "success");
    const sumKobo = (rows: any[]) => rows.reduce((s, r) => s + (r.amount_cents || 0), 0);
    return {
      today: `₦${(sumKobo(success.filter((t: any) => new Date(t.created_at) >= todayStart)) / 100).toLocaleString()}`,
      week: `₦${(sumKobo(success.filter((t: any) => new Date(t.created_at) >= weekStart)) / 100).toLocaleString()}`,
      month: `₦${(sumKobo(success.filter((t: any) => new Date(t.created_at) >= monthStart)) / 100).toLocaleString()}`,
      total: `₦${(sumKobo(success) / 100).toLocaleString()}`,
      count: success.length.toString(),
    };
  }, [txs]);

  const adjust = async () => {
    if (!adjustOpen || !adjustDelta) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("admin_adjust_wallet", {
        _user_id: adjustOpen.userId,
        _delta_tokens: adjustDelta,
        _reason: adjustReason || null,
      });
      if (error) throw error;
      if (data && !data.ok) throw new Error(data.error || "Adjust failed");
      toast.success(`Wallet adjusted by ${adjustDelta > 0 ? "+" : ""}${adjustDelta}`);
      setAdjustOpen(null); setAdjustDelta(0); setAdjustReason("");
      qc.invalidateQueries({ queryKey: ["admin-wallet-topups"] });
    } catch (e: any) {
      toast.error(e?.message || "Adjust failed");
    } finally { setBusy(false); }
  };

  const downloadCsv = () => {
    exportToCsv(
      filtered.map((t: any) => ({
        date: format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
        student: t.profile?.full_name || "",
        email: t.profile?.email || "",
        amount_ngn: (t.amount_cents / 100).toFixed(2),
        tokens: Math.floor((t.amount_cents / 100) / NAIRA_PER_TOKEN),
        status: t.status,
        reference: t.reference,
      })),
      "wallet-topups.csv",
    );
  };

  return (
    <>
      <SEO title="Payments" description="Wallet top-ups and revenue." url="https://overraprepai.com/admin/payments" noindex />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="admin" />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-amber-500" /> Wallet top-ups
            </h1>
            <Button size="sm" variant="outline" onClick={downloadCsv} disabled={!filtered.length}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Stat label="Today" value={stats.today} sub="Successful" />
            <Stat label="This week" value={stats.week} sub="Successful" />
            <Stat label="This month" value={stats.month} sub="Successful" />
            <Stat label="All-time revenue" value={stats.total} sub="Successful" />
            <Stat label="Charges" value={stats.count} sub="Successful count" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, reference" className="pl-8 h-9" />
            </div>
            {(["all","success","pending","failed"] as const).map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="h-9 capitalize">
                {s}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Loading…</Card>
            ) : filtered.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">No transactions match the filter.</Card>
            ) : (
              filtered.map((t: any) => {
                const tokens = Math.floor((t.amount_cents / 100) / NAIRA_PER_TOKEN);
                return (
                  <Card key={t.id} className="p-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">
                        {t.profile?.full_name || t.profile?.email || t.user_id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t.profile?.email}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <Badge variant="outline">₦{(t.amount_cents / 100).toLocaleString()}</Badge>
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                          <Zap className="h-3 w-3 mr-1" />{tokens} tokens
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            t.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            t.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-rose-50 text-rose-700 border-rose-200"
                          }
                        >
                          {t.status}
                        </Badge>
                        <span className="text-muted-foreground">Ref {t.reference}</span>
                        <span className="text-muted-foreground">{format(new Date(t.created_at), "MMM d, HH:mm")}</span>
                        {typeof t.profile?.ai_token_balance === "number" && (
                          <span className="text-muted-foreground">Wallet: {t.profile.ai_token_balance}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setAdjustOpen({ userId: t.user_id, name: t.profile?.full_name || t.profile?.email || t.user_id.slice(0, 8) })}
                    >
                      Adjust wallet
                    </Button>
                  </Card>
                );
              })
            )}
          </div>

          {/* Adjust dialog (inline panel — keep deps small) */}
          {adjustOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setAdjustOpen(null)}>
              <Card className="w-full sm:max-w-md p-5" onClick={(e) => e.stopPropagation()}>
                <h3 className="font-display text-lg font-bold">Adjust wallet for {adjustOpen.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Positive = credit, negative = debit. Logged in audit + wallet transactions.
                </p>
                <div className="mt-3 space-y-2">
                  <Input
                    type="number"
                    placeholder="Δ tokens (e.g. 10 or -5)"
                    value={adjustDelta || ""}
                    onChange={(e) => setAdjustDelta(Number(e.target.value))}
                  />
                  <Input
                    placeholder="Reason (required for audit)"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAdjustOpen(null)} disabled={busy}>Cancel</Button>
                  <Button onClick={adjust} disabled={busy || !adjustDelta} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AdminPayments;
