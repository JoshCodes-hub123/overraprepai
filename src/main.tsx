import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App";
import "./index.css";
import { installEdgeRetry } from "@/lib/installEdgeRetry";
import { logClientError } from "@/lib/analytics";

// Global auto-retry for every edge-function call — saves students on 2G/3G.
installEdgeRetry();

// Native mobile setup (only runs inside the Capacitor shell, not the web preview)
if (Capacitor.isNativePlatform()) {
  // Hide the native splash once the web app has hydrated
  window.addEventListener("load", () => {
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 600);
  });

  // Match the dark luxury theme on the native status bar
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: "#0a0a0b" }).catch(() => {});
}

// Auto-recover from stale chunk references after a new deploy (PWA cache).
// When a dynamic import fails because the hashed file no longer exists,
// reload to fetch the fresh index.html + chunk map. We allow multiple
// recoveries (cooldown-gated) instead of a one-shot flag so a single
// flaky CDN response doesn't permanently brick the session.
const CHUNK_RELOAD_TS_KEY = "chunk-reload-ts";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);

function tryChunkRecoveryReload() {
  try {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_TS_KEY) ?? 0);
    if (Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(CHUNK_RELOAD_TS_KEY, String(Date.now()));
    // Cache-bust the document so the browser refetches index.html (and the
    // new hashed chunk references inside it) instead of serving a stale copy.
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString(36));
    window.location.replace(url.toString());
    return true;
  } catch {
    window.location.reload();
    return true;
  }
}

window.addEventListener("error", (e) => {
  if (e?.message && isChunkLoadError(e.message)) {
    if (tryChunkRecoveryReload()) return;
  }
});
window.addEventListener("error", (e) => {
  // Log uncaught runtime errors for admin observability (skip chunk-load reload path)
  if (e?.message && !isChunkLoadError(e.message)) {
    void logClientError({ message: e.message, stack: e.error?.stack });
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String(e?.reason?.message ?? e?.reason ?? "");
  if (isChunkLoadError(msg)) {
    if (tryChunkRecoveryReload()) return;
  }
  if (msg) {
    void logClientError({ message: msg, stack: e?.reason?.stack });
  }
});

// App-shell service worker registration — guarded for Lovable preview/iframe/dev.
// The wrapper itself unregisters any stale app SW in refused contexts.
import { registerAppServiceWorker } from "@/lib/swRegister";
registerAppServiceWorker();


createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// Tear down the pre-React boot splash once the app has actually rendered.
// Two RAFs ensure first paint has flushed; the splash fades out via CSS.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.classList.add("app-ready");
    const splash = document.getElementById("boot-splash");
    const boot = (window as unknown as { __BOOT_FALLBACK__?: { cancel?: () => void } }).__BOOT_FALLBACK__;
    boot?.cancel?.();
    if (splash) {
      splash.classList.add("is-hidden");
      setTimeout(() => splash.remove(), 600);
    }
  });
});
