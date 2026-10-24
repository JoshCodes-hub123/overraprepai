import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useUserResources } from "@/hooks/useUserResources";
import { getResourceSignedUrl, KIND_META, type ResourceKind, type UserResource } from "@/lib/userResources";
import { useAuth } from "@/hooks/useAuth";
import { useStudentScope } from "@/hooks/useStudentScope";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Library as LibraryIcon,
  Search,
  Folder,
  Trash2,
  Loader2,
  FileText,
  Headphones,
  Upload,
  CloudDownload,
  Check,
  Bookmark,
  BookOpen,
  ArrowRight,
  Sparkles,
  WifiOff,
  GraduationCap,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import UploadResourceDialog from "@/components/student/library/UploadResourceDialog";
import OutlineActionsMenu from "@/components/student/library/OutlineActionsMenu";
import FlashcardStudyDialog, { type Flashcard } from "@/components/student/library/FlashcardStudyDialog";
import { LibraryPdfViewer } from "@/components/library/LibraryPdfViewer";
import {
  listCachedMaterialIds,
  cacheMaterialOffline,
  removeCachedMaterial,
} from "@/lib/offlineLibraryCache";
import { PageHeader, LevelChip } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const READ_LATER_KEY = "overra_library_read_later_ids";

export const Library = () => {
  const { primaryRole, user } = useAuth();
  const { level: studentLevel, label: scopeLabel } = useStudentScope();
  const [searchParams, setSearchParams] = useSearchParams();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    | "admin"
    | "tutor"
    | "student";

  const { data: resources = [], isLoading, remove } = useUserResources();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "read_later" | "offline" | "pdf" | "note">("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [cachedIds, setCachedIds] = useState<Set<string>>(new Set());
  const [readLaterIds, setReadLaterIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(READ_LATER_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Built-in Reader State
  const [readerResource, setReaderResource] = useState<UserResource | null>(null);
  const [readerUrl, setReaderUrl] = useState<string | null>(null);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState<string | null>(null);

  // Flashcards state
  const [studyCards, setStudyCards] = useState<Flashcard[] | null>(null);
  const [studyTitle, setStudyTitle] = useState("");

  // Sync cached IndexedDB IDs
  const refreshCachedIds = () => {
    listCachedMaterialIds()
      .then((ids) => setCachedIds(new Set(ids)))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCachedIds();
  }, []);

  // Sync upload param
  useEffect(() => {
    if (searchParams.get("upload") === "1") {
      setUploadOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("upload");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Persist Read Later IDs to localStorage
  const toggleReadLater = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } catch {
      // noop
    }

    setReadLaterIds((prev) => {
      const next = new Set(prev);
      const isAdded = !next.has(id);
      if (isAdded) {
        next.add(id);
        toast.success("Saved to your Read Later queue");
      } else {
        next.delete(id);
        toast.info("Removed from Read Later");
      }
      try {
        localStorage.setItem(READ_LATER_KEY, JSON.stringify(Array.from(next)));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 1-Tap Save for Offline Reading
  const handleSaveOffline = async (r: UserResource, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setIsDownloadingOffline(r.id);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

      const signedUrl = await getResourceSignedUrl(r.storage_path, 3600);
      if (!signedUrl) throw new Error("Could not retrieve file download URL");

      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();

      await cacheMaterialOffline({
        id: r.id,
        title: r.title,
        mime: r.mime || blob.type || "application/pdf",
        ext: "pdf",
        blob,
        cached_at: Date.now(),
        course_code: r.folder !== "General" ? r.folder : undefined,
      });

      refreshCachedIds();
      toast.success(`"${r.title}" is now available offline!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to save offline");
    } finally {
      setIsDownloadingOffline(null);
    }
  };

  // Open Document in Built-in PDF Reader
  const handleOpenReader = async (r: UserResource) => {
    // If flashcard JSON, open study dialog
    if (r.kind === "flashcard") {
      const url = await getResourceSignedUrl(r.storage_path, 600);
      if (url) {
        try {
          const json = await (await fetch(url)).json();
          if (Array.isArray(json?.cards) && json.cards.length) {
            setStudyTitle(r.title);
            setStudyCards(json.cards);
            return;
          }
        } catch {
          // fall through
        }
      }
    }

    setReaderResource(r);
    // Get signed URL if online, or reader will automatically read from IndexedDB if offline
    if (navigator.onLine) {
      getResourceSignedUrl(r.storage_path, 7200).then((url) => {
        setReaderUrl(url);
      });
    } else {
      setReaderUrl(null);
    }
  };

  const folders = useMemo(() => {
    const s = new Set<string>();
    resources.forEach((r) => {
      if (r.folder && r.folder !== "General") s.add(r.folder);
    });
    return Array.from(s);
  }, [resources]);

  const handleDelete = async (r: UserResource, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${r.title}" from your Library?`)) return;
    try {
      await remove.mutateAsync(r);
      await removeCachedMaterial(r.id).catch(() => {});
      refreshCachedIds();
      toast.success("Document deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  // Filtered List
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resources.filter((r) => {
      // Search filter
      if (q && !r.title.toLowerCase().includes(q) && !r.folder.toLowerCase().includes(q)) {
        return false;
      }

      // Tab filter
      if (activeTab === "read_later" && !readLaterIds.has(r.id)) return false;
      if (activeTab === "offline" && !cachedIds.has(r.id)) return false;
      if (activeTab === "pdf" && r.kind !== "pdf") return false;
      if (activeTab === "note" && r.kind !== "note") return false;

      return true;
    });
  }, [resources, search, activeTab, readLaterIds, cachedIds]);

  const readLaterCount = useMemo(() => {
    return resources.filter((r) => readLaterIds.has(r.id)).length;
  }, [resources, readLaterIds]);

  const offlineCount = useMemo(() => {
    return resources.filter((r) => cachedIds.has(r.id)).length;
  }, [resources, cachedIds]);

  return (
    <>
      <SEO
        title="My Library — Offline Course Reader & Document Vault"
        description="Upload course materials, save lecture documents to read later, and open built-in PDFs offline."
      />

      <div className="min-h-screen bg-background pb-28">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <main className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          {/* =========================================================
              CLEAN, PEACEFUL HEADER (Anti-clutter)
             ========================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LibraryIcon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-bold tracking-[0.16em] uppercase text-primary">
                  Study Vault & Reader
                </span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                My Library
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-xl">
                Upload your course outlines, textbooks, and lecture handouts. Read them in the built-in PDF viewer offline.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                onClick={() => setUploadOpen(true)}
                className="gap-2 bg-primary text-slate-950 font-bold shadow-sm hover:brightness-105 rounded-xl px-4 h-10"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Material</span>
              </Button>
            </div>
          </div>

          {/* =========================================================
              SEARCH & QUICK TABS
             ========================================================= */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course materials, topics, or notes…"
                className="pl-10 h-11 bg-card/80 border-border/80 rounded-2xl shadow-xs text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Simple Segmented Filter Bar (Not too busy) */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  activeTab === "all"
                    ? "bg-primary text-slate-950 border-primary font-bold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                All Documents ({resources.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("read_later")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5",
                  activeTab === "read_later"
                    ? "bg-primary text-slate-950 border-primary font-bold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Bookmark className="w-3 h-3" />
                Read Later ({readLaterCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("offline")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5",
                  activeTab === "offline"
                    ? "bg-emerald-500 text-white border-emerald-500 font-bold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <Check className="w-3 h-3" />
                Offline Ready ({offlineCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("pdf")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  activeTab === "pdf"
                    ? "bg-primary text-slate-950 border-primary font-bold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                PDFs
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("note")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border",
                  activeTab === "note"
                    ? "bg-primary text-slate-950 border-primary font-bold shadow-xs"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Notes
              </button>
            </div>
          </div>

          {/* =========================================================
              DOCUMENT VAULT LIST (Clean, spacious, uncluttered)
             ========================================================= */}
          <section className="space-y-3">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <p className="text-xs font-medium">Loading your library…</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={<LibraryIcon className="w-7 h-7 text-primary" />}
                title={
                  activeTab === "read_later"
                    ? "Your Read Later queue is empty"
                    : activeTab === "offline"
                    ? "No documents saved offline yet"
                    : resources.length === 0
                    ? "Your Library is clean and empty"
                    : "No documents match this filter"
                }
                description={
                  activeTab === "read_later"
                    ? "Click the bookmark icon on any course material to save it for reading later."
                    : activeTab === "offline"
                    ? "Tap 'Save Offline' on any document to download and open it without internet."
                    : resources.length === 0
                    ? "Upload your lecture notes, syllabus, or past questions to start reading."
                    : "Try clearing your search or switching to another tab."
                }
                action={
                  resources.length === 0 ? (
                    <Button
                      onClick={() => setUploadOpen(true)}
                      className="gap-2 bg-primary text-slate-950 font-bold"
                    >
                      <Upload className="w-4 h-4" /> Upload Course Material
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => { setActiveTab("all"); setSearch(""); }}>
                      Show All Materials
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filtered.map((r) => {
                  const isReadLater = readLaterIds.has(r.id);
                  const isOffline = cachedIds.has(r.id);
                  const isOutline = (r.meta as any)?.material_type === "outline";
                  const sizeFormatted = r.size_bytes
                    ? r.size_bytes > 1024 * 1024
                      ? `${(r.size_bytes / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(r.size_bytes / 1024)} KB`
                    : null;

                  return (
                    <div
                      key={r.id}
                      onClick={() => handleOpenReader(r)}
                      className={cn(
                        "group p-3.5 sm:p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-all cursor-pointer shadow-xs",
                        "flex items-center justify-between gap-3 border-border/80 hover:border-primary/50"
                      )}
                    >
                      {/* Left: Type Icon */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105",
                            r.kind === "pdf"
                              ? "bg-amber-500/10 border-amber-300/40 text-amber-700 dark:text-amber-400"
                              : "bg-muted border-border text-muted-foreground"
                          )}
                        >
                          {r.kind === "pdf" ? (
                            <FileText className="w-5 h-5 text-primary" />
                          ) : r.kind === "audio" ? (
                            <Headphones className="w-5 h-5 text-primary" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-primary" />
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {r.folder && r.folder !== "General" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-bold uppercase h-4 px-1.5 border-primary/30 text-primary bg-primary/5"
                              >
                                {r.folder}
                              </Badge>
                            )}

                            {isOffline && (
                              <Badge className="text-[10px] font-bold h-4 px-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Offline
                              </Badge>
                            )}

                            {isReadLater && (
                              <Badge className="text-[10px] font-bold h-4 px-1.5 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-0.5">
                                <Bookmark className="w-2.5 h-2.5 fill-current" /> Read Later
                              </Badge>
                            )}
                          </div>

                          <h3 className="font-semibold text-sm sm:text-base text-foreground leading-snug truncate">
                            {r.title}
                          </h3>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span>{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                            {sizeFormatted && (
                              <>
                                <span>·</span>
                                <span>{sizeFormatted}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Bookmark / Read Later */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => toggleReadLater(r.id, e)}
                          className={cn(
                            "h-8 w-8 rounded-full hover:bg-muted text-muted-foreground",
                            isReadLater && "text-amber-500 hover:text-amber-600"
                          )}
                          title={isReadLater ? "Remove from Read Later" : "Save to Read Later"}
                        >
                          <Bookmark className={cn("w-4 h-4", isReadLater && "fill-current")} />
                        </Button>

                        {/* Save Offline button if not already cached */}
                        {!isOffline && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleSaveOffline(r, e)}
                            disabled={isDownloadingOffline === r.id}
                            className="h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
                            title="Save for offline reading"
                          >
                            {isDownloadingOffline === r.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <CloudDownload className="w-4 h-4" />
                            )}
                          </Button>
                        )}

                        {/* Read Now Primary CTA */}
                        <Button
                          size="sm"
                          onClick={() => handleOpenReader(r)}
                          className="h-8 px-3 rounded-xl text-xs font-bold gap-1 bg-primary/10 text-primary hover:bg-primary hover:text-slate-950 transition-colors hidden sm:inline-flex"
                        >
                          <span>Read</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>

                        {/* AI Options menu */}
                        {(r.kind === "pdf" || r.kind === "note" || isOutline) && (
                          <OutlineActionsMenu resource={r} />
                        )}

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(r, e)}
                          className="h-8 w-8 rounded-full hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Upload Course Material Dialog */}
      <UploadResourceDialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) refreshCachedIds();
        }}
        existingFolders={folders}
      />

      {/* Flashcard Study Dialog */}
      <FlashcardStudyDialog
        open={!!studyCards}
        onOpenChange={(o) => { if (!o) setStudyCards(null); }}
        cards={studyCards || []}
        title={studyTitle}
      />

      {/* BUILT-IN DISTRACTION-FREE OFFLINE REACT-PDF READER */}
      {readerResource && (
        <LibraryPdfViewer
          isOpen={!!readerResource}
          onClose={() => {
            setReaderResource(null);
            setReaderUrl(null);
            refreshCachedIds();
          }}
          documentId={readerResource.id}
          title={readerResource.title}
          sourceUrl={readerUrl}
          mime={readerResource.mime}
          courseCode={readerResource.folder !== "General" ? readerResource.folder : undefined}
          isReadLater={readLaterIds.has(readerResource.id)}
          onToggleReadLater={() => toggleReadLater(readerResource.id)}
        />
      )}
    </>
  );
};

export default Library;
