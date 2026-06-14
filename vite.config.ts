import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// Inject a build-time version stamp and emit /version.json so the running
// app can detect when a new deployment is live and prompt users to refresh.
const BUILD_VERSION = String(Date.now());

function versionPlugin() {
  return {
    name: "emit-version-json",
    generateBundle(this: any) {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_VERSION }),
      });
    },
  } as any;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Required for Capacitor — file:// loads need relative asset paths
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionPlugin(),
    // App-shell service worker. The plugin only generates /sw.js at build
    // time; runtime registration lives in src/lib/swRegister.ts with all
    // Lovable preview / iframe / dev guards. devOptions.enabled=false +
    // injectRegister=null guarantees no SW behavior in dev or preview.
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      manifest: false, // we already ship public/manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,ico,woff2}"],
        // Don't precache giant media — they're fetched on demand and cached
        // via runtimeCaching only when visited.
        globIgnores: ["**/*.{mp4,mp3,wav,pdf}", "auth-bg.*", "splash-bg.*"],
        navigateFallback: "/index.html",
        // Never intercept OAuth callbacks or Supabase API calls.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/storage\//, /^\/auth\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // HTML navigations — always try network first so a new deploy
            // is picked up immediately; fall back to cache only when offline.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Same-origin hashed assets — safe to cache aggressively.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /\/assets\/.+\.[0-9a-f]{8,}\.(js|css|woff2|svg|png|webp|jpg|jpeg)$/i.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "hashed-assets",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Google Fonts CSS — network first so weights update
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            // Google Fonts files — cache far-future
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Heavy/optional libs only — let Rollup handle React + the rest to
        // avoid TDZ "Cannot access X before initialization" from cross-chunk
        // circular deps between vendor-react and the catch-all vendor chunk.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("xlsx")) return "vendor-xlsx";
          if (id.includes("mammoth")) return "vendor-mammoth";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("qrcode")) return "vendor-reports";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("three") || id.includes("@react-three")) return "vendor-three";
          return undefined;
        },
      },
    },
  },
}));
