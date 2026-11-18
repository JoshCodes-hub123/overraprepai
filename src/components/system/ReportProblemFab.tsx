import { useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { installGlobalErrorCapture } from "@/lib/lastError";
import {
  getQueuedSupportReports,
  clearQueuedSupportReports,
} from "@/lib/autoOfflineSeeder";
import { supabase } from "@/integrations/supabase/client";
import ReportProblemDialog from "./ReportProblemDialog";

/**
 * Student Support & Quick Issue Report floating trigger + global event listener.
 * Also flushes any offline-queued support reports when connectivity returns.
 */
export const ReportProblemFab = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installGlobalErrorCapture();

    const handleOpenEvent = () => setOpen(true);
    window.addEventListener("overra:open_support", handleOpenEvent);

    const flushOfflineReports = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const queued = getQueuedSupportReports();
      if (queued.length === 0) return;
      try {
        for (const item of queued) {
          await supabase.from("client_errors").insert({
            user_id: item.userId ?? null,
            message: `[OFFLINE QUEUED REPORT] ${item.message}`.slice(0, 2000),
            path: item.path,
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
          });
        }
        clearQueuedSupportReports();
      } catch {
        // retry on next online event
      }
    };

    void flushOfflineReports();
    window.addEventListener("online", flushOfflineReports);

    return () => {
      window.removeEventListener("overra:open_support", handleOpenEvent);
      window.removeEventListener("online", flushOfflineReports);
    };
  }, []);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Student Help & Support"
        title="Need Help or Spot an Issue?"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-3 z-40 h-11 px-3 rounded-full bg-[#18181B] text-[#FAF8F5] border border-[#D4AF37]/50 shadow-md flex items-center gap-1.5 hover:bg-[#27272A] active:scale-95 transition md:bottom-6 cursor-pointer"
      >
        <MessageSquarePlus className="w-4 h-4 text-[#D4AF37]" />
        <span className="text-[11px] font-bold hidden sm:inline">Help</span>
      </button>
      <ReportProblemDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ReportProblemFab;
