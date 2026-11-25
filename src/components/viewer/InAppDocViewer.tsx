import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Download, Loader2, FileText, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";

interface Props {
  url: string;
  title: string;
  fileType?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function InAppDocViewer({ url, title, fileType, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const isImage =
    (fileType?.startsWith("image/") ?? false) || /\.(png|jpe?g|webp|gif)$/i.test(url);
  const isPdf = fileType === "application/pdf" || /\.pdf(\?|$)/i.test(url);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
  }, [open, url]);

  const watermark = user?.email ?? "OverraPrep";
  const viewerUrl = isPdf
    ? `${url}#view=FitH`
    : isImage
      ? url
      : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

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
                title,
                fileUrl: url,
                fileType,
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
          className="absolute top-2.5 right-2.5 z-30 h-9 w-9 rounded-full bg-white/90 border border-amber-200 hover:bg-amber-50 flex items-center justify-center"
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
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
          {isImage ? (
            <img
              src={viewerUrl}
              alt={title}
              draggable={false}
              onLoad={() => setLoading(false)}
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={viewerUrl}
              title={title}
              onLoad={() => setLoading(false)}
              className="w-full h-full border-0"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          )}

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