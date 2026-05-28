/**
 * Tiny global capture for the most recent runtime error / rejection.
 * Used by the Report-a-Problem flow to pre-fill technical context
 * without bothering the user.
 */
type Snapshot = {
  message: string;
  stack?: string;
  source?: "error" | "unhandledrejection" | "manual";
  at: number; // epoch ms
};

let last: Snapshot | null = null;

export function setLastError(s: Omit<Snapshot, "at"> & { at?: number }) {
  last = { ...s, at: s.at ?? Date.now() };
}

export function getLastError(): Snapshot | null {
  return last;
}

export function clearLastError() {
  last = null;
}

let installed = false;
export function installGlobalErrorCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    const msg = (e && (e.message || (e.error && e.error.message))) || "Unknown error";
    setLastError({
      message: String(msg).slice(0, 1000),
      stack: e.error?.stack?.slice(0, 4000),
      source: "error",
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e.reason;
    const msg = (reason && (reason.message || reason)) || "Unhandled rejection";
    setLastError({
      message: String(msg).slice(0, 1000),
      stack: reason?.stack?.slice(0, 4000),
      source: "unhandledrejection",
    });
  });
}
