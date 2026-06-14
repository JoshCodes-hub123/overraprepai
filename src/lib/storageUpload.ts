import { supabase } from "@/integrations/supabase/client";
import { compressImageToWebP } from "@/lib/imageCompress";

export interface UploadResult {
  publicUrl: string;
  bucket: string;
  path: string;
  durationMs: number;
  /** Bytes saved by client-side WebP compression (0 if not applied). */
  bytesSaved?: number;
}

/**
 * Upload a file (or Blob) to a public Supabase storage bucket and verify
 * the resulting URL is actually fetchable. Logs diagnostic info to the
 * console so users can see exact storage path + status when debugging.
 */
export async function uploadToBucketWithVerification(opts: {
  bucket: string;
  path: string; // e.g. `${userId}/avatar.jpg`
  file: Blob | File;
  contentType?: string;
}): Promise<UploadResult> {
  const { bucket, path, file, contentType } = opts;
  const start = performance.now();

  console.groupCollapsed(`[upload] → ${bucket}/${path}`);
  console.log("size:", file.size, "bytes", "type:", (file as File).type || contentType);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: contentType || (file as File).type || "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[upload] supabase error:", uploadError);
    console.groupEnd();
    throw new Error(uploadError.message || "Upload failed");
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  // Cache-bust so freshly uploaded files don't show a stale CDN copy
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
  console.log("[upload] public URL:", publicUrl);

  // Verify the image actually loads (catches RLS / cache / mime issues early)
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    const timeout = window.setTimeout(() => {
      reject(new Error("Image preflight timed out"));
    }, 8000);
    img.onload = () => {
      window.clearTimeout(timeout);
      console.log("[upload] preflight OK", img.naturalWidth, "x", img.naturalHeight);
      resolve();
    };
    img.onerror = (e) => {
      window.clearTimeout(timeout);
      console.error("[upload] preflight failed", e);
      reject(new Error("Uploaded file is not viewable"));
    };
    img.src = publicUrl;
  });

  const durationMs = Math.round(performance.now() - start);
  console.log("[upload] done in", durationMs, "ms");
  console.groupEnd();

  return { publicUrl, bucket, path, durationMs };
}
