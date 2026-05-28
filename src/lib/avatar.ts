/**
 * Single source of truth for resolving a user's avatar image URL.
 * Prefers profile_image_url (newer field), falls back to avatar_url, then null.
 * Skips temporary `blob:` previews so a half-uploaded preview never leaks out.
 */
export function resolveAvatarUrl(profile: any | null | undefined): string | undefined {
  if (!profile) return undefined;
  const candidates = [profile.profile_image_url, profile.avatar_url];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0 && !c.startsWith("blob:")) return c;
  }
  return undefined;
}

export function initialsFor(name: string | null | undefined, fallback = "U"): string {
  if (!name) return fallback;
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || fallback;
}
