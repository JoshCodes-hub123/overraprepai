/**
 * Service-worker registration wrapper.
 *
 * Strict rules from the Lovable PWA skill:
 *   - Never register in dev, iframe, or Lovable preview hostnames.
 *   - Respect the `?sw=off` kill switch.
 *   - In any refused context, proactively UNREGISTER any existing /sw.js
 *     so old kill-switch / stale workers don't stick around.
 *
 * The wrapper is the ONLY place that calls register(). vite-plugin-pwa is
 * configured with `injectRegister: null` so it never injects its own.
 */
import { Capacitor } from "@capacitor/core";

const APP_SW_URL = "/sw.js";

function isRefusedContext(): { refused: boolean; reason: string } {
  // Dev build
  if (!import.meta.env.PROD) return { refused: true, reason: "dev" };

  // Capacitor native shell — doesn't need a web SW
  try { if (Capacitor.isNativePlatform()) return { refused: true, reason: "native" }; } catch { /* noop */ }

  if (typeof window === "undefined") return { refused: true, reason: "ssr" };

  // Inside an iframe (Lovable preview is iframed)
  try { if (window.top !== window.self) return { refused: true, reason: "iframe" }; } catch { return { refused: true, reason: "iframe-cross-origin" }; }

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return { refused: true, reason: "lovable-preview-host" };
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return { refused: true, reason: "lovableproject" };
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return { refused: true, reason: "lovableproject-dev" };
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return { refused: true, reason: "beta.lovable.dev" };
  if (host === "lovable.app" || host.endsWith(".lovable.app")) {
    // Allow only the canonical published subdomain pattern; refuse the
    // preview ones already caught above. .lovable.app published deploys
    // are fine for SW.
    // (No-op — fall through.)
  }

  // Kill switch
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("sw") === "off") return { refused: true, reason: "kill-switch-param" };
  } catch { /* noop */ }

  return { refused: false, reason: "" };
}

async function unregisterAppSWs() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(APP_SW_URL);
        })
        .map((r) => r.unregister())
    );
  } catch { /* noop */ }
}

export function registerAppServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const { refused, reason } = isRefusedContext();
  if (refused) {
    // Clean up any previously-registered app SW in this context
    void unregisterAppSWs();
    // Helpful breadcrumb in dev/preview
    if (!import.meta.env.PROD) console.debug("[sw] registration refused:", reason);
    return;
  }
  // Defer until window load so we never compete with first-paint work.
  const run = () => {
    navigator.serviceWorker.register(APP_SW_URL, { scope: "/" }).catch((err) => {
      console.warn("[sw] register failed:", err);
    });
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}
