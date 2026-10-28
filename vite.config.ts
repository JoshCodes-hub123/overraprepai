import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: "autoUpdate",
      manifest: false, // already provided in public/manifest.webmanifest
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        globIgnores: ["**/*.mp4"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.endsWith(".pdf") ||
              url.search.includes(".pdf") ||
              url.pathname.includes("/user-resources/") ||
              (url.hostname.includes("unpkg.com") && url.pathname.includes("pdfjs-dist")),
            handler: "CacheFirst",
            options: {
              cacheName: "offline-pdf-cache-v1",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
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
    dedupe: ["react", "react-dom", "react-router-dom"],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@tanstack/react-query",
      "framer-motion",
      "zod",
      "react-hook-form",
      "@hookform/resolvers/zod",
      "lucide-react",
      "sonner",
      "date-fns",
      "@supabase/supabase-js",
      "canvas-confetti",
      "clsx",
      "tailwind-merge",
      "react-helmet-async",
      "jspdf",
      "jspdf-autotable",
    ],
  },
}));
