import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Volume2, VolumeX, Sparkles, ArrowRight, Zap, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { isLiteMode } from "@/lib/liteMode";
import logo from "@/assets/logo.png";

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
 * OverraPrep AI - Cinematic Logo Transition Intro Splash
 * Features butter-smooth spring entrance animations, glowing golden aura,
 * interactive video transition switcher, live progress bar, and buttery crossfade into Welcome.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, forceShow = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { environment } = useEnvironment();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  // Selected intro video: defaults to the Golden Bird flight transition
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

  // Listen for replay requests from any component
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

  // Smooth finish and exit handler
  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    try {
      sessionStorage.setItem("overra_logo_transition_seen", "1");
    } catch {
      // sessionStorage unavailable in strict private mode
    }

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
    }, 500);
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

    const maxWaitTime = lite ? 4800 : 6500;
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
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden bg-[#070605] text-[#F5F5F7] font-sans"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFadingOut ? 0 : 1,
          scale: isFadingOut ? 1.04 : 1,
          filter: isFadingOut ? "blur(12px)" : "blur(0px)",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        onClick={handleFinish}
        role="dialog"
        aria-label="OverraPrep Logo Transition"
      >
        {/* Cinematic Golden Radial Aura Background */}
        <div
          aria-hidden="true"
          className="absolute w-[40rem] h-[40rem] sm:w-[56rem] sm:h-[56rem] rounded-full pointer-events-none opacity-35 animate-pulse duration-[3500ms]"
          style={{
            background:
              "radial-gradient(circle, rgba(212, 175, 55, 0.5) 0%, rgba(212, 175, 55, 0.15) 45%, transparent 70%)",
          }}
        />

        {/* Ambient Vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/50 to-black/95"
        />

        {/* HERO CONTAINER: GOLDEN BIRD EMBLEM + VIDEO REVEAL */}
        <div className="relative z-10 w-full max-w-[540px] sm:max-w-[660px] px-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[60vh] flex items-center justify-center rounded-3xl overflow-hidden bg-black/70 border border-[#D4AF37]/30 shadow-[0_0_80px_rgba(212,175,55,0.25)] backdrop-blur-md"
          >
            {/* 1. STILL GOLDEN BIRD EMBLEM & BRAND TYPOGRAPHY */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
              <div className="relative flex items-center justify-center mb-4">
                <div
                  className="absolute w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-tr from-[#D4AF37]/35 to-[#F5D77F]/10 blur-2xl animate-pulse"
                  aria-hidden="true"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-white/15 to-black/60 border border-[#D4AF37]/50 p-2 shadow-[0_12px_40px_rgba(212,175,55,0.4)] flex items-center justify-center backdrop-blur-xl"
                >
                  <img
                    src={logo}
                    alt="OverraPrep AI Golden Bird"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_20px_rgba(212,175,55,0.85)]"
                    loading="eager"
                  />
                </motion.div>
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.08em] text-white flex items-center justify-center gap-1.5">
                <span>Overra</span>
                <span className="bg-gradient-to-r from-[#FFE58F] via-[#D4AF37] to-[#B38728] bg-clip-text text-transparent">
                  Prep
                </span>
                <span className="ml-1 text-[11px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-[#D4AF37] text-neutral-950 shadow-md">
                  AI
                </span>
              </h1>

              <p className="mt-1.5 text-[11px] sm:text-xs tracking-[0.24em] uppercase text-[#D4AF37] font-extrabold">
                Study Smarter · Succeed Faster
              </p>

              {/* Status Pill */}
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/70 border border-[#D4AF37]/40 text-[10px] font-bold tracking-wider text-[#F5D77F] shadow-md">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin-slow" />
                <span>Nigerian Universities CBT & Study Engine</span>
              </div>
            </div>

            {/* 2. CINEMATIC VIDEO TRANSITION */}
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
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-out ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </motion.div>

          {/* Glowing Golden Progress Bar */}
          <div className="w-full mt-4 bg-white/10 rounded-full h-1.5 overflow-hidden p-0.5 border border-[#D4AF37]/20">
            <div
              className="bg-gradient-to-r from-amber-400 via-[#D4AF37] to-[#FFE58F] h-full rounded-full transition-all duration-75 ease-linear shadow-[0_0_12px_rgba(212,175,55,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Under-card micro caption */}
          <div className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
            <span className="font-medium tracking-wide text-neutral-300">
              {isVideoLoaded ? "Cinematic Golden Bird Reveal Active" : "Initializing CBT Workspace..."}
            </span>
          </div>
        </div>

        {/* TOP CONTROLS */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={(e) => switchVideo(selectedVideoKey === "bird" ? "spark" : "bird", e)}
            aria-label="Switch intro animation style"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/35 transition-all text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] hidden sm:inline">
              {selectedVideoKey === "bird" ? "Golden Bird" : "Spark"}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/35 transition-all text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden xs:inline">Sound</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-amber-400 font-bold hidden xs:inline">Sound On</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFinish();
            }}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] text-neutral-950 hover:brightness-110 shadow-[0_4px_20px_rgba(212,175,55,0.5)] transition-all active:scale-95 cursor-pointer"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* BOTTOM FOOTPRINT */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center justify-center pointer-events-none space-y-1 px-4">
          <div className="flex items-center gap-1.5 text-[11px] tracking-[0.24em] uppercase text-[#D4AF37] font-bold">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>OverraPrep AI · First-Class Excellence</span>
          </div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-neutral-400 font-medium">
            Tap anywhere to enter Welcome page
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
