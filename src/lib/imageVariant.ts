/**
 * Build a smaller/cheaper image URL when possible.
 *
 * For Supabase Storage public URLs (`/storage/v1/object/public/...`)
 * we rewrite to the image-rendering endpoint with `width` + `quality`
 * so the browser downloads a much smaller file. Falls back to the
 * original URL for any non-Supabase source.
 */
export function imageVariant(
  url: string | null | undefined,
  opts: { width?: number; quality?: number } = {}
): string {
  if (!url) return "";
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://x");
    // Only transform Supabase storage URLs
    if (!/\/storage\/v1\/object\/public\//.test(u.pathname)) return url;
    u.pathname = u.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    if (opts.width) u.searchParams.set("width", String(Math.round(opts.width)));
    if (opts.quality) u.searchParams.set("quality", String(Math.round(opts.quality)));
    u.searchParams.set("resize", "contain");
    return u.toString();
  } catch {
    return url;
  }
}
