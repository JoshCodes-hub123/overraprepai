import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WifiOff, RefreshCw, Loader2, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/components/native/OfflineBanner";
import { getOfflineCachedCourses } from "@/lib/autoOfflineSeeder";
import { haptic } from "@/lib/native";

interface DashboardOfflineBannerProps {
  /** Same handler used by PullToRefresh — triggers a fresh data fetch. */
  onReattempt: () => Promise<void> | void;
  primaryCourseId?: string;
  primaryCourseCode?: string;
}

/**
 * Persistent inline banner shown on dashboards while the device is offline.
 * Gives students immediate 1-tap access to their cached Offline CBT packs and Notes
 * so "No Network" never blocks studying.
 */
export const DashboardOfflineBanner = ({
  onReattempt,
  primaryCourseId,
  primaryCourseCode,
}: DashboardOfflineBannerProps) => {
  const navigate = useNavigate();
  const { online } = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  const cachedCourses = getOfflineCachedCourses();
  const fallbackCourseId = primaryCourseId || cachedCourses[0]?.id || "default";
  const fallbackCourseCode = primaryCourseCode || cachedCourses[0]?.code || "MTH 101";

  useEffect(() => {
    if (online) {
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 2400);
      return () => clearTimeout(t);
    }
  }, [online]);

  if (online && !justCameOnline) return null;

  const handleRetry = async () => {
    if (retrying) return;
    setRetrying(true);
    await haptic("medium");
    try {
      await onReattempt();
    } catch {
      // handled by caller
    } finally {
      setRetrying(false);
    }
  };

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="sticky top-[env(safe-area-inset-top)] z-40 mx-auto mb-4 flex flex-col sm:flex-row w-full max-w-5xl sm:items-center justify-between gap-3 rounded-2xl border border-[#D4AF37] bg-[#18181B] text-[#FAF8F5] px-4 py-3.5 shadow-md"
      >
        <div className="flex items-start sm:items-center gap-3 text-sm">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-[#18181B]">
            <WifiOff className="h-4 w-4" />
          </span>
          <div className="leading-snug">
            <p className="font-bold text-xs sm:text-sm text-[#FAF8F5]">
              No Network — Offline Study Mode Active
            </p>
            <p className="text-[11px] sm:text-xs text-[#A1A1AA]">
              Your enrolled courses, key formulas, summary notes &amp; CBT packs are saved on this phone.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate(`/quiz/offline_${fallbackCourseId}/simulation`)}
            className="h-9 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Practice {fallbackCourseCode} Offline</span>
          </Button>

          {fallbackCourseId !== "default" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/courses/${fallbackCourseId}?tab=materials`)}
              className="h-9 px-3 rounded-xl border-[#3F3F46] bg-[#27272A] hover:bg-[#3F3F46] text-[#FAF8F5] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Notes</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={handleRetry}
            disabled={retrying}
            className="h-9 px-2.5 rounded-xl text-[#A1A1AA] hover:text-[#FAF8F5] hover:bg-[#27272A] text-xs cursor-pointer"
          >
            {retrying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-[env(safe-area-inset-top)] z-40 mx-auto mb-4 flex w-full max-w-5xl items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs"
    >
      <RefreshCw className="h-3.5 w-3.5" /> Back online — all offline progress and scores are synced.
    </div>
  );
};

export default DashboardOfflineBanner;
