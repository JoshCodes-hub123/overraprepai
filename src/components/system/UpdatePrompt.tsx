import { useEffect, useRef, useState } from "react";
import { Sparkles, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Build-time version injected by Vite (see vite.config.ts).
declare const __APP_VERSION__: string;

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const DISMISS_KEY = "overra_update_banner_dismissed_for";

/**
 * Slim, non-blocking "Update available" banner pinned to the top of the app.
 * Polls /version.json and appears whenever a new build is live. Users can tap
 * Refresh to upgrade instantly, or dismiss — but it returns on the next app
 * open until they actually update.
 */
export default function UpdatePrompt() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentVersion = useRef<string>(
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : ""
  );

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (cancelled || !data?.version) return;
        if (currentVersion.current && data.version !== currentVersion.current) {
          setLatestVersion(data.version);
          // Re-show the banner unless the user dismissed *this exact* version
          try {
            const d = localStorage.getItem(DISMISS_KEY);
            setDismissed(d === data.version);
          } catch { setDismissed(false); }
        }
      } catch { /* network blip */ }
    };

    const initial = window.setTimeout(check, 4_000);
    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
    };
  }, []);

  const handleUpgrade = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch { /* ignore */ }
    try { localStorage.removeItem(DISMISS_KEY); } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  };

  const handleDismiss = () => {
    if (latestVersion) {
      try { localStorage.setItem(DISMISS_KEY, latestVersion); } catch {}
    }
    setDismissed(true);
  };

  if (!latestVersion || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[60] flex justify-center px-3 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
    >
      <div className="pointer-events-auto w-full max-w-2xl flex items-center gap-2 sm:gap-3 rounded-2xl border border-amber-300/70 bg-gradient-to-r from-amber-50 to-white shadow-xl shadow-amber-500/20 px-3 py-2.5 animate-fade-in">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/30">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold text-foreground truncate">
            Update available
          </p>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">
            A new version of OverraPrep is ready. Refresh to get the latest features.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleUpgrade}
          disabled={refreshing}
          className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold h-9 px-3"
        >
          {refreshing ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…</>
          ) : (
            <><RefreshCw className="h-3.5 w-3.5" /> Refresh</>
          )}
        </Button>
        <button
          type="button"
          aria-label="Dismiss update banner"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-amber-100/70 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
