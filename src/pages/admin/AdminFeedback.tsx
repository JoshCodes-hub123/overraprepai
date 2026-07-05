import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, Search, Download, Mail, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Row = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  source: string;
  created_at: string;
};

const RATINGS = [0, 5, 4, 3, 2, 1];

export default function AdminFeedback() {
  const [q, setQ] = useState("");
  const [minRating, setMinRating] = useState(0);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_feedback")
        .select("id, user_id, rating, comment, source, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Fetch minimal profile info for display
  const userIds = useMemo(() => Array.from(new Set(rows.map((r) => r.user_id))), [rows]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-feedback-profiles", userIds.join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", userIds);
      return data ?? [];
    },
  });
  const pmap = useMemo(() => {
    const m = new Map<string, any>();
    (profiles as any[]).forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (minRating && r.rating < minRating) return false;
      if (!needle) return true;
      const p = pmap.get(r.user_id);
      return (
        (r.comment ?? "").toLowerCase().includes(needle) ||
        (p?.full_name ?? "").toLowerCase().includes(needle) ||
        (p?.email ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, minRating, pmap]);

  const stats = useMemo(() => {
    const total = rows.length;
    const avg = total ? rows.reduce((s, r) => s + r.rating, 0) / total : 0;
    const buckets = [0, 0, 0, 0, 0];
    rows.forEach((r) => { buckets[r.rating - 1]++; });
    const promoters = rows.filter((r) => r.rating >= 4).length;
    const nps = total ? Math.round((promoters / total) * 100) : 0;
    return { total, avg, buckets, nps };
  }, [rows]);

  const exportCsv = () => {
    const header = ["created_at", "rating", "name", "email", "comment"];
    const lines = filtered.map((r) => {
      const p = pmap.get(r.user_id);
      return [
        new Date(r.created_at).toISOString(),
        String(r.rating),
        JSON.stringify(p?.full_name ?? ""),
        JSON.stringify(p?.email ?? ""),
        JSON.stringify(r.comment ?? ""),
      ].join(",");
    });
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `overra-feedback-${Date.now()}.csv`;
    a.click();
  };

  const emailBlast = () => {
    // Requires a verified sender domain via Lovable Emails. When absent, the
    // admin should set it up first. We surface a helpful message either way.
    toast.info(
      "Email review-request blast requires a verified sender domain. Open Cloud → Emails to set it up, then contact support to enable the blast.",
      { duration: 6000 }
    );
  };

  return (
    <>
      <SEO title="Admin · Feedback" description="User ratings and reviews" noindex />
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-amber-100/70 sticky top-0 z-30">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Link to="/admin/dashboard" className="text-muted-foreground"><ArrowLeft className="h-5 w-5" /></Link>
            <h1 className="font-display text-base font-bold flex-1">User Feedback</h1>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="h-4 w-4 mr-1" /> CSV
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-5 max-w-4xl space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total ratings" value={stats.total} />
            <StatCard label="Average" value={stats.avg.toFixed(2)} suffix="/5" />
            <StatCard label="Promoter %" value={`${stats.nps}%`} hint="4–5 stars" />
            <StatCard label="1–2 star" value={stats.buckets[0] + stats.buckets[1]} tone="warn" />
          </div>

          <div className="rounded-xl border border-amber-100/70 bg-card p-4">
            <div className="text-xs text-muted-foreground mb-2">Distribution</div>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const c = stats.buckets[n - 1];
                const pct = stats.total ? (c / stats.total) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-muted-foreground">{n}★</span>
                    <div className="flex-1 h-2 rounded-full bg-amber-50 overflow-hidden">
                      <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Email outreach card */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-amber-900">Ask users by email</div>
              <p className="text-amber-800/80 mt-0.5">
                Send a friendly "please review us" email to all 500 users. Requires a verified sender domain.
              </p>
            </div>
            <Button size="sm" onClick={emailBlast} className="bg-amber-500 hover:bg-amber-600 text-white">
              Send blast
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search comments, name or email…"
                value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="border rounded-md h-10 px-3 text-sm bg-background"
              value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
              {RATINGS.map((r) => (
                <option key={r} value={r}>{r === 0 ? "All ratings" : `${r}★ and up`}</option>
              ))}
            </select>
          </div>

          {/* List */}
          <div className="rounded-xl border border-amber-100/70 bg-card divide-y divide-amber-50">
            {isLoading && <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>}
            {!isLoading && filtered.length === 0 && (
              <div className="p-8 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
                <Info className="h-5 w-5" />
                No feedback yet — the in-app prompt will appear to signed-in students.
              </div>
            )}
            {filtered.map((r) => {
              const p = pmap.get(r.user_id);
              return (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={cn("h-4 w-4",
                          s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25")} />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{p?.full_name || p?.email || "Anonymous"}</span>
                    {p?.email && <span className="text-xs text-muted-foreground">· {p.email}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  {r.comment && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{r.comment}</p>}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
}

function StatCard({ label, value, suffix, hint, tone }: {
  label: string; value: string | number; suffix?: string; hint?: string; tone?: "warn";
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 bg-card",
      tone === "warn" ? "border-orange-200" : "border-amber-100/70",
    )}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold text-foreground mt-1">
        {value}{suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
