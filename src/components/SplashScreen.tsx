import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Volume2, VolumeX, Sparkles, ArrowRight, Zap, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { isLiteMode } from "@/lib/liteMode";
import { OverraLoader } from "@/components/ui/OverraLoader";

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
 * then smoothly crossfades into the Welcome page.
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
      // If landing directly on the homepage link "/", always display the logo transition
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

    // Failsafe timer (6.5s maximum) to guarantee splash never gets stuck
    const failsafe = setTimeout(() => {
      handleFinish();
    }, 6500);

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
        className="fixed inset-0 z-[999999] flex flex-col items-center justify-center select-none overflow-hidden bg-black text-[#F5F5F7] font-sans"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
        initial={{ opacity: 1 }}
        animate={{
          opacity: isFadingOut ? 0 : 1,
          scale: isFadingOut ? 1.03 : 1,
          filter: isFadingOut ? "blur(8px)" : "blur(0px)",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onClick={handleFinish}
        role="dialog"
        aria-label="OverraPrep Logo Transition"
      >
        {/* Background ambient gold aura */}
        <div
          aria-hidden
          className="absolute w-[36rem] h-[36rem] rounded-full pointer-events-none opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, rgba(212, 175, 55, 0.08) 50%, transparent 75%)",
          }}
        />

        {/* Branch A: Lite Mode (Slow network detected / Data Saver enabled) */}
        {lite ? (
          <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center animate-in fade-in duration-300">
            <div className="relative mb-5">
              <OverraLoader size="xl" hideOrbit={false} />
            </div>

            <h1 className="font-display text-2xl font-bold tracking-[0.08em] text-[#F5F5F7]">
              Overra
              <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C9941F] bg-clip-text text-transparent font-extrabold">
                Prep
              </span>
            </h1>

            <p className="mt-2 text-xs tracking-[0.22em] uppercase text-[#D4AF37]/90 font-medium">
              Rise Beyond Limits.
            </p>

            <div className="mt-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[10px] font-semibold tracking-wider uppercase text-[#F5D77F]">
              <Zap className="w-3 h-3 text-[#D4AF37]" />
              <span>Lite Mode · Instant Load</span>
            </div>
          </div>
        ) : (
          /* Branch B: High-definition cinematic logo transition */
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              key={activeVideoSrc}
              src={activeVideoSrc}
              autoPlay
              playsInline
              muted={isMuted}
              preload="auto"
              onEnded={handleFinish}
              onError={handleFinish}
              onLoadedData={() => setIsVideoLoaded(true)}
              className={`w-full h-full object-contain max-w-[500px] sm:max-w-[620px] max-h-screen transition-opacity duration-300 ${
                isVideoLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        )}

        {/* Top bar controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2">
          {/* Sound Toggle */}
          {!lite && (
            <button
              type="button"
              onClick={toggleSound}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md text-[#D4AF37] border border-[#D4AF37]/30 transition-all text-xs font-semibold shadow-lg active:scale-95"
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
          )}

          {/* Quick Skip button to enter Welcome page */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleFinish();
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase bg-[#D4AF37] text-neutral-950 hover:bg-amber-400 shadow-md transition-all active:scale-95"
          >
            <span>Skip</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom indicator & tap hint */}
        <div className="absolute bottom-6 inset-x-0 flex flex-col items-center justify-center pointer-events-none space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-[#D4AF37]/75 font-semibold">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>OverraPrep AI · Loading Experience</span>
          </div>
          <p className="text-[10px] tracking-[0.16em] uppercase text-neutral-500 font-medium">
            Tap anywhere to enter Welcome page
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SplashScreen;
