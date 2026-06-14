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
  /** Skip the automatic WebP image compression (default: enabled for images). */
  noCompress?: boolean;
}): Promise<UploadResult> {
  const { bucket, path: inputPath, file: inputFile, contentType, noCompress } = opts;
  const start = performance.now();

  // Auto-compress image File uploads to WebP (huge savings on 2G/3G).
  let file: Blob | File = inputFile;
  let path = inputPath;
  let resolvedContentType = contentType || (inputFile as File).type || "image/jpeg";
  let bytesSaved = 0;

  if (!noCompress && inputFile instanceof File && /^image\//.test(inputFile.type)) {
    try {
      const c = await compressImageToWebP(inputFile);
      if (c.compressed) {
        file = c.blob;
        resolvedContentType = c.type;
        bytesSaved = c.originalBytes - c.finalBytes;
        // Swap extension to .webp so the stored object matches its content
        path = inputPath.replace(/\.(jpe?g|png|gif|heic|heif|bmp|tiff?)$/i, ".webp");
      }
    } catch {
      // Fall through with original
    }
  }

  console.groupCollapsed(`[upload] → ${bucket}/${path}`);
  console.log("size:", file.size, "bytes", "type:", resolvedContentType, "saved:", bytesSaved);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      upsert: true,
      contentType: resolvedContentType,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[upload] supabase error:", uploadError);
    console.groupEnd();
    throw new Error(uploadError.message || "Upload failed");
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
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

  return { publicUrl, bucket, path, durationMs, bytesSaved };
}
