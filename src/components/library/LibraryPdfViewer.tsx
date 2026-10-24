import React, { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  Check,
  CloudDownload,
  WifiOff,
  Loader2,
  FileText,
  Bookmark,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getCachedMaterial, cacheMaterialOffline } from "@/lib/offlineLibraryCache";

// Import react-pdf styling
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker using unpkg matched to the installed pdfjs version
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const SW_CACHE_NAME = "offline-pdf-cache-v1";

export interface LibraryPdfViewerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  title: string;
  sourceUrl?: string | null;
  mime?: string | null;
  courseCode?: string | null;
  initialBlob?: Blob | null;
  isReadLater?: boolean;
  onToggleReadLater?: () => void;
}

type ViewerTheme = "light" | "sepia" | "dark";

export function LibraryPdfViewer({
  isOpen,
  onClose,
  documentId,
  title,
  sourceUrl,
  mime,
  courseCode,
  initialBlob,
  isReadLater = false,
  onToggleReadLater,
}: LibraryPdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [theme, setTheme] = useState<ViewerTheme>("light");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pageWidth, setPageWidth] = useState<number>(600);

  // Offline / ServiceWorker Caching State
  const [pdfSource, setPdfSource] = useState<string | Blob | null>(null);
  const [isSwCached, setIsSwCached] = useState<boolean>(false);
  const [isCaching, setIsCaching] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Compute responsive page width
  useEffect(() => {
    const updateWidth = () => {
      if (pageContainerRef.current) {
        const containerWidth = pageContainerRef.current.clientWidth - 48;
        setPageWidth(Math.min(Math.max(containerWidth, 320), 860));
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isOpen]);

  // Check if document is cached in ServiceWorker CacheStorage
  const checkServiceWorkerCache = async (url: string): Promise<boolean> => {
    if (typeof window === "undefined" || !("caches" in window)) return false;
    try {
      const cache = await caches.open(SW_CACHE_NAME);
      const match = await cache.match(url);
      return !!match;
    } catch {
      return false;
    }
  };

  // Load PDF from ServiceWorker Cache, IndexedDB, or Network
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let objectUrlToRevoke: string | null = null;

    async function loadPdfDocument() {
      setLoading(true);
      setLoadError(null);

      try {
        // 1. Direct Blob provided
        if (initialBlob) {
          if (isMounted) {
            setPdfSource(initialBlob);
            setLoading(false);
          }
          return;
        }

        // 2. Check IndexedDB offline library cache
        const localCached = await getCachedMaterial(documentId);
        if (localCached?.blob) {
          if (isMounted) {
            setIsSwCached(true);
            setPdfSource(localCached.blob);
            setLoading(false);
          }
          return;
        }

        // 3. Check ServiceWorker CacheStorage
        if (sourceUrl && "caches" in window) {
          const cached = await checkServiceWorkerCache(sourceUrl);
          if (cached) {
            const cache = await caches.open(SW_CACHE_NAME);
            const response = await cache.match(sourceUrl);
            if (response) {
              const blob = await response.blob();
              if (isMounted) {
                setIsSwCached(true);
                setPdfSource(blob);
                setLoading(false);
                return;
              }
            }
          }
        }

        // 4. Online Fetch with Automatic ServiceWorker Caching
        if (sourceUrl) {
          const res = await fetch(sourceUrl);
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          const blob = await res.blob();

          // Store in ServiceWorker cache for offline access
          if ("caches" in window) {
            try {
              const cache = await caches.open(SW_CACHE_NAME);
              await cache.put(sourceUrl, new Response(blob.slice(), {
                headers: { "Content-Type": "application/pdf" },
              }));
              if (isMounted) setIsSwCached(true);
            } catch (swErr) {
              console.warn("[SW Cache] Error caching document:", swErr);
            }
          }

          if (isMounted) {
            setPdfSource(blob);
            setLoading(false);
          }
        } else {
          throw new Error("No PDF source URL available");
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("LibraryPdfViewer error:", err);
          setLoadError(
            !navigator.onLine
              ? "This document has not been saved for offline access yet."
              : "Failed to load PDF document."
          );
          setLoading(false);
        }
      }
    }

    loadPdfDocument();

    return () => {
      isMounted = false;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [isOpen, documentId, sourceUrl, initialBlob]);

  // ServiceWorker Cache & Offline Download handler
  const handleCacheForOffline = async () => {
    try {
      setIsCaching(true);
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

      let blobData: Blob | null = null;
      if (pdfSource instanceof Blob) {
        blobData = pdfSource;
      } else if (sourceUrl) {
        const res = await fetch(sourceUrl);
        blobData = await res.blob();
      }

      if (!blobData) throw new Error("Document data unavailable");

      // 1. Put in ServiceWorker CacheStorage
      if ("caches" in window && sourceUrl) {
        const cache = await caches.open(SW_CACHE_NAME);
        await cache.put(
          sourceUrl,
          new Response(blobData.slice(), {
            headers: { "Content-Type": mime || "application/pdf" },
          })
        );
      }

      // 2. Also notify active ServiceWorker if present
      if (navigator.serviceWorker?.controller && sourceUrl) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_PDF",
          url: sourceUrl,
        });
      }

      // 3. Put in IndexedDB offline storage
      await cacheMaterialOffline({
        id: documentId,
        title,
        mime: mime || "application/pdf",
        ext: "pdf",
        blob: blobData,
        cached_at: Date.now(),
        course_code: courseCode || null,
        source_url: sourceUrl || null,
      });

      setIsSwCached(true);
      toast.success("Document saved to ServiceWorker cache for offline access!");
    } catch (err: any) {
      toast.error(err.message || "Failed to cache for offline");
    } finally {
      setIsCaching(false);
    }
  };

  const handleDownloadCopy = () => {
    if (!pdfSource) return;
    const url = pdfSource instanceof Blob ? URL.createObjectURL(pdfSource) : pdfSource;
    const a = document.createElement("a");
    a.href = url;
    a.download = title.endsWith(".pdf") ? title : `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (pdfSource instanceof Blob) {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    toast.success("Downloaded PDF copy");
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
    setTheme((prev) => {
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
        "fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-none",
        theme === "dark" && "bg-neutral-950 text-neutral-100",
        theme === "sepia" && "bg-[#fbf0d9] text-[#433422]",
        theme === "light" && "bg-neutral-100 text-neutral-900"
      )}
    >
      {/* =========================================================
          TOP VIEWER HEADER (Controls & ServiceWorker Status)
         ========================================================= */}
      <header
        className={cn(
          "h-14 px-3 sm:px-4 flex items-center justify-between border-b shrink-0 shadow-xs z-20 backdrop-blur-md",
          theme === "dark" && "border-neutral-800 bg-neutral-900/90",
          theme === "sepia" && "border-[#e6d5b8] bg-[#f5e5c9]/90",
          theme === "light" && "border-neutral-200 bg-white/95"
        )}
      >
        {/* Document Info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full shrink-0"
            title="Close Viewer"
          >
            <X className="w-5 h-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                {title}
              </h2>
              {courseCode && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0 h-4 border uppercase",
                    theme === "dark" ? "border-amber-500/40 text-amber-400" : "border-amber-600/40 text-amber-700"
                  )}
                >
                  {courseCode}
                </Badge>
              )}
            </div>

            {/* Offline Status Badge */}
            <div className="flex items-center gap-2 text-[10px] opacity-80">
              {isSwCached ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Check className="w-3 h-3" /> ServiceWorker Cached (Offline)
                </span>
              ) : isOfflineMode ? (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                  <WifiOff className="w-3 h-3" /> Offline View
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <FileText className="w-3 h-3" /> React-PDF Viewer
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* ServiceWorker Cache Button */}
          {!isSwCached && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCacheForOffline}
              disabled={isCaching || !pdfSource}
              className="h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
              title="Cache PDF via ServiceWorker for offline reading"
            >
              {isCaching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <CloudDownload className="w-3.5 h-3.5 mr-1" />
              )}
              <span className="hidden sm:inline">Cache Offline</span>
            </Button>
          )}

          {/* Read Later Bookmark */}
          {onToggleReadLater && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleReadLater}
              className={cn("h-8 w-8 rounded-full", isReadLater && "text-amber-500")}
              title={isReadLater ? "In Read Later" : "Add to Read Later"}
            >
              <Bookmark className={cn("w-4 h-4", isReadLater && "fill-current")} />
            </Button>
          )}

          {/* Page Controls */}
          {numPages && numPages > 1 && (
            <div className="flex items-center gap-0.5 border rounded-full px-1 border-border/80">
              <Button
                variant="ghost"
                size="icon"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                className="h-7 w-7 rounded-full"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-[11px] font-mono px-1 min-w-[50px] text-center">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                className="h-7 w-7 rounded-full"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-0.5 border rounded-full px-1 border-border/80">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.15))}
              className="h-7 w-7 rounded-full"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10px] font-mono px-1 min-w-[34px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              className="h-7 w-7 rounded-full"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Rotate */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="hidden sm:inline-flex h-8 w-8 rounded-full"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* Theme switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            className="h-8 w-8 rounded-full"
            title={`Reading background: ${theme}`}
          >
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : theme === "sepia" ? (
              <span className="w-4 h-4 rounded-full bg-[#e6d5b8] border border-[#a8906c]" />
            ) : (
              <Sun className="w-4 h-4 text-amber-600" />
            )}
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex h-8 w-8 rounded-full"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadCopy}
            className="h-8 w-8 rounded-full"
            title="Download PDF copy"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* =========================================================
          REACT-PDF DOCUMENT VIEWPORT
         ========================================================= */}
      <main
        ref={pageContainerRef}
        className={cn(
          "flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start",
          theme === "dark" && "bg-neutral-950",
          theme === "sepia" && "bg-[#f5e8d0]",
          theme === "light" && "bg-neutral-200/60"
        )}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Opening PDF via react-pdf…</p>
            <p className="text-xs opacity-75">Checking ServiceWorker offline cache</p>
          </div>
        ) : loadError ? (
          <div className="max-w-md text-center p-6 rounded-3xl border border-border/80 bg-card/90 shadow-lg my-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1">Cannot Render Document</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{loadError}</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Go Back
              </Button>
              {sourceUrl && (
                <Button size="sm" asChild>
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                    Open Directly
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : pdfSource ? (
          <div
            className={cn(
              "shadow-2xl rounded-sm transition-all duration-150 overflow-hidden",
              theme === "dark" && "brightness-95 contrast-105",
              theme === "sepia" && "sepia-[0.35] brightness-[0.98]"
            )}
          >
            <Document
              file={pdfSource}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setLoading(false);
              }}
              onLoadError={(err) => {
                console.error("react-pdf onLoadError:", err);
                setLoadError("Failed to parse PDF document structure.");
                setLoading(false);
              }}
              loading={
                <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                  <span className="text-xs">Rendering PDF pages…</span>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth * scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="transition-transform duration-100"
              />
            </Document>
          </div>
        ) : null}
      </main>

      {/* Discreet bottom status footer */}
      <footer
        className={cn(
          "h-8 px-4 flex items-center justify-between text-[11px] border-t shrink-0 select-none opacity-80",
          theme === "dark" && "border-neutral-800 bg-neutral-900 text-neutral-400",
          theme === "sepia" && "border-[#e6d5b8] bg-[#f5e5c9] text-[#6a5438]",
          theme === "light" && "border-neutral-200 bg-white text-neutral-600"
        )}
      >
        <span>OverraPrep react-pdf Viewer</span>
        <span>
          {isSwCached ? "Cached in ServiceWorker (offline)" : isOfflineMode ? "Offline" : "Online"}
          {numPages ? ` · Page ${pageNumber} of ${numPages}` : ""}
        </span>
      </footer>
    </div>
  );
}

export default LibraryPdfViewer;
