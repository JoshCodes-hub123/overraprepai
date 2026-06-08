import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ChevronLeft, Download, Filter, History, Loader2, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  exportAIGenerationsToCsv,
  listAIGenerations,
  deleteAIGeneration,
  clearAllAIGenerations,
  type AIGenKind,
  type AIGenRow,
  type AIGenStatus,
} from "@/lib/aiGenerationHistory";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const KIND_OPTS: { value: AIGenKind | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "quiz", label: "Quizzes" },
  { value: "flashcards", label: "Flashcards" },
  { value: "summary", label: "Summaries" },
  { value: "audio", label: "Audio lessons" },
];
const STATUS_OPTS: { value: AIGenStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "completed", label: "Completed" },
  { value: "processing", label: "Processing" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusTone: Record<AIGenStatus, string> = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const kindLabel: Record<AIGenKind, string> = {
  quiz: "Practice quiz",
  flashcards: "Flashcards",
  summary: "Study summary",
  audio: "Audio lesson",
};

const AIHistory = () => {
  const { user, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const [rows, setRows] = useState<AIGenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<AIGenKind | "all">("all");
  const [status, setStatus] = useState<AIGenStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const r = await listAIGenerations({
        userId: user.id,
        kind, status, search,
        since: since ? new Date(since).toISOString() : undefined,
        until: until ? new Date(until + "T23:59:59").toISOString() : undefined,
      });
      setRows(r);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [user?.id, kind, status, since, until]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.resource_label ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  const exportCsv = () => {
    if (filtered.length === 0) { toast.info("Nothing to export"); return; }
    const csv = exportAIGenerationsToCsv(filtered);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-history-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success(`Exported ${filtered.length} row${filtered.length === 1 ? "" : "s"}`);
  };

  const clearFilters = () => {
    setKind("all"); setStatus("all"); setSearch(""); setSince(""); setUntil("");
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await deleteAIGeneration(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Entry deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleClearAll = async () => {
    if (!user) return;
    try {
      await clearAllAIGenerations(user.id);
      setRows([]);
      toast.success("History cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Clear failed");
    }
  };

  return (
    <>
      <SEO title="AI Generation History" description="Search, filter and export every AI quiz, flashcard, summary and audio you've generated." />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="mb-5">
            <PremiumPageHero
              eyebrow="AI HISTORY"
              title="Everything your AI has made for you"
              subtitle="Every quiz, flashcard, summary and audio lesson — searchable and exportable."
              icon={History}
              back="/library"
              right={
                <>
                  <Button variant="outline" size="sm" onClick={load}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
                  </Button>
                  <Button size="sm" onClick={exportCsv} className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={rows.length === 0}>
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear all
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear all AI history?</AlertDialogTitle>
                        <AlertDialogDescription></AlertDialogDescription>
                      This permanently removes every AI generation record from your account. The generated quizzes, flashcards and summaries themselves stay in your Library.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Yes, clear everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Card className="mb-4 border-amber-100">
            <CardContent className="p-3 grid gap-2 md:grid-cols-[1fr_160px_160px_140px_140px_auto]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by course or library item…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={kind} onValueChange={(v) => setKind(v as AIGenKind | "all")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{KIND_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as AIGenStatus | "all")}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} className="h-9" aria-label="From" />
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9" aria-label="To" />
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid place-items-center py-16 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-14 text-center">
                <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold">No matching AI generations</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try widening the filters or generate something new from your Library.
                </p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/library">Open Library</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" /> {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </p>
              {filtered.map((r) => (
                <Card key={r.id} className="hover:border-amber-200 transition-colors">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-700 grid place-items-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{r.resource_label || "Untitled resource"}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{kindLabel[r.kind]}</Badge>
                        <Badge variant="outline" className={`text-[10px] ${statusTone[r.status]}`}>{r.status}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {format(new Date(r.created_at), "MMM d, yyyy · HH:mm")}
                        </span>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Removes this single AI generation record. The generated content itself isn't deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteOne(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default AIHistory;