import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Volume2, VolumeX, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { isLiteMode } from "@/lib/liteMode";

// Two official high-definition OverraPrep intro transitions
export const INTRO_VIDEOS = {
  bird: "/assets/aistudio/Mobile_app_intro_animation_1080p_20261027101742_2c100008.mp4",
  spark: "/assets/aistudio/App_splash_screen_animation_intro_1080p_20261027105250_752db00a.mp4",
} as const;

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

/**
 * OverraPrep AI - Clean Cinematic Logo Transition Splash
 * Focused 100% on the cinematic video logo transition without crowded text or busy overlays.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, forceShow = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { environment } = useEnvironment();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  const [selectedVideoKey, setSelectedVideoKey] = useState<"bird" | "spark">("bird");
  const activeVideoSrc = INTRO_VIDEOS[selectedVideoKey];

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    try {
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        return true;
      }
      return !sessionStorage.getItem("overra_logo_transition_seen");
    } catch {
      return true;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [lite] = useState<boolean>(() => isLiteMode());

  // Listen for replay requests
  useEffect(() => {
    const handleReplay = (e: any) => {
      const mode = e?.detail?.mode === "spark" ? "spark" : "bird";
      setSelectedVideoKey(mode);
      hasFinishedRef.current = false;
      setIsFadingOut(false);
      setIsVisible(true);
      setIsVideoLoaded(false);
      setProgress(0);

      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    };

    window.addEventListener("overra:play-intro", handleReplay);
    return () => window.removeEventListener("overra:play-intro", handleReplay);
  }, []);

  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    try {
      sessionStorage.setItem("overra_logo_transition_seen", "1");
    } catch {}

    setIsFadingOut(true);

    setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }

      if (user && location.pathname === "/") {
        const resumeRoute = getValidResumeRoute(user.id, environment);
        navigate(resumeRoute, { replace: true });
      }
    }, 450);
  }, [user, environment, location.pathname, navigate, onComplete]);

  // Progress ticker & video autoplay
  useEffect(() => {
    if (!isVisible) return;

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isMuted;
      videoEl
        .play()
        .then(() => setIsVideoLoaded(true))
        .catch(() => {
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
    }

    const maxWaitTime = lite ? 4500 : 6000;
    const interval = 50;
    const step = 100 / (maxWaitTime / interval);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleFinish();
          return 100;
        }
        return Math.min(100, prev + step);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible, isMuted, lite, selectedVideoKey, handleFinish]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const switchVideo = (key: "bird" | "spark", e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVideoKey(key);
    setIsVideoLoaded(false);
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden bg-black text-white font-sans"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFadingOut ? 0 : 1,
          scale: isFadingOut ? 1.03 : 1,
          filter: isFadingOut ? "blur(10px)" : "blur(0px)",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleFinish}
        role="dialog"
        aria-label="OverraPrep Logo Transition"
      >
        {/* Fullscreen Clean Cinematic Video Transition Container */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            ref={videoRef}
            key={activeVideoSrc}
            src={activeVideoSrc}
            autoPlay
            playsInline
            muted={isMuted}
            preload="auto"
            onEnded={handleFinish}
            onError={() => setIsVideoLoaded(false)}
            onPlaying={() => setIsVideoLoaded(true)}
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`w-full h-full object-contain sm:object-cover transition-opacity duration-500 ease-out ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {!isVideoLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-10 h-10 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Minimalist Top Controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => switchVideo(selectedVideoKey === "bird" ? "spark" : "bird", e)}
            aria-label="Switch intro animation style"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 transition text-xs font-semibold shadow-md cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] hidden sm:inline">
              {selectedVideoKey === "bird" ? "Bird" : "Spark"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 transition text-xs font-semibold shadow-md cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFinish();
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase bg-[#D4AF37] text-neutral-950 hover:bg-amber-400 shadow-md transition cursor-pointer"
          >
            <span>Skip</span>
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>

        {/* Minimalist Bottom Progress Bar & Tap Hint */}
        <div className="absolute bottom-6 inset-x-8 sm:inset-x-20 z-50 flex flex-col items-center pointer-events-none space-y-2">
          <div className="w-full max-w-xs bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className="bg-[#D4AF37] h-full rounded-full transition-all duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] tracking-[0.18em] uppercase text-neutral-400 font-medium">
            Tap anywhere to enter
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
