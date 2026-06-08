import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CloudDownload, Trash2, HardDrive, Loader2, FileText, ExternalLink, ChevronLeft, BookOpen,
} from "lucide-react";
import {
  listCachedMaterials, removeCachedMaterial, clearAllCachedMaterials,
  getCachedMaterial, openCachedBlob, type CachedSummary,
} from "@/lib/offlineLibraryCache";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const OfflineDownloads = () => {
  const { primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const [items, setItems] = useState<CachedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await listCachedMaterials();
      rows.sort((a, b) => b.cached_at - a.cached_at);
      setItems(rows);
    } catch {
      toast.error("Could not read offline cache");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  const total = useMemo(() => items.reduce((s, i) => s + (i.size || 0), 0), [items]);

  const grouped = useMemo(() => {
    const m = new Map<string, { key: string; label: string; courseId: string | null; rows: CachedSummary[] }>();
    for (const it of items) {
      const key = it.course_id || "__none__";
      const label = it.course_code || (it.course_id ? "Course material" : "Library & other");
      if (!m.has(key)) m.set(key, { key, label, courseId: it.course_id ?? null, rows: [] });
      m.get(key)!.rows.push(it);
    }
    return Array.from(m.values()).sort((a, b) => (a.key === "__none__" ? 1 : b.key === "__none__" ? -1 : a.label.localeCompare(b.label)));
  }, [items]);

  const handleOpen = async (id: string) => {
    setBusy(id);
    try {
      const c = await getCachedMaterial(id);
      if (!c) { toast.error("Not in cache anymore"); await refresh(); return; }
      openCachedBlob(c);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this file from offline storage?")) return;
    setBusy(id);
    try {
      await removeCachedMaterial(id);
      setItems((p) => p.filter((x) => x.id !== id));
      toast.success("Removed from offline cache");
    } catch {
      toast.error("Could not remove");
    } finally {
      setBusy(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Free up ${fmtBytes(total)}? This removes every file you have saved offline.`)) return;
    try {
      await clearAllCachedMaterials();
      setItems([]);
      toast.success("Offline storage cleared");
    } catch {
      toast.error("Failed to clear cache");
    }
  };

  return (
    <>
      <SEO title="Offline Downloads" description="Manage tutor materials saved for offline access on this device." />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-6 max-w-4xl">
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="mb-5">
            <PremiumPageHero
              eyebrow="OFFLINE DOWNLOADS"
              title="Study even when you're offline"
              subtitle="Tutor materials cached on this device. They open instantly without a connection."
              icon={CloudDownload}
              back="/library"
            />
          </div>

          <Card className="mb-5 border-amber-100 bg-gradient-to-br from-amber-50/50 to-background">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 grid place-items-center">
                  <HardDrive className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{items.length} file{items.length === 1 ? "" : "s"} cached</p>
                  <p className="text-xs text-muted-foreground">Using {fmtBytes(total)} on this device</p>
                </div>
              </div>
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearAll} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                  <Trash2 className="w-4 h-4 mr-1.5" /> Free up all
                </Button>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <CloudDownload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">Nothing saved offline yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Open any tutor material — it will be cached automatically for offline use.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/student/tutor-courses">Browse Tutor Courses</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {grouped.map((g) => {
                const groupTotal = g.rows.reduce((s, r) => s + (r.size || 0), 0);
                return (
                  <section key={g.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <h2 className="text-sm font-semibold">{g.label}</h2>
                        <Badge variant="outline" className="text-[10px]">{g.rows.length}</Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">{fmtBytes(groupTotal)}</span>
                    </div>
                    <div className="space-y-2">
                      {g.rows.map((it) => (
                        <Card key={it.id} className="hover:border-amber-200 transition-colors">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-700 grid place-items-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{it.title}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700">
                                  Ready offline
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">{fmtBytes(it.size)}</span>
                                <span className="text-[11px] text-muted-foreground">{format(new Date(it.cached_at), "MMM d")}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" onClick={() => handleOpen(it.id)} disabled={busy === it.id} className="h-8 px-2">
                              {busy === it.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRemove(it.id)} disabled={busy === it.id} className="h-8 px-2 text-rose-600 hover:bg-rose-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {g.courseId && (
                              <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                                <Link to={`/courses/${g.courseId}`} aria-label="Open course"><BookOpen className="w-3.5 h-3.5" /></Link>
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default OfflineDownloads;