import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Volume2, VolumeX, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { isLiteMode } from "@/lib/liteMode";
import { OverraLoader } from "@/components/ui/OverraLoader";
import logo from "@/assets/logo.png";

const SPLASH_VIDEO_SRC =
  "/assets/aistudio/App_splash_screen_animation_intro_1080p_20261027105250_752db00a.mp4";

interface SplashScreenProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

/**
 * OverraPrep AI - Premium Animated Splash Screen with Adaptive Lite Mode
 *
 * Capabilities:
 *  - High-speed / 4G / Wi-Fi: Streams the official 1080p 6-second video intro.
 *  - Slow network / 2G / 3G / Low memory: Instantly switches to the lightweight
 *    vector OverraPrep orbit animation with "Lite Mode · Fast Load" indicator
 *    to eliminate buffering and reduce perceived wait time on lower-end devices.
 *  - Auto-advance on video end (or failsafe timeout)
 *  - Tap anywhere or click "Skip" for immediate entry
 *  - Startup-only gating via sessionStorage
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, forceShow = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { environment } = useEnvironment();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasFinishedRef = useRef<boolean>(false);

  // Check if user already saw splash in this browser session
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (forceShow) return true;
    try {
      return !sessionStorage.getItem("overra_splash_seen_v2");
    } catch {
      return true;
    }
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isVideoLoaded, setIsVideoLoaded] = useState<boolean>(false);
  const [lite] = useState<boolean>(() => isLiteMode());

  // Smooth finish and exit handler
  const handleFinish = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    try {
      sessionStorage.setItem("overra_splash_seen_v2", "1");
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
    }, 350);
  }, [user, environment, location.pathname, navigate, onComplete]);

  // Attempt video autoplay on mount (only in normal mode)
  useEffect(() => {
    if (!isVisible) return;

    if (lite) {
      // In Lite mode, run a brisk 1.8s transition to reduce wait time on slow networks
      const liteTimer = setTimeout(() => {
        handleFinish();
      }, 1800);
      return () => clearTimeout(liteTimer);
    }

    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.muted = isMuted;
      videoEl
        .play()
        .then(() => setIsVideoLoaded(true))
        .catch(() => {
          // Autoplay blocked: try muted
          videoEl.muted = true;
          videoEl.play().catch(() => {});
        });
    }

    // Failsafe timer (6.8s maximum) to guarantee splash never gets stuck
    const failsafe = setTimeout(() => {
      handleFinish();
    }, 6800);

    return () => clearTimeout(failsafe);
  }, [isVisible, isMuted, lite, handleFinish]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden bg-black text-[#F5F5F7] font-sans"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: isFadingOut ? 0 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        onClick={handleFinish}
        role="dialog"
        aria-label="OverraPrep Animated Splash Screen"
      >
        {/* Branch A: Lite Mode (Slow network detected / Data Saver enabled) */}
        {lite ? (
          <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
            {/* Ambient gold glow */}
            <div
              className="absolute w-64 h-64 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(212, 175, 55, 0.16) 0%, transparent 70%)",
              }}
            />

            {/* Authentic OverraPrep Emblem with Orbit */}
            <div className="relative mb-5">
              <OverraLoader size="xl" hideOrbit={false} />
            </div>

            {/* Wordmark */}
            <h1 className="font-display text-2xl font-bold tracking-[0.08em] text-[#F5F5F7]">
              Overra
              <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C9941F] bg-clip-text text-transparent font-extrabold">
                Prep
              </span>
            </h1>

            {/* Tagline */}
            <p className="mt-2 text-xs tracking-[0.22em] uppercase text-[#D4AF37]/90 font-medium">
              Rise Beyond Limits.
            </p>

            {/* Lite indicator badge */}
            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-semibold tracking-wider uppercase text-[#F5D77F]">
              <Zap className="w-3 h-3 text-[#D4AF37]" />
              <span>Lite Mode · Instant Campus Load</span>
            </div>
          </div>
        ) : (
          /* Branch B: High-res video intro (Normal fast network) */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={SPLASH_VIDEO_SRC}
              autoPlay
              playsInline
              muted={isMuted}
              preload="auto"
              onEnded={handleFinish}
              onError={handleFinish}
              onLoadedData={() => setIsVideoLoaded(true)}
              className={`w-full h-full object-contain max-w-[540px] max-h-screen transition-opacity duration-300 ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        )}

        {/* Top bar controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
          {!lite && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? "Unmute intro video" : "Mute intro video"}
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#D4AF37]/80 hover:text-[#D4AF37] border border-[#D4AF37]/20 transition-all active:scale-95"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFinish();
            }}
            className="px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/25 transition-all hover:border-[#D4AF37]/60 active:scale-95"
          >
            Skip
          </button>
        </div>

        {/* Discreet bottom tap hint for mobile */}
        <div className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#D4AF37]/40 font-medium">
            Tap anywhere to enter
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
