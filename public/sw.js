/**
 * OverraPrep AI - Offline ServiceWorker
 * Provides offline caching for student library PDFs, course documents, and PDF.js workers.
 */

const CACHE_NAME = "offline-pdf-cache-v1";
const STATIC_CACHE = "overra-static-v1";

const ASSETS_TO_PRECACHE = [
  "/",
  "/manifest.webmanifest",
  "/favicon.png",
  "/app-icon.png",
];

// Install: precache essential shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS_TO_PRECACHE))
  );
  self.skipWaiting();
});

// Activate: clean old cache versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Message listener to allow LibraryPdfViewer to programmatically cache documents
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_PDF" && event.data.url) {
    const url = event.data.url;
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(url, { mode: "cors" });
          if (response.ok) {
            await cache.put(url, response.clone());
            // Notify client of successful offline caching
            const clients = await self.clients.matchAll();
            clients.forEach((client) => {
              client.postMessage({
                type: "PDF_CACHED_SUCCESS",
                url,
              });
            });
          }
        } catch (err) {
          console.warn("[SW] Failed to cache PDF:", err);
        }
      })
    );
  }
});

// Fetch event: Cache-First strategy for PDFs, worker scripts, and course documents
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Check if this request is a PDF, worker script, or user resource
  const isPdf =
    url.pathname.endsWith(".pdf") ||
    url.search.includes(".pdf") ||
    url.pathname.includes("/user-resources/") ||
    url.pathname.includes("pdf.worker") ||
    url.hostname.includes("unpkg.com") && url.pathname.includes("pdfjs-dist");

  if (isPdf && req.method === "GET") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        // 1. Try cache first
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. Fetch from network and store in cache
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // 3. Fallback: Check if cached under clean URL without query parameters
          const matchWithoutQuery = await cache.match(url.origin + url.pathname);
          if (matchWithoutQuery) {
            return matchWithoutQuery;
          }
          throw error;
        }
      })
    );
    return;
  }

  // Standard fetch for other resources
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).catch(() => {
          // If offline and request is an HTML navigation, return cached root
          if (req.mode === "navigate") {
            return caches.match("/");
          }
          return null;
        })
      );
    })
  );
});
