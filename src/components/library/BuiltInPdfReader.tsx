import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Moon,
  Sun,
  BookOpen,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Bookmark,
  Check,
  WifiOff,
  CloudDownload,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getCachedMaterial,
  cacheMaterialOffline,
  type CachedMaterial,
} from "@/lib/offlineLibraryCache";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface BuiltInPdfReaderProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  title: string;
  sourceUrl?: string | null;
  storagePath?: string | null;
  mime?: string | null;
  courseCode?: string | null;
  initialBlob?: Blob | null;
  onToggleReadLater?: () => void;
  isReadLater?: boolean;
}

type ReaderTheme = "light" | "sepia" | "dark";

export function BuiltInPdfReader({
  isOpen,
  onClose,
  documentId,
  title,
  sourceUrl,
  mime,
  courseCode,
  initialBlob,
  onToggleReadLater,
  isReadLater = false,
}: BuiltInPdfReaderProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCachedOffline, setIsCachedOffline] = useState<boolean>(false);
  const [caching, setCaching] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(100);
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>("light");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(isReadLater);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync bookmark state
  useEffect(() => {
    setIsBookmarked(isReadLater);
  }, [isReadLater]);

  // Load document from Offline IndexedDB Cache or Online URL
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    let createdUrl: string | null = null;

    async function loadDocument() {
      setLoading(true);
      setError(null);

      try {
        // 1. Check if material is already cached offline in IndexedDB
        const cached = await getCachedMaterial(documentId);
        if (cached?.blob && active) {
          setIsCachedOffline(true);
          createdUrl = URL.createObjectURL(cached.blob);
          setBlobUrl(createdUrl);
          setLoading(false);
          return;
        }

        // 2. Check if an initialBlob was passed (e.g. freshly uploaded)
        if (initialBlob && active) {
          createdUrl = URL.createObjectURL(initialBlob);
          setBlobUrl(createdUrl);
          setLoading(false);
          return;
        }

        // 3. Fallback to sourceUrl
        if (sourceUrl) {
          const res = await fetch(sourceUrl);
          if (!res.ok) throw new Error(`Failed to load file (${res.status})`);
          const blob = await res.blob();
          if (active) {
            createdUrl = URL.createObjectURL(blob);
            setBlobUrl(createdUrl);
            setLoading(false);
          }
        } else {
          throw new Error("Document source not available");
        }
      } catch (err) {
        if (active) {
          console.warn("Could not load document into offline reader:", err);
          setError(
            !navigator.onLine
              ? "You are offline and this file was not saved for offline reading yet."
              : "Failed to open document. Please try again."
          );
          setLoading(false);
        }
      }
    }

    loadDocument();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, documentId, sourceUrl, initialBlob]);

  // Save to offline storage handler
  const handleSaveOffline = async () => {
    try {
      setCaching(true);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

      let targetBlob: Blob | null = null;
      if (initialBlob) {
        targetBlob = initialBlob;
      } else if (blobUrl) {
        const res = await fetch(blobUrl);
        targetBlob = await res.blob();
      } else if (sourceUrl) {
        const res = await fetch(sourceUrl);
        targetBlob = await res.blob();
      }

      if (!targetBlob) throw new Error("File data unavailable to save offline");

      await cacheMaterialOffline({
        id: documentId,
        title,
        mime: mime || targetBlob.type || "application/pdf",
        ext: "pdf",
        blob: targetBlob,
        cached_at: Date.now(),
        course_code: courseCode || null,
        source_url: sourceUrl || null,
      });

      setIsCachedOffline(true);
      toast.success("Saved to device for offline reading!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save offline");
    } finally {
      setCaching(false);
    }
  };

  const handleDownloadCopy = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Downloading a copy to your device");
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const cycleTheme = () => {
    setReaderTheme((prev) => {
      if (prev === "light") return "sepia";
      if (prev === "sepia") return "dark";
      return "light";
    });
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50 flex flex-col backdrop-blur-xl transition-colors duration-200 select-none",
        readerTheme === "dark" && "bg-neutral-950 text-neutral-100",
        readerTheme === "sepia" && "bg-[#fbf0d9] text-[#433422]",
        readerTheme === "light" && "bg-neutral-100 text-neutral-900"
      )}
    >
      {/* Top Reading Navigation Bar */}
      <header
        className={cn(
          "h-14 px-4 flex items-center justify-between border-b shrink-0 shadow-xs z-10",
          readerTheme === "dark" && "border-neutral-800 bg-neutral-900/90",
          readerTheme === "sepia" && "border-[#e6d5b8] bg-[#f5e5c9]/90",
          readerTheme === "light" && "border-neutral-200 bg-white/95"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
            title="Exit Reader"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-md">
                {title}
              </h2>
              {courseCode && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] uppercase font-bold px-1.5 py-0 h-4 border",
                    readerTheme === "dark" ? "border-amber-500/40 text-amber-400" : "border-amber-600/40 text-amber-700"
                  )}
                >
                  {courseCode}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] opacity-75">
              {isCachedOffline ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <Check className="w-3 h-3" /> Offline Ready
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> In-App Reader
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Read Later Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsBookmarked(!isBookmarked);
              onToggleReadLater?.();
              toast.success(!isBookmarked ? "Added to Read Later queue" : "Removed from Read Later");
            }}
            className={cn(
              "h-8 px-2 sm:px-2.5 rounded-full text-xs font-medium gap-1",
              isBookmarked && "text-amber-600 dark:text-amber-400 font-bold"
            )}
            title="Bookmark for reading later"
          >
            <Bookmark className={cn("w-3.5 h-3.5", isBookmarked && "fill-current")} />
            <span className="hidden md:inline">
              {isBookmarked ? "In Queue" : "Read Later"}
            </span>
          </Button>

          {/* Offline Save Toggle */}
          {!isCachedOffline ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveOffline}
              disabled={caching || !blobUrl}
              className="h-8 px-2.5 rounded-full text-xs font-semibold border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200"
            >
              {caching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <CloudDownload className="w-3.5 h-3.5 mr-1" />
              )}
              <span className="hidden sm:inline">Save Offline</span>
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 px-2.5 py-1"
            >
              <Check className="w-3 h-3" /> Saved Offline
            </Badge>
          )}

          {/* Reader Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="h-8 w-8 rounded-full"
            title={`Reading background: ${readerTheme} (click to cycle)`}
          >
            {readerTheme === "dark" ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : readerTheme === "sepia" ? (
              <span className="w-4 h-4 rounded-full bg-[#e6d5b8] border border-[#a8906c]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-600" />
            )}
          </Button>

          {/* Zoom Controls (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-0.5 border rounded-full px-1 border-border/80">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.max(50, z - 15))}
              className="h-7 w-7 rounded-full"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] font-mono px-1 min-w-[34px] text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoom((z) => Math.min(200, z + 15))}
              className="h-7 w-7 rounded-full"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex h-8 w-8 rounded-full"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Reading"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Download Copy */}
          {blobUrl && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownloadCopy}
              className="h-8 w-8 rounded-full"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Reading Viewport */}
      <main className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground p-8">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Opening document in offline reader…</p>
            <p className="text-xs opacity-75">Preparing smooth distraction-free pages</p>
          </div>
        ) : error ? (
          <div className="max-w-md text-center p-6 rounded-2xl border border-border/80 bg-card/80 backdrop-blur shadow-md">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1">Cannot Open Document</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Go Back
              </Button>
              {sourceUrl && (
                <Button size="sm" asChild>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Open Direct
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : blobUrl ? (
          <div
            className={cn(
              "w-full h-full rounded-xl overflow-hidden shadow-lg border transition-all duration-200",
              readerTheme === "dark" && "border-neutral-800 bg-neutral-900",
              readerTheme === "sepia" && "border-[#e6d5b8] bg-[#f7eedc]",
              readerTheme === "light" && "border-neutral-200 bg-white"
            )}
            style={{
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: "top center",
            }}
          >
            <object
              data={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
              type="application/pdf"
              className="w-full h-full"
            >
              <iframe
                src={`${blobUrl}#toolbar=1`}
                title={title}
                className="w-full h-full border-0"
              />
            </object>
          </div>
        ) : null}
      </main>

      {/* Discreet bottom reading footer */}
      <footer
        className={cn(
          "h-8 px-4 flex items-center justify-between text-[11px] opacity-75 border-t shrink-0 select-none",
          readerTheme === "dark" && "border-neutral-800 bg-neutral-900/60 text-neutral-400",
          readerTheme === "sepia" && "border-[#e6d5b8] bg-[#f5e5c9]/60 text-[#6a5438]",
          readerTheme === "light" && "border-neutral-200 bg-neutral-50/80 text-neutral-500"
        )}
      >
        <span>OverraPrep Built-in PDF Reader</span>
        <span>{isCachedOffline ? "Available Offline" : "Online Mode"}</span>
      </footer>
    </div>
  );
}

export default BuiltInPdfReader;
