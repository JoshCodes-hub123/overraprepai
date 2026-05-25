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
      <AlertDialogContent className="border-primary/30">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <AlertDialogTitle className="text-center">
            A new version is available
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            We've shipped new features and fixes. Click <strong>OK, upgrade now</strong>{" "}
            to load the latest version of the app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpgrade}>
            OK, upgrade now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}