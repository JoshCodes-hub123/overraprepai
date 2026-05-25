import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Required for Capacitor — file:// loads need relative asset paths
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: ["favicon.ico", "logo.png", "robots.txt"],
      manifest: {
        name: "OverraPrep AI - FUTA CBT Preparation",
        short_name: "OverraPrep",
        description: "AI-powered CBT exam preparation for FUTA students. Practice questions, instant explanations, and personalized learning.",
        theme_color: "#0f9b8e",
        background_color: "#0a0a0b",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        categories: ["education", "productivity"],
        screenshots: [
          { src: "/screenshot-wide.png", sizes: "1280x720", type: "image/png", form_factor: "wide" },
          { src: "/screenshot-mobile.png", sizes: "390x844", type: "image/png", form_factor: "narrow" },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /\/functions\/v1\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache Supabase REST GETs (dashboards, quizzes, lists) so screens
            // open instantly offline with stale-while-revalidate.
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/rest/") &&
              request.method === "GET",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-rest-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Storage assets (avatars, question images)
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/storage/"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
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
