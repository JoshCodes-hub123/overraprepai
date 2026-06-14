/**
 * Installs a global auto-retry layer over `supabase.functions.invoke`.
 *
 * Why: On Nigerian 2G/3G networks, single edge-function calls fail
 * intermittently with "Failed to fetch" / 502 / 504 even when the
 * student's request is fine. This wrapper retries up to 3 attempts with
 * exponential backoff (0 → 300ms → 900ms) so the whole app gets sturdy
 * AI/edge calls without touching 40+ call sites.
 *
 * - Idempotent: safe to import once.
 * - Skips retry on 4xx (client errors — caller bug or paywall).
 * - Skips retry if the request already aborted.
 */
import { supabase } from "@/integrations/supabase/client";

const PATCH_FLAG = "__overra_invoke_retry_patched__";
const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);
const DELAYS = [0, 300, 900]; // 3 attempts total

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryable(err: any): boolean {
  if (!err) return false;
  const status = err?.context?.status ?? err?.status;
  if (typeof status === "number") {
    if (status >= 400 && status < 500 && !RETRYABLE_STATUS.has(status)) return false;
    if (RETRYABLE_STATUS.has(status)) return true;
  }
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  );
}

export function installEdgeRetry() {
  const fns: any = (supabase as any).functions;
  if (!fns || fns[PATCH_FLAG]) return;
  const original = fns.invoke.bind(fns);

  fns.invoke = async (name: string, opts?: any) => {
    // If caller passed an AbortSignal, don't retry past an abort.
    const signal: AbortSignal | undefined = opts?.signal;
    let last: any = null;
    for (let i = 0; i < DELAYS.length; i++) {
      if (signal?.aborted) break;
      if (DELAYS[i]) await sleep(DELAYS[i]);
      try {
        const res = await original(name, opts);
        if (res?.error && isRetryable(res.error) && i < DELAYS.length - 1) {
          last = res;
          continue;
        }
        return res;
      } catch (e) {
        if (isRetryable(e) && i < DELAYS.length - 1) {
          last = { data: null, error: e };
          continue;
        }
        throw e;
      }
    }
    return last ?? (await original(name, opts));
  };

  fns[PATCH_FLAG] = true;
}
