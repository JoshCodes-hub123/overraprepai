import { useEffect } from "react";
import { useLiteMode } from "@/lib/liteMode";

/**
 * Syncs Lite Mode to <html data-lite="true|false"> so global CSS rules
 * (in index.css) can tone down infinite animations, blurs, and heavy
 * filters for students on bad networks / low-end devices.
 *
 * Renders nothing.
 */
const LiteModeApplier = () => {
  const [lite] = useLiteMode();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.lite = lite ? "true" : "false";
  }, [lite]);
  return null;
};

export default LiteModeApplier;
