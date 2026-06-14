/**
 * edgeInvoke — supabase.functions.invoke with auto-retry on transient errors.
 *
 * Bad-network reality: a single fetch on 2G/3G fails ~10–20% of the time
 * with NetworkError, ECONNRESET, or 502/503 from edge. This wrapper retries
 * up to 2× with exponential backoff (300ms, 900ms) so the student never
 * sees a phantom failure for a recoverable blip.
 *
 * Use exactly like supabase.functions.invoke:
 *   const { data, error } = await edgeInvoke("ai-explanation", { body: {...} });
 */
import { supabase } from "@/integrations/supabase/client";

type InvokeOpts = Parameters<typeof supabase.functions.invoke>[1];
type InvokeResult = Awaited<ReturnType<typeof supabase.functions.invoke>>;

const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);

function isRetryable(err: any, ctx?: { status?: number }): boolean {
  if (ctx?.status && RETRYABLE_STATUS.has(ctx.status)) return true;
  if (!err) return false;
  const msg = (err?.message || String(err)).toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("abort")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function edgeInvoke(name: string, opts?: InvokeOpts): Promise<InvokeResult> {
  const delays = [0, 300, 900]; // 3 attempts total
  let last: InvokeResult | null = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);
    try {
      const res = await supabase.functions.invoke(name, opts);
      // FunctionsHttpError exposes context.status; treat 5xx/429 as retryable
      const status = (res?.error as any)?.context?.status;
      if (res.error && isRetryable(res.error, { status }) && i < delays.length - 1) {
        last = res;
        continue;
      }
      return res;
    } catch (e) {
      if (isRetryable(e) && i < delays.length - 1) {
        last = { data: null, error: e as any } as InvokeResult;
        continue;
      }
      throw e;
    }
  }
  return last ?? (await supabase.functions.invoke(name, opts));
}
