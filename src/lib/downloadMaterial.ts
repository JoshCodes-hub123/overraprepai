import { toast } from "sonner";
import {
  downloadFromSupabaseStorage,
  isHtmlOrJsonErrorBlob,
  isSafeDocumentUrl,
  isUploadedBinaryFile,
  isValidPdfBlob,
  refreshSupabaseSignedUrl,
} from "@/lib/pdfResolver";

export interface DownloadMaterialOptions {
  id?: string | null;
  title: string;
  courseCode?: string | null;
  fileUrl?: string | null;
  filePath?: string | null;
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
    else if (ft.includes("markdown") || ft.includes("md")) ext = "pdf";
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
 * Validates that a fetched Blob is genuinely a downloadable document (never HTML index.html or JSON error).
 */
async function isAcceptableDownloadBlob(
  blob: Blob,
  expectPdf: boolean
): Promise<boolean> {
  if (!blob || blob.size === 0) return false;
  if (await isHtmlOrJsonErrorBlob(blob)) return false;
  if (expectPdf) {
    return isValidPdfBlob(blob);
  }
  return true;
}

/**
 * Downloads an uploaded course document or study material directly to the student's
 * external device storage (Downloads folder on mobile/desktop).
 *
 * IMPORTANT: Never silently replaces a missing uploaded PDF with a fake 3-line
 * "STUDY HANDOUT" stub PDF. Shows an honest error if the original uploaded file is missing.
 */
export async function downloadMaterialExternally(
  opts: DownloadMaterialOptions
): Promise<void> {
  const toastId = toast.loading(`Preparing "${opts.title}" for download…`);

  const targetFilename = buildDownloadFilename({
    title: opts.title,
    courseCode: opts.courseCode,
    fileUrl: opts.fileUrl,
    fileType: opts.fileType,
    defaultExt: "pdf",
  });
  const expectPdf = targetFilename.toLowerCase().endsWith(".pdf");
  const cleanUrl = (opts.fileUrl || "").trim();
  const isUploadedBinary = isUploadedBinaryFile(cleanUrl, opts.fileType);

  const tryFetchAndSave = async (
    urlToFetch: string,
    fallbackName: string,
    checkPdf: boolean
  ): Promise<boolean> => {
    try {
      const res = await fetch(urlToFetch);
      if (!res.ok) return false;
      const blob = await res.blob();
      if (!(await isAcceptableDownloadBlob(blob, checkPdf))) {
        return false;
      }
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || fallbackName;
      const finalBlob =
        checkPdf && blob.type !== "application/pdf"
          ? new Blob([blob], { type: "application/pdf" })
          : blob;
      triggerBlobSave(finalBlob, filename);
      toast.success(`Downloaded "${filename}" to your device`, {
        id: toastId,
      });
      return true;
    } catch {
      return false;
    }
  };

  try {
    const hasSafeUrl = isSafeDocumentUrl(cleanUrl);

    // 1. Prioritize streaming the actual uploaded file via server proxy then direct URL
    if (hasSafeUrl) {
      const proxyUrl = `/api/download-file?url=${encodeURIComponent(
        cleanUrl
      )}&title=${encodeURIComponent(
        opts.title || "Course_Document"
      )}&courseCode=${encodeURIComponent(opts.courseCode || "")}`;

      if (await tryFetchAndSave(proxyUrl, targetFilename, expectPdf)) {
        return;
      }

      if (await tryFetchAndSave(cleanUrl, targetFilename, expectPdf)) {
        return;
      }
    }

    // 2. Try authenticated Supabase Storage SDK download directly
    if (cleanUrl || opts.filePath) {
      const storageBlob = await downloadFromSupabaseStorage(
        cleanUrl,
        opts.filePath,
        expectPdf
      );
      if (storageBlob && (await isAcceptableDownloadBlob(storageBlob, expectPdf))) {
        triggerBlobSave(storageBlob, targetFilename);
        toast.success(`Downloaded "${targetFilename}" to your device`, {
          id: toastId,
        });
        return;
      }
    }

    // 3. Try refreshing an expired Supabase Storage signed URL
    if (cleanUrl || opts.filePath) {
      const refreshedUrl = await refreshSupabaseSignedUrl(cleanUrl, opts.filePath);
      if (refreshedUrl) {
        if (await tryFetchAndSave(refreshedUrl, targetFilename, expectPdf)) {
          return;
        }
      }
    }

    // 4. Try server download endpoint by material ID (streams physical file if present)
    if (opts.id) {
      const qs = new URLSearchParams();
      if (hasSafeUrl) qs.set("fileUrl", cleanUrl);
      if (opts.title) qs.set("title", opts.title);
      if (opts.courseCode) qs.set("courseCode", opts.courseCode);
      const queryStr = qs.toString() ? `?${qs.toString()}` : "";
      if (
        await tryFetchAndSave(
          `/api/materials/${encodeURIComponent(opts.id)}/download${queryStr}`,
          targetFilename,
          expectPdf
        )
      ) {
        return;
      }
    }

    // 5. If this is an uploaded binary file (PDF/Word/Slides) whose original file is missing,
    // DO NOT fabricate a deceptive 3-line "STUDY HANDOUT" PDF! Tell the user honestly.
    if (isUploadedBinary) {
      toast.error(
        `The original file for "${opts.title}" is missing from server storage. An admin needs to re-upload this PDF in Upload Studio.`,
        { id: toastId, duration: 7000 }
      );
      return;
    }

    // 6. Genuine text/markdown study notes (not uploaded PDFs): generate a clean handout PDF from the note text
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
        if (await isAcceptableDownloadBlob(blob, true)) {
          const filename = buildDownloadFilename({
            title: opts.title,
            courseCode: opts.courseCode,
            defaultExt: "pdf",
          });
          triggerBlobSave(
            new Blob([blob], { type: "application/pdf" }),
            filename
          );
          toast.success(`Downloaded "${filename}" to your device`, {
            id: toastId,
          });
          return;
        }
      }
    } catch {
      // Offline text note fallback below
    }

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
