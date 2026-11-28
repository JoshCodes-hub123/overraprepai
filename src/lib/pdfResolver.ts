import { supabase } from "@/integrations/supabase/client";

export const KNOWN_STORAGE_BUCKETS = [
  "lecture-notes",
  "study-materials",
  "post-media",
  "community-media",
  "course_materials",
  "tutor-materials",
  "user-resources",
] as const;

export class PdfFileMissingError extends Error {
  public readonly code = "FILE_MISSING";
  constructor(message?: string) {
    super(
      message ||
        "The original uploaded PDF file could not be found in storage. Please re-upload it in the Admin Upload Studio."
    );
    this.name = "PdfFileMissingError";
  }
}

export interface ResolvePdfOptions {
  id?: string | null;
  title?: string | null;
  courseCode?: string | null;
  fileUrl?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  description?: string | null;
  content?: string | null;
  allowGeneratedFallback?: boolean;
}

export interface VerifiedPdfResult {
  blob: Blob;
  source: "direct" | "proxy" | "supabase-storage" | "refreshed-signed" | "generated";
  resolvedUrl?: string;
}

export interface CloudUploadResult {
  ok: boolean;
  bucket?: string;
  filePath?: string;
  fileUrl?: string;
  verified?: boolean;
  verifiedBytes?: number;
  error?: string;
}

/**
 * Returns true if this record represents an uploaded binary document (PDF, Office doc, etc.)
 * rather than a text/markdown note. Uploaded binary documents must NEVER be silently replaced
 * with a generated 3-line "STUDY HANDOUT" stub PDF.
 */
export function isUploadedBinaryFile(
  fileUrl?: string | null,
  fileType?: string | null
): boolean {
  const ft = (fileType || "").trim().toLowerCase();
  const url = (fileUrl || "").trim();

  if (
    ft === "markdown" ||
    ft === "md" ||
    ft === "text" ||
    ft === "text/plain" ||
    ft === "text/markdown" ||
    /^data:text\//i.test(url) ||
    /\.(md|txt)(\?|$)/i.test(url)
  ) {
    return false;
  }

  if (
    ft.includes("pdf") ||
    ft.includes("word") ||
    ft.includes("doc") ||
    ft.includes("ppt") ||
    ft.includes("powerpoint") ||
    ft.includes("xls") ||
    ft.includes("image")
  ) {
    return true;
  }

  if (/\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|webp)(\?|$)/i.test(url)) {
    return true;
  }

  if (url.startsWith("/uploads/") || url.includes("/storage/v1/object/")) {
    return true;
  }

  return false;
}

/**
 * Checks whether a Blob starts with a valid PDF header (%PDF- within first 1024 bytes).
 */
export async function isValidPdfBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size < 8) return false;
  try {
    const headerSlice = blob.slice(0, Math.min(blob.size, 1024));
    const text = await headerSlice.text();
    return text.includes("%PDF-");
  } catch {
    return false;
  }
}

/**
 * Detects whether a Blob is actually an HTML page (like SPA index.html fallback)
 * or a JSON error payload rather than a real binary document.
 */
export async function isHtmlOrJsonErrorBlob(blob: Blob): Promise<boolean> {
  if (!blob || blob.size === 0) return true;
  const mime = (blob.type || "").toLowerCase();
  if (mime.includes("text/html") || mime.includes("application/json")) {
    return true;
  }
  try {
    const head = (await blob.slice(0, Math.min(blob.size, 512)).text())
      .trim()
      .toLowerCase();
    if (
      head.startsWith("<!doctype") ||
      head.startsWith("<html") ||
      head.startsWith("<head") ||
      head.startsWith("<body") ||
      head.startsWith('{"statuscode"') ||
      head.startsWith('{"error"') ||
      head.startsWith('{"ok":false') ||
      head.startsWith('{"message"')
    ) {
      return true;
    }
  } catch {
    // ignore read error
  }
  return false;
}

/**
 * Returns true if the URL looks safe to fetch (blocks javascript:, dead blob:, etc.).
 */
export function isSafeDocumentUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^(javascript|vbscript|data:text\/html):/i.test(trimmed)) return false;
  if (trimmed.startsWith("blob:")) return false;
  return (
    trimmed.startsWith("/") ||
    /^https:\/\//i.test(trimmed) ||
    /^http:\/\/(localhost|127\.0\.0\.1)/i.test(trimmed) ||
    /^data:application\/pdf/i.test(trimmed)
  );
}

/**
 * Extracts Supabase Storage bucket + object path from a signed/public URL or explicit filePath.
 * Local ephemeral paths like `/uploads/materials/...` are ignored.
 */
export function extractSupabaseStorageRef(
  fileUrl?: string | null,
  filePath?: string | null
): { bucket: string; path: string } | null {
  const parseStorageUrl = (candidate?: string | null) => {
    if (!candidate) return null;
    const match = candidate.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/?#]+)\/([^?#]+)/i
    );
    if (!match) return null;
    try {
      return {
        bucket: decodeURIComponent(match[1]),
        path: decodeURIComponent(match[2]),
      };
    } catch {
      return { bucket: match[1], path: match[2] };
    }
  };

  const fromUrl = parseStorageUrl(fileUrl);
  if (fromUrl) return fromUrl;

  const fromPathUrl = parseStorageUrl(filePath);
  if (fromPathUrl) return fromPathUrl;

  if (filePath && filePath.trim()) {
    const raw = filePath.trim();
    if (
      raw.startsWith("/uploads/") ||
      raw.startsWith("uploads/") ||
      raw.startsWith("blob:") ||
      raw.startsWith("data:") ||
      /^https?:\/\//i.test(raw)
    ) {
      return null;
    }
    const clean = raw.replace(/^\/+/, "");
    if (!clean) return null;

    for (const b of KNOWN_STORAGE_BUCKETS) {
      if (clean.startsWith(`${b}/`)) {
        return { bucket: b, path: clean.slice(b.length + 1) };
      }
    }
    return { bucket: "lecture-notes", path: clean };
  }

  return null;
}

/**
 * Normalizes a Blob into an application/pdf Blob if it is a verified PDF.
 */
function ensurePdfMime(blob: Blob): Blob {
  if (blob.type === "application/pdf") return blob;
  return new Blob([blob], { type: "application/pdf" });
}

/**
 * Downloads a file directly through the authenticated Supabase Storage SDK across candidate buckets.
 */
export async function downloadFromSupabaseStorage(
  fileUrl?: string | null,
  filePath?: string | null,
  expectPdf = true
): Promise<Blob | null> {
  const ref = extractSupabaseStorageRef(fileUrl, filePath);
  if (!ref) return null;

  const candidateBuckets = Array.from(
    new Set([ref.bucket, ...KNOWN_STORAGE_BUCKETS])
  );

  for (const bucket of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(ref.path);
      if (!error && data && data.size > 0) {
        if (await isHtmlOrJsonErrorBlob(data)) continue;
        if (!expectPdf || (await isValidPdfBlob(data))) {
          return expectPdf ? ensurePdfMime(data) : data;
        }
      }
    } catch {
      // try next bucket
    }
  }
  return null;
}

/**
 * Generates a fresh Supabase Storage signed URL (or public URL) when an existing signed URL has expired
 * or only a storage file_path was saved.
 */
export async function refreshSupabaseSignedUrl(
  fileUrl?: string | null,
  filePath?: string | null
): Promise<string | null> {
  const ref = extractSupabaseStorageRef(fileUrl, filePath);
  if (!ref) return null;

  const candidateBuckets = Array.from(
    new Set([ref.bucket, ...KNOWN_STORAGE_BUCKETS])
  );

  for (const bucket of candidateBuckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(ref.path, 7200);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      // try next bucket
    }
  }

  try {
    const { data } = supabase.storage
      .from(ref.bucket)
      .getPublicUrl(ref.path);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Verifiable permanent cloud upload route:
 * 1. Validates local file integrity (size > 0, <= 50 MB, real %PDF- magic header for PDFs).
 * 2. Requires an authenticated user session so RLS folder ownership (`auth.uid()/...`) passes.
 * 3. Uploads to student-accessible Supabase Storage buckets in priority order:
 *    - `lecture-notes` (admin/tutor write, ALL authenticated students can read unconditionally)
 *    - `study-materials` (any authenticated write, students read when `study_materials.visibility='public'` and exact `file_path = objectKey`)
 *    - `post-media` (public-read bucket fallback)
 * 4. Immediately downloads back & verifies real bytes (`%PDF-` header for PDFs) before returning `verified: true`!
 */
export async function uploadFileToSupabaseStorage(
  file: File,
  opts: { courseId: string; userId?: string | null }
): Promise<CloudUploadResult> {
  if (!file || file.size === 0) {
    return { ok: false, error: "Selected file is empty (0 bytes)." };
  }

  if (file.size > 50 * 1024 * 1024) {
    return {
      ok: false,
      error: `File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB, which exceeds the 50 MB permanent cloud storage limit. Please compress it under 50 MB.`,
    };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf" || file.type === "application/pdf";

  if (isPdf) {
    const validLocalPdf = await isValidPdfBlob(file);
    if (!validLocalPdf) {
      return {
        ok: false,
        error: `"${file.name}" is not a valid PDF file (missing %PDF header). Please check the file on your device.`,
      };
    }
  }

  let uid = opts.userId || null;
  if (!uid) {
    try {
      const { data } = await supabase.auth.getUser();
      uid = data?.user?.id || null;
    } catch {
      uid = null;
    }
  }

  if (!uid) {
    return {
      ok: false,
      error: "Please sign in with your admin or tutor account before uploading documents.",
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const courseSeg = (opts.courseId || "general").replace(/[^a-zA-Z0-9._-]/g, "_");
  // Exact storage.objects.name: `{auth.uid()}/{courseId}/{timestamp}_{filename}`
  const objectKey = `${uid}/${courseSeg}/${Date.now()}_${safeName}`;
  const contentType =
    file.type || (isPdf ? "application/pdf" : "application/octet-stream");

  const uploadBuckets: Array<{ id: string; isPublic: boolean }> = [
    { id: "lecture-notes", isPublic: false },
    { id: "study-materials", isPublic: false },
    { id: "post-media", isPublic: true },
  ];

  const attemptErrors: string[] = [];

  for (const { id: bucket, isPublic } of uploadBuckets) {
    try {
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(objectKey, file, {
          contentType,
          cacheControl: "3600",
          upsert: true,
        });

      if (upErr) {
        attemptErrors.push(`${bucket}: ${upErr.message}`);
        continue;
      }

      // Live round-trip verification: read back from cloud storage & verify real bytes
      const { data: verifyBlob, error: dlErr } = await supabase.storage
        .from(bucket)
        .download(objectKey);

      if (dlErr || !verifyBlob || verifyBlob.size === 0) {
        attemptErrors.push(`${bucket}: uploaded but failed readback (${dlErr?.message || "empty"})`);
        continue;
      }

      if (isPdf && !(await isValidPdfBlob(verifyBlob))) {
        attemptErrors.push(`${bucket}: readback failed %PDF- integrity check`);
        continue;
      }

      let resolvedUrl = "";
      if (isPublic) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
        resolvedUrl = pub?.publicUrl || "";
      } else {
        const { data: signed } = await supabase.storage
          .from(bucket)
          .createSignedUrl(objectKey, 60 * 60 * 24 * 30);
        resolvedUrl = signed?.signedUrl || "";
      }

      if (!resolvedUrl) {
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
        resolvedUrl = pub?.publicUrl || "";
      }

      return {
        ok: true,
        bucket,
        filePath: objectKey,
        fileUrl: resolvedUrl,
        verified: true,
        verifiedBytes: verifyBlob.size,
      };
    } catch (err: any) {
      attemptErrors.push(`${bucket}: ${err?.message || "network error"}`);
    }
  }

  return {
    ok: false,
    error: `Cloud upload failed (${attemptErrors.join(" | ") || "storage unavailable"}).`,
  };
}

/**
 * Live student-perspective verification check for any material row.
 * Proves the real file can be fetched and passes PDF/content validation.
 */
export async function verifyMaterialAccessible(opts: {
  id?: string | null;
  title?: string | null;
  courseCode?: string | null;
  fileUrl?: string | null;
  filePath?: string | null;
  fileType?: string | null;
}): Promise<{ ok: boolean; bytes?: number; source?: string; error?: string }> {
  try {
    const result = await fetchVerifiedPdfBlob({
      id: opts.id,
      title: opts.title,
      courseCode: opts.courseCode,
      fileUrl: opts.fileUrl,
      filePath: opts.filePath,
      fileType: opts.fileType,
      allowGeneratedFallback: false,
    });
    return {
      ok: true,
      bytes: result.blob.size,
      source: result.source,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Document could not be verified.",
    };
  }
}

/**
 * Builds the server inline PDF proxy URL for a given document.
 */
export function buildViewPdfProxyUrl(opts: {
  url?: string | null;
  id?: string | null;
  title?: string | null;
  courseCode?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.url) params.set("url", opts.url);
  if (opts.id) params.set("id", opts.id);
  if (opts.title) params.set("title", opts.title);
  if (opts.courseCode) params.set("courseCode", opts.courseCode);
  return `/api/view-pdf?${params.toString()}`;
}

/**
 * Fetches and verifies a real PDF Blob from proxy, direct URL, authenticated Supabase Storage,
 * or refreshed signed URL.
 *
 * IMPORTANT: Never silently replaces a missing uploaded binary PDF with a generated
 * "STUDY HANDOUT" stub PDF. Generated PDFs are ONLY allowed for genuine text/markdown notes.
 */
export async function fetchVerifiedPdfBlob(
  opts: ResolvePdfOptions
): Promise<VerifiedPdfResult> {
  const cleanUrl = (opts.fileUrl || "").trim();
  const safeUrl = isSafeDocumentUrl(cleanUrl) ? cleanUrl : null;
  const isUploadedBinary = isUploadedBinaryFile(cleanUrl, opts.fileType);

  const tryFetchPdf = async (targetUrl: string): Promise<Blob | null> => {
    try {
      const res = await fetch(targetUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      if (await isHtmlOrJsonErrorBlob(blob)) return null;
      if (await isValidPdfBlob(blob)) {
        return ensurePdfMime(blob);
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1. Handle inline data:application/pdf base64 URLs directly
  if (safeUrl && /^data:application\/pdf/i.test(safeUrl)) {
    const blob = await tryFetchPdf(safeUrl);
    if (blob) {
      return { blob, source: "direct", resolvedUrl: safeUrl };
    }
  }

  // 2. Try authenticated Supabase Storage SDK download FIRST when a storage ref is present
  const storageBlob = await downloadFromSupabaseStorage(
    cleanUrl,
    opts.filePath,
    true
  );
  if (storageBlob) {
    return { blob: storageBlob, source: "supabase-storage" };
  }

  // 3. Try server-side /api/view-pdf proxy (handles local disk & allowlisted HTTPS URLs)
  if (safeUrl || opts.id) {
    const proxyUrl = buildViewPdfProxyUrl({
      url: safeUrl,
      id: opts.id,
      title: opts.title,
      courseCode: opts.courseCode,
    });
    const proxyBlob = await tryFetchPdf(proxyUrl);
    if (proxyBlob) {
      return { blob: proxyBlob, source: "proxy", resolvedUrl: proxyUrl };
    }
  }

  // 4. Try direct fetch
  if (safeUrl) {
    const directBlob = await tryFetchPdf(safeUrl);
    if (directBlob) {
      return { blob: directBlob, source: "direct", resolvedUrl: safeUrl };
    }
  }

  // 5. Refresh expired Supabase Storage signed URL using fileUrl or filePath
  const refreshedUrl = await refreshSupabaseSignedUrl(cleanUrl, opts.filePath);
  if (refreshedUrl) {
    const refreshedBlob = await tryFetchPdf(refreshedUrl);
    if (refreshedBlob) {
      return {
        blob: refreshedBlob,
        source: "refreshed-signed",
        resolvedUrl: refreshedUrl,
      };
    }
  }

  // 6. Optional fallback: generate a readable PDF study handout ONLY for text/markdown notes
  if (opts.allowGeneratedFallback === true && !isUploadedBinary) {
    const bodyText =
      opts.content ||
      opts.description ||
      `${opts.courseCode ? `${opts.courseCode} — ` : ""}${opts.title || "Course Document"}`;
    try {
      const genRes = await fetch("/api/generate-note-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: opts.title || "Course Document",
          courseCode: opts.courseCode || "COURSE",
          content: bodyText,
        }),
      });
      if (genRes.ok) {
        const genBlob = await genRes.blob();
        if (await isValidPdfBlob(genBlob)) {
          return {
            blob: ensurePdfMime(genBlob),
            source: "generated",
          };
        }
      }
    } catch {
      // fall through to throw
    }
  }

  if (isUploadedBinary) {
    throw new PdfFileMissingError(
      `The original PDF file for "${opts.title || "this document"}" is missing from storage. Please re-upload it in the Admin Upload Studio.`
    );
  }

  throw new Error("Unable to load a valid PDF document.");
}
