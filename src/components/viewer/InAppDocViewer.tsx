import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Loader2, FileText, X, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";
import {
  fetchVerifiedPdfBlob,
  isSafeDocumentUrl,
  isUploadedBinaryFile,
  PdfFileMissingError,
} from "@/lib/pdfResolver";

interface Props {
  id?: string | null;
  url: string;
  filePath?: string | null;
  title: string;
  courseCode?: string | null;
  description?: string | null;
  fileType?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function InAppDocViewer({
  id,
  url,
  filePath,
  title,
  courseCode,
  description,
  fileType,
  open,
  onOpenChange,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resolvedBlobUrl, setResolvedBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMissingFile, setIsMissingFile] = useState(false);

  const isImage =
    (fileType?.startsWith("image/") ?? false) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  const isPdf =
    (fileType?.toLowerCase().includes("pdf") ?? false) ||
    /\.pdf(\?|$)/i.test(url) ||
    (!isImage && !/\.(docx?|pptx?|xlsx?)(\?|$)/i.test(url));

  useEffect(() => {
    if (!open) return;

    let active = true;
    let objectUrl: string | null = null;
    setLoading(true);
    setErrorMsg(null);
    setIsMissingFile(false);
    setResolvedBlobUrl(null);

    if (isPdf) {
      fetchVerifiedPdfBlob({
        id,
        title,
        courseCode,
        fileUrl: url,
        filePath,
        fileType,
        description,
        allowGeneratedFallback: !isUploadedBinaryFile(url, fileType),
      })
        .then(({ blob }) => {
          if (!active) return;
          objectUrl = URL.createObjectURL(blob);
          setResolvedBlobUrl(objectUrl);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          if (err instanceof PdfFileMissingError || err?.code === "FILE_MISSING") {
            setIsMissingFile(true);
            setErrorMsg(
              "The original uploaded PDF file is no longer in temporary server storage. An admin needs to re-upload this PDF in the Upload Studio so it is saved permanently to cloud storage."
            );
          } else {
            setErrorMsg("This PDF could not be previewed inline. Use Download to Device to save a copy.");
          }
          setLoading(false);
        });
    } else if (!isSafeDocumentUrl(url)) {
      setErrorMsg("Document link is unavailable for preview.");
      setLoading(false);
    }

    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [open, url, filePath, id, title, courseCode, description, fileType, isPdf]);

  const watermark = user?.email ?? "OverraPrep";
  const safeExternalUrl = isSafeDocumentUrl(url) ? url : "";
  const officeViewerUrl = safeExternalUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(safeExternalUrl)}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <div className="absolute top-2.5 left-3 z-30 flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50/95 backdrop-blur border border-amber-200 px-2.5 py-1.5 rounded-lg shadow-2xs">
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{title}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              void downloadMaterialExternally({
                id,
                title,
                courseCode,
                fileUrl: url,
                filePath,
                fileType,
                description,
              })
            }
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-600 px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download to Device</span>
          </button>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => onOpenChange(false)}
          className="absolute top-2.5 right-2.5 z-30 h-9 w-9 rounded-full bg-white/90 border border-amber-200 hover:bg-amber-50 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4 text-amber-800" />
        </button>

        <div
          className="relative w-full h-full bg-neutral-100 select-none"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
          }}
        >
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-muted-foreground bg-neutral-100/90">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
              <span className="text-xs font-medium">Loading document…</span>
            </div>
          )}

          {errorMsg ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-neutral-100">
              <div className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 shadow-sm space-y-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-neutral-900">
                  {isMissingFile ? "Original PDF File Needs Re-Upload" : "Preview Unavailable"}
                </h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{errorMsg}</p>
                {!isMissingFile && (
                  <button
                    type="button"
                    onClick={() =>
                      void downloadMaterialExternally({
                        id,
                        title,
                        courseCode,
                        fileUrl: url,
                        filePath,
                        fileType,
                        description,
                      })
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-950 bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download to Device</span>
                  </button>
                )}
              </div>
            </div>
          ) : isImage ? (
            <img
              src={safeExternalUrl}
              alt={title}
              draggable={false}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setErrorMsg("Could not load image preview.");
              }}
              className="w-full h-full object-contain"
            />
          ) : isPdf ? (
            resolvedBlobUrl ? (
              <iframe
                src={`${resolvedBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
                title={title}
                onLoad={() => setLoading(false)}
                className="w-full h-full border-0"
              />
            ) : null
          ) : officeViewerUrl ? (
            <iframe
              src={officeViewerUrl}
              title={title}
              onLoad={() => setLoading(false)}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : null}

          {/* Diagonal tiled watermark */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ mixBlendMode: "multiply" }}
          >
            <div
              className="absolute -inset-1/4 origin-center"
              style={{
                transform: "rotate(-28deg)",
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0, transparent 110px, rgba(0,0,0,0.06) 110px, rgba(0,0,0,0.06) 111px)",
              }}
            >
              <div className="flex flex-wrap gap-x-20 gap-y-16 text-amber-900/15 font-bold text-[18px] tracking-[0.2em] uppercase whitespace-nowrap p-10">
                {Array.from({ length: 80 }).map((_, i) => (
                  <span key={i}>{watermark} · OverraPrep</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InAppDocViewer;