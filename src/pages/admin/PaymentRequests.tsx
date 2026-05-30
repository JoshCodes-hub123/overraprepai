import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, ExternalLink, Loader2, Check, X, Download, Crown, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToCsv } from "@/lib/exportCsv";

const Stat = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card className="p-4">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="font-display text-2xl font-extrabold mt-1">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
  </Card>
);

const PaymentRequests = () => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "pending" | "failed">("all");
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [extendReason, setExtendReason] = useState("");

  // --- All Flutterwave transactions ---
  const { data: txs = [], isLoading: txsLoading } = useQuery({
    queryKey: ["admin-payment-txs"],
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from("payment_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string))) as string[];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const { data: subs } = ids.length
        ? await (supabase as any).from("user_subscriptions").select("user_id, expires_at, status").in("user_id", ids).eq("status", "active")
        : { data: [] as any[] };
      const subMap = new Map((subs ?? []).map((s: any) => [s.user_id, s]));
      return (rows ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id), sub: subMap.get(r.user_id) }));
    },
  });

  // --- Pending manual receipts ---
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["admin-payment-requests-pending"],
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from("payment_requests").select("*").eq("status", "pending")
        .order("created_at", { ascending: false });
      const ids = Array.from(new Set((rows ?? []).map((r: any) => r.user_id as string))) as string[];
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id,full_name,email").in("id", ids)
        : { data: [] as any[] };
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return (rows ?? []).map((r: any) => ({ ...r, profile: map.get(r.user_id) }));
    },
  });

  const filteredTxs = useMemo(() => {
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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const successful = txs.filter((t: any) => t.status === "success");
    const today = successful.filter((t: any) => new Date(t.created_at) >= todayStart);
    const month = successful.filter((t: any) => new Date(t.created_at) >= monthStart);
    const sumKobo = (rows: any[]) => rows.reduce((s, r) => s + (r.amount_cents || 0), 0);
    const activePro = new Set(
      txs.filter((t: any) => t.sub && new Date(t.sub.expires_at) > now).map((t: any) => t.user_id),
    ).size;
    return {
      today: `₦${(sumKobo(today) / 100).toLocaleString()}`,
      month: `₦${(sumKobo(month) / 100).toLocaleString()}`,
      activePro: activePro.toString(),
      successfulCount: successful.length.toString(),
    };
  }, [txs]);

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 600);
    if (data?.signedUrl) setProofUrl(data.signedUrl);
    else toast.error("Could not load proof");
  };

  const approve = async (id: string) => {
    setBusy(id);
    try {
      const { error } = await (supabase as any).rpc("approve_payment_request", { _id: id, _note: null });
      if (error) throw new Error(error.message);
      toast.success("Approved");
      qc.invalidateQueries({ queryKey: ["admin-payment-requests-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-payment-txs"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally { setBusy(null); }
  };

  const confirmReject = async () => {
    if (!rejectingId) return;
    setBusy(rejectingId);
    try {
      const { error } = await (supabase as any).rpc("reject_payment_request", { _id: rejectingId, _note: rejectNote || null });
      if (error) throw new Error(error.message);
      toast.success("Rejected");
      qc.invalidateQueries({ queryKey: ["admin-payment-requests-pending"] });
      setRejectingId(null); setRejectNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally { setBusy(null); }
  };

  const confirmExtend = async () => {
    if (!extendId || extendDays <= 0) return;
    setBusy(extendId);
    try {
      const { error } = await (supabase as any).rpc("admin_extend_pro", {
        _user_id: extendId, _days: extendDays, _reason: extendReason || null,
      });
      if (error) throw new Error(error.message);
      toast.success(`Extended Pro by ${extendDays} days`);
      qc.invalidateQueries({ queryKey: ["admin-payment-txs"] });
      setExtendId(null); setExtendDays(30); setExtendReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Extend failed");
    } finally { setBusy(null); }
  };

  const downloadCsv = () => {
    exportCsv(
      "payments.csv",
      filteredTxs.map((t: any) => ({
        date: format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
        student: t.profile?.full_name || "",
        email: t.profile?.email || "",
        plan: t.plan_id,
        amount_ngn: (t.amount_cents / 100).toFixed(2),
        currency: t.currency,
        provider: t.provider,
        status: t.status,
        reference: t.reference,
        pro_expires: t.sub?.expires_at || "",
      })),
    );
  };

  return (
    <>
      <SEO title="Payments" description="Manage subscription payments and revenue." url="https://overraprep.com/admin/payments" noindex />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="admin" />
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <header className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-amber-500" /> Payments
            </h1>
            <Button size="sm" variant="outline" onClick={downloadCsv} disabled={!filteredTxs.length}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Stat label="Today" value={stats.today} sub="Revenue (successful)" />
            <Stat label="This month" value={stats.month} sub="Revenue (successful)" />
            <Stat label="Active Pro" value={stats.activePro} sub="Subscribers right now" />
            <Stat label="All-time payments" value={stats.successfulCount} sub="Successful charges" />
          </div>

          {/* Pending manual receipts */}
          {pendingRequests.length > 0 && (
            <section className="mb-6">
              <h2 className="font-display text-base font-bold mb-2">Pending manual receipts ({pendingRequests.length})</h2>
              <div className="space-y-2">
                {pendingRequests.map((r: any) => (
                  <Card key={r.id} className="p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{r.profile?.full_name || r.profile?.email || r.user_id.slice(0, 8)}</p>
                        <p className="text-[11px] text-muted-foreground">{r.profile?.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <Badge variant="outline" className="capitalize">{r.plan_id}</Badge>
                          <span>{r.currency} {(r.amount_cents / 100).toFixed(2)}</span>
                          {r.reference && <span>Ref <strong>{r.reference}</strong></span>}
                          <span className="text-muted-foreground">{format(new Date(r.created_at), "PPp")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {r.proof_path && (
                          <Button size="sm" variant="outline" onClick={() => openProof(r.proof_path)}>
                            <ExternalLink className="w-3.5 h-3.5 mr-1" /> Proof
                          </Button>
                        )}
                        <Button size="sm" disabled={busy === r.id}
                          onClick={() => approve(r.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white">
                          {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Approve</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(r.id)}>
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* All transactions */}
          <section>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h2 className="font-display text-base font-bold mr-2">All payments</h2>
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, reference…" className="h-8 pl-8 text-sm" />
              </div>
              {(["all", "success", "pending", "failed"] as const).map((s) => (
                <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="h-8 capitalize">
                  {s}
                </Button>
              ))}
            </div>

            {txsLoading ? (
              <div className="grid place-items-center py-16 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : filteredTxs.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">No payments match the current filters.</Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left">Student</th>
                        <th className="px-3 py-2 text-left">Plan</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Pro expires</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-left">Ref</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTxs.map((t: any) => (
                        <tr key={t.id} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2">
                            <p className="font-semibold">{t.profile?.full_name || "—"}</p>
                            <p className="text-[11px] text-muted-foreground">{t.profile?.email}</p>
                          </td>
                          <td className="px-3 py-2"><Badge variant="outline" className="capitalize">{t.plan_id}</Badge></td>
                          <td className="px-3 py-2 text-right font-semibold">₦{(t.amount_cents / 100).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <Badge variant={t.status === "success" ? "default" : t.status === "failed" ? "destructive" : "secondary"}
                              className={t.status === "success" ? "bg-emerald-500 hover:bg-emerald-500" : ""}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-muted-foreground">
                            {t.sub?.expires_at ? format(new Date(t.sub.expires_at), "PP") : "—"}
                          </td>
                          <td className="px-3 py-2 text-[12px] text-muted-foreground">
                            {format(new Date(t.created_at), "PPp")}
                          </td>
                          <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground truncate max-w-[140px]">{t.reference}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setExtendId(t.user_id)} title="Extend Pro">
                              <Plus className="w-3.5 h-3.5 mr-1" /> Extend
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        </main>
      </div>

      <Dialog open={!!rejectingId} onOpenChange={(o) => !o && setRejectingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reject payment</DialogTitle></DialogHeader>
          <Textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Reason (sent to the student)" rows={3} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={!!busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!extendId} onOpenChange={(o) => !o && setExtendId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-500" /> Extend Pro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="text-muted-foreground">Days to add</span>
              <Input type="number" min={1} value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value) || 0)} />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Reason (audit log)</span>
              <Textarea value={extendReason} onChange={(e) => setExtendReason(e.target.value)} rows={2} placeholder="e.g. Gift / refund credit" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExtendId(null)}>Cancel</Button>
            <Button onClick={confirmExtend} disabled={!!busy || extendDays <= 0}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Extend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!proofUrl} onOpenChange={(o) => !o && setProofUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Proof of payment</DialogTitle></DialogHeader>
          {proofUrl && (
            proofUrl.match(/\.pdf/i)
              ? <iframe src={proofUrl} className="w-full h-[70vh] rounded-lg border" />
              : <img src={proofUrl} alt="Proof" className="w-full max-h-[75vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentRequests;
