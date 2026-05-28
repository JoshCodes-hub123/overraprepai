import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sparkles } from "lucide-react";

// Build-time version injected by Vite (see vite.config.ts).
declare const __APP_VERSION__: string;

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Polls /version.json and prompts the user to refresh when a new build is live.
 * Keeps the running app, all caches, and Capacitor webview in sync after deploys.
 */
export default function UpdatePrompt() {
  const [open, setOpen] = useState(false);
  const currentVersion = useRef<string>(
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : ""
  );
  const notifiedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (notifiedRef.current) return;
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (cancelled || !data?.version) return;
        if (currentVersion.current && data.version !== currentVersion.current) {
          notifiedRef.current = true;
          setOpen(true);
        }
      } catch {
        // network blip — try again next interval
      }
    };

    // Run shortly after mount, then on interval + when tab becomes visible.
    const initial = window.setTimeout(check, 15_000);
    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const handleUpgrade = async () => {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignore
    }
    // Force a fresh load past any HTTP cache.
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="border-amber-300/60 bg-white">
        <AlertDialogHeader>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30">
            <Sparkles className="h-7 w-7" />
          </div>
          <AlertDialogTitle className="text-center font-display text-xl">
            A fresh OverraPrep is ready
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-relaxed">
            We've shipped new features and fixes. Refresh to load the latest version —
            your work is saved and you'll land right back where you left off.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel className="rounded-xl">Later</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUpgrade}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            Update now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}