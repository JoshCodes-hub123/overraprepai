import { useEffect, useState } from "react";

/**
 * Dev-only perf overlay for the Auth page.
 *
 * Activate with `?perf=1` on /auth. Add `&simulate=2g` to also force
 * the low-data branch (skips background video) so you can verify the
 * page is fully usable on save-data / 2G phones.
 *
 * Reports: FCP, LCP, TTFB, JS heap, connection info, video state.
 */
type Metrics = {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  heapMB?: number;
  effectiveType?: string;
  saveData?: boolean;
  downlinkMbps?: number;
  videoEnabled: boolean;
  simulated: boolean;
};

const fmt = (n?: number, unit = "ms") =>
  n == null ? "—" : `${Math.round(n)}${unit}`;

const grade = (label: string, value: number | undefined, good: number, ok: number) => {
  if (value == null) return "text-muted-foreground";
  if (value <= good) return "text-emerald-600";
  if (value <= ok) return "text-amber-600";
  return "text-red-600";
};

export const isPerfTestMode = () =>
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("perf") === "1";

export const isSimulatedLowEnd = () =>
  typeof window !== "undefined" &&
  /^(2g|slow-2g|savedata)$/i.test(
    new URLSearchParams(window.location.search).get("simulate") || ""
  );

export default function AuthPerfOverlay({ videoEnabled }: { videoEnabled: boolean }) {
  const [m, setM] = useState<Metrics>({
    videoEnabled,
    simulated: isSimulatedLowEnd(),
  });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setM((p) => ({ ...p, videoEnabled }));
  }, [videoEnabled]);

  useEffect(() => {
    // Navigation timing (TTFB)
    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    const ttfb = nav ? nav.responseStart - nav.requestStart : undefined;

    // FCP
    const fcpEntry = performance
      .getEntriesByType("paint")
      .find((e) => e.name === "first-contentful-paint");

    // LCP observer
    let lcpVal: number | undefined;
    let po: PerformanceObserver | undefined;
    try {
      po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        lcpVal = last.startTime;
        setM((p) => ({ ...p, lcp: lcpVal }));
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // ignore
    }

    const conn = (navigator as unknown as {
      connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
    }).connection;
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

    setM((p) => ({
      ...p,
      ttfb,
      fcp: fcpEntry?.startTime,
      heapMB: heap ? heap.usedJSHeapSize / 1024 / 1024 : undefined,
      effectiveType: conn?.effectiveType,
      saveData: conn?.saveData,
      downlinkMbps: conn?.downlink,
    }));

    return () => po?.disconnect();
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[60] rounded-full bg-black/80 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg"
      >
        perf
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[60] w-[230px] rounded-xl border border-black/10 bg-white/95 p-3 text-[11px] font-mono shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          Auth perf {m.simulated && <span className="text-amber-600">· sim</span>}
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <ul className="space-y-1">
        <li className="flex justify-between">
          <span>TTFB</span>
          <span className={grade("ttfb", m.ttfb, 200, 600)}>{fmt(m.ttfb)}</span>
        </li>
        <li className="flex justify-between">
          <span>FCP</span>
          <span className={grade("fcp", m.fcp, 1500, 2500)}>{fmt(m.fcp)}</span>
        </li>
        <li className="flex justify-between">
          <span>LCP</span>
          <span className={grade("lcp", m.lcp, 2500, 4000)}>{fmt(m.lcp)}</span>
        </li>
        <li className="flex justify-between">
          <span>Heap</span>
          <span>{fmt(m.heapMB, "MB")}</span>
        </li>
        <li className="flex justify-between">
          <span>Net</span>
          <span>
            {m.effectiveType ?? "?"}
            {m.downlinkMbps != null ? ` · ${m.downlinkMbps}Mb` : ""}
          </span>
        </li>
        <li className="flex justify-between">
          <span>Save-data</span>
          <span>{m.saveData ? "on" : "off"}</span>
        </li>
        <li className="flex justify-between">
          <span>BG video</span>
          <span className={m.videoEnabled ? "text-amber-600" : "text-emerald-600"}>
            {m.videoEnabled ? "loaded" : "skipped"}
          </span>
        </li>
      </ul>
      <p className="mt-2 text-[10px] leading-tight text-muted-foreground">
        Add <code>&amp;simulate=2g</code> to force the low-end path.
      </p>
    </div>
  );
}
