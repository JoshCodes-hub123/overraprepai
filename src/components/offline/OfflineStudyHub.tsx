import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wifi,
  WifiOff,
  HardDrive,
  CheckCircle2,
  BookOpen,
  Play,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getOfflineCachedCourses,
  type CachedCourseMetadata,
} from "@/lib/autoOfflineSeeder";
import { AdvancedOfflineCenter } from "./AdvancedOfflineCenter";

export const OfflineStudyHub: React.FC = () => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [refreshing, setRefreshing] = useState(false);
  const [cachedCourses, setCachedCourses] = useState<CachedCourseMetadata[]>(() =>
    getOfflineCachedCourses()
  );

  useEffect(() => {
    setCachedCourses(getOfflineCachedCourses());
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRefreshCache = () => {
    setRefreshing(true);
    setTimeout(() => {
      setCachedCourses(getOfflineCachedCourses());
      setRefreshing(false);
      toast.success("All enrolled courses, formulas, notes & CBT packs verified for offline study!");
    }, 600);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#18181B] text-[#D4AF37] flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-[#18181B]">
                  Auto-Saved Offline Course Packs
                </h3>
                <span className="text-xs font-mono tabular-nums text-[#71717A] inline-flex items-center gap-1">
                  ·{" "}
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600" /> Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-[#B48A1E]" /> Offline Active
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-[#52525B]">
                Every enrolled course below is saved on your phone—read notes, review formulas, or take a full CBT exam with zero internet.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshCache}
            disabled={refreshing}
            className="h-9 px-3 rounded-xl border-[#E8E2D6] bg-white hover:border-[#D4AF37] text-[#18181B] text-xs font-bold shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Verifying…" : "Verify Offline Packs"}</span>
          </Button>
        </div>

        {cachedCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#E8E2D6]">
            {cachedCourses.map((course) => (
              <div
                key={course.id}
                className="p-3.5 rounded-xl bg-white border border-[#E8E2D6] flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono text-[11px] font-bold">
                        {course.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" /> Saved
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#18181B] mt-1 line-clamp-1">
                      {course.name}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[#71717A] mt-0.5">
                      {course.formulaCount} formulas · {course.noteCount} summaries ·{" "}
                      {course.questionCount} CBT Qs
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate(`/courses/${course.id}?tab=materials`)}
                    className="min-h-[38px] px-2.5 rounded-lg border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#9A7B1C]" />
                    <span>Read Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/quiz/offline_${course.id}/simulation`)}
                    className="min-h-[38px] px-2.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-[#D4AF37]" />
                    <span>Offline CBT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white border border-[#E8E2D6] text-xs text-[#52525B]">
            Your enrolled courses will appear here automatically as soon as you add them from the Courses Hub.
          </div>
        )}
      </div>

      <AdvancedOfflineCenter />
    </div>
  );
};

export default OfflineStudyHub;
