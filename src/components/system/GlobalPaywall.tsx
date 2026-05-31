import { SoftPaywallSheet } from "@/components/student/SoftPaywallSheet";
import { aiGate, useAIGateState } from "@/lib/aiGate";

/**
 * Mounts a single SoftPaywallSheet at the App root that any AI call site
 * can trigger via `aiGate.consume(kind)` from `@/lib/aiGate`.
 */
export default function GlobalPaywall() {
  const { open, reason, action } = useAIGateState();
  return (
    <SoftPaywallSheet
      open={open}
      onOpenChange={(o) => aiGate.setOpen(o)}
      reason={reason}
      action={action}
    />
  );
}
