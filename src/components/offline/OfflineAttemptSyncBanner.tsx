/**
 * OfflineAttemptSyncBanner — slim global banner that surfaces queued offline
 * quiz attempts and their sync state. Hidden when nothing is pending and not
 * actively syncing.
 */
import { AnimatePresence, motion } from "framer-motion";
import { CloudUpload, Loader2, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useOfflineAttemptSync } from "@/hooks/useOfflineAttemptSync";

const OfflineAttemptSyncBanner = () => {
  const { pendingCount, syncing, lastSyncedAt, flush } = useOfflineAttemptSync();
  const [showJustSynced, setShowJustSynced] = useState(false);

  // Briefly show a "synced" pill the moment a flush finishes
  useEffect(() => {
    if (!lastSyncedAt) return;
    setShowJustSynced(true);
    const t = setTimeout(() => setShowJustSynced(false), 2500);
    return () => clearTimeout(t);
  }, [lastSyncedAt]);

  const visible = pendingCount > 0 || syncing || showJustSynced;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[80] pointer-events-auto"
          style={{ marginTop: "env(safe-area-inset-top)" }}
        >
          <button
            type="button"
            onClick={() => void flush()}
            className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 text-amber-900 shadow-sm px-3 py-1.5 text-xs font-medium hover:bg-amber-100 transition"
          >
            {syncing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing {pendingCount > 0 ? `${pendingCount} ` : ""}offline {pendingCount === 1 ? "attempt" : "attempts"}…
              </>
            ) : pendingCount > 0 ? (
              <>
                <CloudUpload className="w-3.5 h-3.5" />
                {pendingCount} offline {pendingCount === 1 ? "attempt" : "attempts"} queued · tap to sync
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Offline attempts synced
              </>
            )}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineAttemptSyncBanner;
