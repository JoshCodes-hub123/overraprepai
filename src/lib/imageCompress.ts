/**
 * Client-side image compression → WebP.
 *
 * Why: most slowness on 2G/3G is image weight. Tutor question images and
 * profile covers routinely arrive as 3–8 MB JPEG/PNG straight from a phone
 * camera. Re-encoding to WebP at upload time typically cuts size 60–85%
 * with no visible quality loss, and the savings compound for every student
 * who later loads that image.
 *
 * Safe-by-default: if the browser can't encode WebP (very rare) or the file
 * isn't actually an image, returns the original file unchanged.
 */

export interface CompressOpts {
  /** Max edge in pixels. Default 1600 — fine for question images and covers. */
  maxEdge?: number;
  /** WebP quality 0–1. Default 0.82 — visually lossless for photos. */
  quality?: number;
  /** Skip compression if file is already smaller than this (bytes). Default 120 KB. */
  skipIfSmallerThan?: number;
}

export interface CompressResult {
  blob: Blob;
  /** Final mime type (image/webp when compressed, original otherwise). */
  type: string;
  /** Suggested filename (original stem + .webp when compressed). */
  filename: string;
  originalBytes: number;
  finalBytes: number;
  /** True when we actually re-encoded; false when we returned the original. */
  compressed: boolean;
}

const DEFAULTS: Required<CompressOpts> = {
  maxEdge: 1600,
  quality: 0.82,
  skipIfSmallerThan: 120 * 1024,
};

function isImage(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp|heic|heif)$/i.test(file.type || "");
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

export async function compressImageToWebP(
  file: File,
  opts: CompressOpts = {},
): Promise<CompressResult> {
  const o = { ...DEFAULTS, ...opts };
  const base = {
    blob: file,
    type: file.type || "application/octet-stream",
    filename: file.name,
    originalBytes: file.size,
    finalBytes: file.size,
    compressed: false,
  };

  if (!isImage(file)) return base;
  if (file.size < o.skipIfSmallerThan && /webp|jpeg|jpg/i.test(file.type)) return base;

  try {
    const img = await loadImage(file);
    const { width, height } = img;
    const scale = Math.min(1, o.maxEdge / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return base;
    ctx.drawImage(img, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", o.quality),
    );
    if (!blob || blob.size >= file.size) return base; // never make it worse

    const stem = file.name.replace(/\.[^.]+$/, "");
    return {
      blob,
      type: "image/webp",
      filename: `${stem}.webp`,
      originalBytes: file.size,
      finalBytes: blob.size,
      compressed: true,
    };
  } catch {
    return base;
  }
}
