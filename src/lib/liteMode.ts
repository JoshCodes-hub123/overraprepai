/**
 * Lite Mode — data-saver toggle for bad networks / low-end devices.
 *
 * When on:
 *   - Splash skips the heavy background video
 *   - Heavy animations are toned down (consumers can read `isLiteMode()`)
 *   - Components can choose smaller images / fewer effects
 *
 * Auto-on heuristics (first load only, user can override):
 *   - navigator.connection.saveData === true
 *   - effectiveType is 'slow-2g' or '2g'
 *   - deviceMemory <= 2 GB
 */
import { useEffect, useState } from "react";

const KEY = "overra:lite-mode";
const AUTO_KEY = "overra:lite-mode:auto-set";

type Listener = (on: boolean) => void;
const listeners = new Set<Listener>();

function detectAuto(): boolean {
  if (typeof navigator === "undefined") return false;
  const c: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (c?.saveData) return true;
  if (c?.effectiveType && /^(slow-2g|2g|3g)$/.test(c.effectiveType)) return true;
  if (typeof c?.downlink === "number" && c.downlink < 1.8) return true;
  if (typeof c?.rtt === "number" && c.rtt > 400) return true;
  if (typeof (navigator as any).deviceMemory === "number" && (navigator as any).deviceMemory <= 2) return true;
  if (typeof (navigator as any).hardwareConcurrency === "number" && (navigator as any).hardwareConcurrency <= 2) return true;
  return false;
}

function readStored(): boolean | null {
  if (typeof localStorage === "undefined") return null;
  const v = localStorage.getItem(KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

export function isLiteMode(): boolean {
  const stored = readStored();
  if (stored !== null) return stored;
  // First load — auto-detect once and persist so users see a consistent state.
  if (typeof localStorage !== "undefined" && !localStorage.getItem(AUTO_KEY)) {
    const auto = detectAuto();
    localStorage.setItem(AUTO_KEY, "1");
    localStorage.setItem(KEY, auto ? "1" : "0");
    return auto;
  }
  return false;
}

export function setLiteMode(on: boolean) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KEY, on ? "1" : "0");
    localStorage.setItem(AUTO_KEY, "1");
  }
  listeners.forEach((l) => l(on));
}

export function useLiteMode(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => isLiteMode());
  useEffect(() => {
    const l: Listener = (v) => setOn(v);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return [on, setLiteMode];
}
