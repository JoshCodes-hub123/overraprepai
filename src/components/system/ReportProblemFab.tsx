import { useEffect, useState } from "react";
import { Bug } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { installGlobalErrorCapture } from "@/lib/lastError";
import ReportProblemDialog from "./ReportProblemDialog";

/**
 * Tiny discreet "Report a problem" floating button — only for signed-in users.
 * Pinned bottom-left so it doesn't collide with the NewStudyPack FAB on the right.
 */
export const ReportProblemFab = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installGlobalErrorCapture();
  }, []);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Report a problem"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-3 z-40 h-10 w-10 rounded-full bg-white/95 backdrop-blur border border-amber-200 shadow-[0_4px_14px_-4px_rgba(180,140,40,0.35)] grid place-items-center text-amber-700 hover:bg-amber-50 hover:scale-105 active:scale-95 transition md:bottom-6"
      >
        <Bug className="w-4 h-4" />
      </button>
      <ReportProblemDialog open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ReportProblemFab;
