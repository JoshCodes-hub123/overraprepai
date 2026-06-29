/**
 * Global AI Gate.
 *
 * Single source of truth for "can this AI action run?" — wraps the
 * `consume_ai_token(_kind)` RPC (spends free daily quota first, then a
 * wallet token). When both are empty, opens a global SoftPaywallSheet.
 *
 * Usage:
 *   import { aiGate } from "@/lib/aiGate";
 *   const ok = await aiGate.consume("ai_chat");
 *   if (!ok) return;          // paywall is already open
 *   await callEdgeFn();
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type GateState = {
  open: boolean;
  reason?: string;
  action?: string;
};

type Listener = (s: GateState) => void;

let state: GateState = { open: false };
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l(state));

export const aiGate = {
  subscribe(l: Listener) {
    listeners.add(l);
    l(state);
    return () => { listeners.delete(l); };
  },
  setOpen(open: boolean) {
    state = { ...state, open };
    emit();
  },
  /** Open the paywall manually (e.g. when a user clicks a premium CTA). */
  open(action?: string, reason?: string) {
    state = { open: true, action, reason };
    emit();
  },
  /**
   * Spend 1 free use OR 1 token for the given AI action `kind`.
   * Returns `true` if the call may proceed, `false` if the paywall was shown.
   *
   * `kind` is free-form (e.g. "ai_chat", "ai_explain", "tts", "summary").
   * Pass `silent` to skip the success toast (useful for chained micro-actions).
   */
  async consume(kind: string, opts?: { action?: string; silent?: boolean }): Promise<boolean> {
    try {
      const { data, error } = await (supabase as any).rpc("consume_ai_token", { _kind: kind });
      if (error) {
        // Fail closed — never grant free AI on a backend error.
        console.error("[aiGate] consume_ai_token error", error);
        toast.error("Couldn't verify your AI balance. Please try again.");
        return false;
      }
      if (!data?.allowed) {
        state = {
          open: true,
          action: opts?.action,
          reason:
            "You've used today's 2 free AI actions and your wallet is empty 💛 Top up in seconds to keep learning — or come back tomorrow when your free actions reset.",
        };
        emit();
        return false;
      }
      if (!opts?.silent) {
        if (data.source === "token") {
          toast.success(`−1 token · ${data.balance} left`, { duration: 1500 });
        } else if (data.source === "free") {
          const left = data.free_left ?? 0;
          toast.success(
            left > 0 ? `Free use · ${left}/2 left today` : `Last free AI use today · top up to keep going 🚀`,
            { duration: 1800 },
          );
        }
      }
      return true;
    } catch (e) {
      console.error("[aiGate] consume threw", e);
      return true;
    }
  },
};

export function useAIGateState() {
  const [s, setS] = useState<GateState>(state);
  useEffect(() => aiGate.subscribe(setS), []);
  return s;
}
