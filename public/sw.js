// Kill-switch service worker.
// Earlier builds shipped a vite-plugin-pwa service worker at /sw.js. Devices
// that registered it keep serving a cached app shell forever unless this file
// replaces it. We clear all caches, claim clients, force a one-time reload,
// then unregister so the browser stops controlling navigation entirely.
self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    (async () => {
      await self.clients.claim();
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await Promise.all(
        clients.map((c) => {
          const url = new URL(c.url);
          url.searchParams.set("sw-cleanup", Date.now().toString());
          return c.navigate(url.toString()).catch(() => {});
        }),
      );
      await self.registration.unregister();
    })(),
  ),
);
// Pass everything through to the network — never serve cached responses.
self.addEventListener("fetch", () => {});