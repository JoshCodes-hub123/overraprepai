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
 * OverraPrep AI - Logo Transition Intro Splash
 * When students click our link or open the app, this logo transition plays first,
 * featuring the iconic Golden Bird emblem (both as a still high-res beacon and
 * the cinematic animated bird video transition) before smoothly crossfading into the Welcome page.
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

  // The first thing students should see on link open is the logo transition
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

      // If user is authenticated and currently at the root landing page,
      // navigate smoothly to their valid dashboard route
      if (user && location.pathname === "/") {
        const resumeRoute = getValidResumeRoute(user.id, environment);
        navigate(resumeRoute, { replace: true });
      }
    }, 450);
  }, [user, environment, location.pathname, navigate, onComplete]);

  // Video autoplay & fallback timer for both standard and lite mode
  useEffect(() => {
    if (!isVisible) return;

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isMuted;
      videoEl
        .play()
        .then(() => setIsVideoLoaded(true))
        .catch(() => {
          // Autoplay blocked: force muted and retry
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
    }

    // Safety timeout: guarantees splash never locks the user out
    // 6.5s in normal mode, 4.8s in lite mode
    const maxWaitTime = lite ? 4800 : 6500;
    const failsafe = setTimeout(() => {
      handleFinish();
    }, maxWaitTime);

    return () => clearTimeout(failsafe);
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
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden bg-[#0A0907] text-[#F5F5F7] font-sans"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ opacity: 1 }}
        animate={{
          opacity: isFadingOut ? 0 : 1,
          scale: isFadingOut ? 1.025 : 1,
          filter: isFadingOut ? "blur(8px)" : "blur(0px)",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={handleFinish}
        role="dialog"
        aria-label="OverraPrep Logo Transition"
      >
        {/* Dynamic Golden Ambient Glow Background */}
        <div
          aria-hidden="true"
          className="absolute w-[36rem] h-[36rem] sm:w-[48rem] sm:h-[48rem] rounded-full pointer-events-none opacity-30 animate-pulse duration-[4000ms]"
          style={{
            background:
              "radial-gradient(circle, rgba(212, 175, 55, 0.45) 0%, rgba(212, 175, 55, 0.12) 45%, transparent 70%)",
          }}
        />

        {/* Ambient Top & Bottom Gold Vignette */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/90"
        />

        {/* ================================================================= */}
        {/* HERO CONTAINER: STILL GOLDEN BIRD EMBLEM + CINEMATIC VIDEO        */}
        {/* Always displays the still golden bird immediately on mount,       */}
        {/* smoothly overlaying the video transition (even in Lite Mode).      */}
        {/* ================================================================= */}
        <div className="relative z-10 w-full max-w-[540px] sm:max-w-[640px] px-4 flex flex-col items-center justify-center">
          {/* Main Visual Display Frame */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[58vh] flex items-center justify-center rounded-3xl overflow-hidden bg-black/60 border border-[#D4AF37]/25 shadow-[0_0_60px_rgba(212,175,55,0.2)] backdrop-blur-xs">
            {/* 1. STILL GOLDEN BIRD EMBLEM (Always renders instantly) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none pointer-events-none">
              {/* Outer Radiant Orbit Glow */}
              <div className="relative flex items-center justify-center mb-4">
                <div
                  className="absolute w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#D4AF37]/30 to-[#F5D77F]/10 blur-xl animate-pulse"
                  aria-hidden="true"
                />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-white/10 to-black/40 border border-[#D4AF37]/40 p-2 shadow-[0_8px_32px_rgba(212,175,55,0.35)] flex items-center justify-center backdrop-blur-md">
                  <img
                    src={logo}
                    alt="OverraPrep AI Golden Bird"
                    className="w-full h-full object-contain filter drop-shadow-[0_4px_16px_rgba(212,175,55,0.7)]"
                    loading="eager"
                  />
                </div>
              </div>

              {/* Brand Typography */}
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.06em] text-white flex items-center justify-center gap-1.5">
                <span>Overra</span>
                <span className="bg-gradient-to-r from-[#FFE58F] via-[#D4AF37] to-[#B38728] bg-clip-text text-transparent">
                  Prep
                </span>
                <span className="ml-1 text-[11px] font-black tracking-widest px-1.5 py-0.5 rounded-sm bg-[#D4AF37] text-neutral-950 shadow-xs">
                  AI
                </span>
              </h1>

              <p className="mt-1 text-[11px] sm:text-xs tracking-[0.2em] uppercase text-[#D4AF37]/90 font-bold">
                Study Smarter · Succeed Faster
              </p>

              {/* Status / Lite Mode Pill Indicator */}
              <div className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-[#D4AF37]/35 text-[10px] font-semibold tracking-wider text-[#F5D77F] shadow-xs">
                {lite ? (
                  <>
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Lite Mode · Fast Stream</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Next-Gen CBT Prep Engine</span>
                  </>
                )}
              </div>
            </div>

            {/* 2. CINEMATIC BIRD TRANSITION VIDEO */}
            {/* Plays smoothly in both normal mode and lite mode */}
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
              className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ease-out ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          {/* Under-card micro-caption */}
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
            <span className="font-medium tracking-wide">
              {isVideoLoaded
                ? "Interactive Golden Bird Reveal"
                : "Initializing CBT & Syllabus Environment..."}
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TOP BAR CONTROLS (Sound Toggle, Animation Choice, Skip Button)    */}
        {/* ================================================================= */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
          {/* Video Animation Switcher (Bird Flight vs Spark Reveal) */}
          <button
            type="button"
            onClick={(e) => switchVideo(selectedVideoKey === "bird" ? "spark" : "bird", e)}
            aria-label="Switch intro animation style"
            title="Switch animation style"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 transition-all text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] hidden sm:inline">
              {selectedVideoKey === "bird" ? "Golden Bird" : "Spark"}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 transition-all text-xs font-semibold shadow-lg active:scale-95 cursor-pointer"
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

          {/* Skip Button (Enters Welcome page immediately) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFinish();
            }}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] text-neutral-950 hover:brightness-110 shadow-[0_4px_16px_rgba(212,175,55,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            <span>Skip</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* BOTTOM BRAND FOOTPRINT & TAP TO ENTER                             */}
        {/* ================================================================= */}
        <div className="absolute bottom-5 inset-x-0 flex flex-col items-center justify-center pointer-events-none space-y-1 px-4">
          <div className="flex items-center gap-1.5 text-[11px] tracking-[0.22em] uppercase text-[#D4AF37] font-bold">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>OverraPrep AI · Nigerian Universities</span>
          </div>
          <p className="text-[10px] tracking-[0.14em] uppercase text-neutral-400 font-medium">
            Tap anywhere to enter Welcome page
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
