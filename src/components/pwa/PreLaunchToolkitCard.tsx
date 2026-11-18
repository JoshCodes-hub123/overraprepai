import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  WifiOff,
  Wifi,
  Smartphone,
  Zap,
  MessageSquarePlus,
  Play,
  CheckCircle2,
  Share,
  X,
  HardDrive,
} from "lucide-react";
import { useLiteMode } from "@/lib/liteMode";
import {
  getOfflineCachedCourses,
  type CachedCourseMetadata,
} from "@/lib/autoOfflineSeeder";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PreLaunchToolkitCardProps {
  primaryCourseId?: string;
  primaryCourseCode?: string;
  onOpenSupport?: () => void;
}

export const PreLaunchToolkitCard: React.FC<PreLaunchToolkitCardProps> = ({
  primaryCourseId,
  primaryCourseCode,
  onOpenSupport,
}) => {
  const navigate = useNavigate();
  const [liteMode, setLiteMode] = useLiteMode();
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [cachedCourses, setCachedCourses] = useState<CachedCourseMetadata[]>(() =>
    getOfflineCachedCourses()
  );

  // PWA Install states
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    setCachedCourses(getOfflineCachedCourses());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const iosDevice = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIOS(iosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [primaryCourseId]);

  const totalOfflineQuestions = cachedCourses.reduce((acc, c) => acc + c.questionCount, 0);
  const targetCourseId = primaryCourseId || cachedCourses[0]?.id || "default";
  const targetCourseCode = primaryCourseCode || cachedCourses[0]?.code || "MTH 101";

  const handleStartOfflineCBT = () => {
    navigate(`/quiz/offline_${targetCourseId}/simulation`);
  };

  const handleToggleLiteMode = () => {
    const next = !liteMode;
    setLiteMode(next);
    toast.success(
      next
        ? "Low-Data Lite Mode enabled — heavy images hidden to save mobile data"
        : "Standard Mode restored — course cover images enabled"
    );
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("OverraPrep installed to your phone home screen!");
      }
      return;
    }
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    toast.info(
      "Use your browser menu ('Add to Home screen' or 'Install app') to pin OverraPrep for instant offline access."
    );
  };

  return (
    <>
      <section className="rounded-3xl border border-[#E8E2D6] bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Top Row: Network & Offline Pack Readiness */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#EFECE6]">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                isOnline
                  ? "bg-[#18181B] text-[#D4AF37]"
                  : "bg-[#D4AF37] text-[#18181B]"
              }`}
            >
              {isOnline ? <HardDrive className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                  Offline Study &amp; Low-Data Protection
                </h3>
                <span className="text-xs font-mono tabular-nums text-[#71717A]">
                  · {isOnline ? "Online & Synced" : "Offline Mode Active"}
                </span>
              </div>
              <p className="text-xs text-[#52525B] mt-0.5">
                {cachedCourses.length > 0 ? (
                  <>
                    Auto-saved{" "}
                    <strong className="font-mono tabular-nums text-[#18181B]">
                      {cachedCourses.length} courses
                    </strong>{" "}
                    ({totalOfflineQuestions || 45}+ CBT questions, formulas &amp; summary notes) on this device.
                  </>
                ) : (
                  "Your enrolled course notes, key formulas, and CBT packs are automatically saved for zero-network study."
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartOfflineCBT}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#D4AF37]" />
            <span>Practice {targetCourseCode} Offline</span>
          </button>
        </div>

        {/* Bottom 3-Column Customer Experience Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Low-Data Lite Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleLiteMode}
            className={`min-h-[48px] p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
              liteMode
                ? "bg-[#18181B] border-[#18181B] text-[#FAF8F5]"
                : "bg-[#FAF8F5] border-[#E8E2D6] hover:border-[#D4AF37] text-[#18181B]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Zap
                className={`w-4 h-4 shrink-0 ${
                  liteMode ? "text-[#D4AF37]" : "text-[#9A7B1C]"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Low-Data Lite Mode</p>
                <p
                  className={`text-[11px] truncate ${
                    liteMode ? "text-[#D4AF37]" : "text-[#71717A]"
                  }`}
                >
                  {liteMode ? "On · Hiding heavy images" : "Off · Tap to save 80% data"}
                </p>
              </div>
            </div>
            <span
              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                liteMode
                  ? "bg-[#D4AF37] text-[#18181B]"
                  : "bg-white border border-[#E8E2D6] text-[#52525B]"
              }`}
            >
              {liteMode ? "ON" : "OFF"}
            </span>
          </button>

          {/* 2. 1-Tap Install App to Phone */}
          {!isInstalled ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[48px] p-3 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-left transition-all flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Smartphone className="w-4 h-4 text-[#9A7B1C] shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">Install Phone App</p>
                  <p className="text-[11px] text-[#71717A] truncate">
                    1-tap home screen offline access
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-[#9A7B1C] shrink-0">Install &rarr;</span>
            </button>
          ) : (
            <div className="min-h-[48px] p-3 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] text-[#18181B] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">App Installed</p>
                  <p className="text-[11px] text-[#71717A] truncate">
                    Offline home screen mode active
                  </p>
                </div>
              </div>
              <Wifi className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            </div>
          )}

          {/* 3. Quick Report Issue / Student WhatsApp Support */}
          <button
            type="button"
            onClick={onOpenSupport}
            className="min-h-[48px] p-3 rounded-2xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-left transition-all flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MessageSquarePlus className="w-4 h-4 text-[#9A7B1C] shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Student Help &amp; Support</p>
                <p className="text-[11px] text-[#71717A] truncate">
                  Report issue or chat on WhatsApp
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#9A7B1C] shrink-0">Help &rarr;</span>
          </button>
        </div>
      </section>

      {/* Guided iOS Safari Install Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-[#18181B]">
                Install OverraPrep on iPhone
              </h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="text-xs text-[#52525B] space-y-2.5 leading-relaxed">
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-[#18181B] text-[#D4AF37] font-mono text-[11px] font-bold grid place-items-center shrink-0">
                  1
                </span>
                <span>
                  Tap the <Share className="w-3.5 h-3.5 inline mx-0.5 text-[#18181B]" />{" "}
                  <strong>Share</strong> button in Safari.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-[#18181B] text-[#D4AF37] font-mono text-[11px] font-bold grid place-items-center shrink-0">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-md bg-[#18181B] text-[#D4AF37] font-mono text-[11px] font-bold grid place-items-center shrink-0">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> for instant offline study access.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full min-h-[44px] rounded-xl bg-[#18181B] text-[#FAF8F5] text-xs font-bold cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default PreLaunchToolkitCard;
