import { toast } from "sonner";

export interface DownloadMaterialOptions {
  id?: string | null;
  title: string;
  courseCode?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  description?: string | null;
  content?: string | null;
}

/**
 * Formats a clean, filesystem-safe filename for external device downloads.
 */
export function buildDownloadFilename(opts: {
  title: string;
  courseCode?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  defaultExt?: string;
}): string {
  const prefix = opts.courseCode
    ? `${opts.courseCode.trim().replace(/\s+/g, "_")}_`
    : "";
  const rawBase = `${prefix}${opts.title || "Course_Material"}`
    .replace(/[^a-zA-Z0-9._-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 90);

  // Detect extension from fileUrl or fileType
  let ext = opts.defaultExt || "pdf";
  const urlPath = (opts.fileUrl || "").split("?")[0].split("#")[0];
  const urlMatch = urlPath.match(/\.([a-zA-Z0-9]{2,5})$/);
  if (urlMatch) {
    ext = urlMatch[1].toLowerCase();
  } else if (opts.fileType) {
    const ft = opts.fileType.toLowerCase();
    if (ft.includes("pdf")) ext = "pdf";
    else if (ft.includes("word") || ft.includes("docx")) ext = "docx";
    else if (ft.includes("doc")) ext = "doc";
    else if (ft.includes("powerpoint") || ft.includes("pptx")) ext = "pptx";
    else if (ft.includes("png")) ext = "png";
    else if (ft.includes("jpg") || ft.includes("jpeg")) ext = "jpg";
  }

  if (rawBase.toLowerCase().endsWith(`.${ext}`)) {
    return rawBase;
  }
  return `${rawBase}.${ext}`;
}

/**
 * Triggers a browser/OS file download from a Blob without opening blocked popups.
 */
function triggerBlobSave(blob: Blob, filename: string) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15_000);
}

/**
 * Downloads an uploaded course document or study material directly to the student's
 * external device storage (Downloads folder on mobile/desktop).
 */
export async function downloadMaterialExternally(
  opts: DownloadMaterialOptions
): Promise<void> {
  const toastId = toast.loading(`Preparing "${opts.title}" for download…`);

  try {
    // 1. Try the server download endpoint by material ID first (generates/streams PDF with attachment header)
    if (opts.id) {
      const res = await fetch(
        `/api/materials/${encodeURIComponent(opts.id)}/download`
      );
      if (res.ok) {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const filename =
          match?.[1] ||
          buildDownloadFilename({
            title: opts.title,
            courseCode: opts.courseCode,
            fileUrl: opts.fileUrl,
            fileType: opts.fileType,
            defaultExt: "pdf",
          });
        triggerBlobSave(blob, filename);
        toast.success(`Downloaded "${filename}" to your device`, {
          id: toastId,
        });
        return;
      }
    }

    // 2. If a fileUrl is present, download via /api/download-file proxy or direct fetch
    if (opts.fileUrl) {
      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        opts.fileUrl
      )}&title=${encodeURIComponent(
        opts.title || "Course_Document"
      )}&courseCode=${encodeURIComponent(opts.courseCode || "")}`;

      let res = await fetch(proxyUrl);
      if (!res.ok) {
        res = await fetch(opts.fileUrl);
      }

      if (res.ok) {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/i);
        const filename =
          match?.[1] ||
          buildDownloadFilename({
            title: opts.title,
            courseCode: opts.courseCode,
            fileUrl: opts.fileUrl,
            fileType: opts.fileType,
            defaultExt: "pdf",
          });
        triggerBlobSave(blob, filename);
        toast.success(`Downloaded "${filename}" to your device`, {
          id: toastId,
        });
        return;
      }
    }

    // 3. If text/description content is available (or offline), generate a PDF via /api/generate-note-pdf or local text file
    const bodyText =
      opts.content ||
      opts.description ||
      `${opts.courseCode ? opts.courseCode + " — " : ""}${opts.title}`;

    try {
      const pdfRes = await fetch("/api/generate-note-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title,
          courseCode: opts.courseCode || "COURSE",
          content: bodyText,
        }),
      });
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        const filename = buildDownloadFilename({
          title: opts.title,
          courseCode: opts.courseCode,
          defaultExt: "pdf",
        });
        triggerBlobSave(blob, filename);
        toast.success(`Downloaded "${filename}" to your device`, {
          id: toastId,
        });
        return;
      }
    } catch {
      // Offline fallback below
    }

    // 4. Ultimate offline fallback: save as clean .txt study note
    const txtContent = `${opts.courseCode ? opts.courseCode + " — " : ""}${opts.title}\n${"=".repeat(60)}\n\n${bodyText}\n`;
    const txtBlob = new Blob([txtContent], {
      type: "text/plain;charset=utf-8",
    });
    const txtFilename = buildDownloadFilename({
      title: opts.title,
      courseCode: opts.courseCode,
      defaultExt: "txt",
    });
    triggerBlobSave(txtBlob, txtFilename);
    toast.success(`Downloaded "${txtFilename}" to your device`, {
      id: toastId,
    });
  } catch (err: any) {
    console.error("Material download failed:", err);
    toast.error("Could not download file. Please try again.", { id: toastId });
  }
}
