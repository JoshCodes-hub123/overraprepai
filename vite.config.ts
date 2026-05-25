import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
