import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import App from "./App.tsx";
import "./index.css";

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
// reload once to fetch the fresh index.html and chunk map.
const CHUNK_RELOAD_KEY = "chunk-reload-attempt";
const isChunkLoadError = (msg: string) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);

window.addEventListener("error", (e) => {
  if (e?.message && isChunkLoadError(e.message) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});
window.addEventListener("error", (e) => {
  // Log uncaught runtime errors for admin observability (skip chunk-load reload path)
  if (e?.message && !isChunkLoadError(e.message)) {
    import("@/lib/analytics").then(({ logClientError }) => {
      void logClientError({ message: e.message, stack: e.error?.stack });
    }).catch(() => {});
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String(e?.reason?.message ?? e?.reason ?? "");
  if (isChunkLoadError(msg) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
    return;
  }
  if (msg) {
    import("@/lib/analytics").then(({ logClientError }) => {
      void logClientError({ message: msg, stack: e?.reason?.stack });
    }).catch(() => {});
  }
});

// PWA is intentionally manifest-only — do NOT register a service worker.
// SW registration breaks the Lovable preview iframe and is not needed for
// install-to-home-screen. Proactively unregister any stale SW from previous
// deploys so returning users get the latest app shell.
if ("serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
    .catch(() => {});
}


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
