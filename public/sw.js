// Kill-switch service worker.
// Earlier builds shipped a vite-plugin-pwa service worker at /sw.js. Devices
// that registered it keep serving a cached app shell forever unless this file
// replaces it. We clear caches and unregister quietly — the previous version
// force-navigated every client on activate, which combined with the
// chunk-recovery reload in main.tsx could produce visible blank flickers /
// reload loops on first load after a deploy. We now leave navigation to the
// app; main.tsx already unregisters any stale SW on every load.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      } catch (_) { /* noop */ }
      try { await self.registration.unregister(); } catch (_) { /* noop */ }
    })(),
  ),
);
// Pass everything through to the network — never serve cached responses.
self.addEventListener("fetch", () => {});