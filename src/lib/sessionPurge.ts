/**
 * User session & account switch cache purge utility.
 * Ensures zero cross-account data bleed and pristine state upon sign-out
 * or when switching accounts.
 */

export function purgeUserSessionData(previousUserId?: string | null) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;

    // Keys with prefix patterns to purge
    const keysToRemove: string[] = [
      "overra_intended_deep_link",
      "overra_content_admin_cascade",
      "admin_content_pinned_scope",
      "admin_content_recent_scopes",
    ];

    // Scan localStorage for user-scoped or environment-scoped cached items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (
        key.startsWith("overra_last_route:") ||
        key.startsWith("overra.avatar.") ||
        key.startsWith("overra-rq-cache") ||
        key.startsWith("audio-resume:") ||
        key.startsWith("quiz_autosave_") ||
        key.startsWith("overra_tour_") ||
        (previousUserId && key.includes(previousUserId))
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove matching keys
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });

    // Clear session storage flags (retain manual signout indicator if present)
    const isManual = sessionStorage.getItem("overra_manual_signout");
    sessionStorage.clear();
    if (isManual) {
      sessionStorage.setItem("overra_manual_signout", isManual);
    }

    // Broadcast session purge event for in-memory stores and QueryClient
    window.dispatchEvent(new CustomEvent("overra:session_purged", { detail: { previousUserId } }));
  } catch (err) {
    console.warn("[sessionPurge] Error during session purge:", err);
  }
}
