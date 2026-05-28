import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";
import splashBgAsset from "../../public/splash-bg.mp4.asset.json";

/**
 * Splash screen — Phase 7A redesign.
 *
 * Direction: "Minimal sculptural" prototype, refined per user direction.
 *   - Cinematic full-bleed background video of African university students
 *     studying with laptops + phones (warm, golden, calm — premium fintech feel).
 *   - Cream wash + radial gradient over the video so it never overpowers the mark.
 *   - The real OverraPrep logo, animated in with scale + spring + a slow rotating
 *     gold ring orbit and a single shimmer sweep. Subtle floating idle motion.
 *   - Tagline: "Academic Operating System" with masked letter-reveal.
 *   - Tiny gold hairline progress indicator at the bottom (Wema-style).
 *   - Graceful fallback to a static cream gradient if the video fails to load
 *     (slow networks, blocked autoplay, etc.) so the splash never looks broken.
 */
interface SplashScreenProps {
  onComplete: () => void;
}

const SPLASH_DURATION_MS = 3200;
const EXIT_DURATION_MS = 500;

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [exiting, setExiting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), SPLASH_DURATION_MS);
    const doneTimer = setTimeout(() => onComplete(), SPLASH_DURATION_MS + EXIT_DURATION_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  // Best-effort autoplay; muted+playsInline is required on iOS Safari.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const tryPlay = () => v.play().catch(() => { /* autoplay blocked — keep static bg */ });
    if (v.readyState >= 2) tryPlay();
    v.addEventListener("canplay", tryPlay, { once: true });
    return () => v.removeEventListener("canplay", tryPlay);
  }, []);

  const tagline = "Academic Operating System";

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#FCFBF4]"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
            paddingLeft: "env(safe-area-inset-left)",
            paddingRight: "env(safe-area-inset-right)",
          }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: EXIT_DURATION_MS / 1000, ease: "easeInOut" }}
        >
          {/* Cinematic background video — full-bleed cover */}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              videoReady ? "opacity-60" : "opacity-0"
            }`}
            src={splashBgAsset.url}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            aria-hidden="true"
          />

          {/* Warm cream wash + vignette so the mark never fights the footage */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 40%, rgba(252,251,244,0.55) 0%, rgba(252,251,244,0.85) 60%, rgba(252,251,244,0.96) 100%)",
            }}
            aria-hidden="true"
          />
          {/* Subtle gold light from above */}
          <div
            className="absolute inset-0 pointer-events-none mix-blend-soft-light opacity-60"
            style={{
              background:
                "radial-gradient(60% 40% at 50% 0%, rgba(197,160,89,0.45) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          {/* Centerpiece */}
          <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-xs">
            {/* Logo with orbiting gold ring, spring entrance, idle float, single shimmer */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 130, damping: 16, mass: 0.9 }}
              className="relative"
            >
              {/* Outer slow-spinning gold ring */}
              <motion.div
                className="absolute -inset-5 rounded-full border border-[#C5A059]/45"
                animate={{ rotate: 360 }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              >
                {/* Single gold dot on the ring — orbiting accent */}
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#C5A059] shadow-[0_0_10px_rgba(197,160,89,0.8)]" />
              </motion.div>

              {/* Soft golden halo behind logo */}
              <motion.div
                className="absolute inset-0 -m-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(197,160,89,0.35) 0%, rgba(197,160,89,0) 70%)",
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.85, 0.6] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* The mark itself — gentle float */}
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <motion.img
                  src={logo}
                  alt="OverraPrep AI"
                  className="relative w-28 h-28 md:w-32 md:h-32 object-contain"
                  style={{ filter: "drop-shadow(0 18px 36px rgba(120,90,20,0.28))" }}
                  initial={{ rotate: -8 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.05 }}
                />

                {/* Single shimmer sweep over the mark */}
                <motion.div
                  className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                    mixBlendMode: "overlay",
                  }}
                  initial={{ x: "-130%" }}
                  animate={{ x: "130%" }}
                  transition={{ delay: 0.9, duration: 1.4, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>

            {/* Tagline — masked letter reveal */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6, ease: "easeOut" }}
              className="mt-10 text-[11px] md:text-xs font-semibold tracking-[0.32em] uppercase text-[#1A1A1A] text-center"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {tagline.split(" ").map((word, wi) => (
                <span key={wi} className="inline-block whitespace-nowrap mr-[0.5em]">
                  {word.split("").map((ch, ci) => (
                    <motion.span
                      key={ci}
                      className="inline-block"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + (wi * 0.15) + (ci * 0.025), duration: 0.4, ease: "easeOut" }}
                    >
                      {ch}
                    </motion.span>
                  ))}
                </span>
              ))}
            </motion.p>

            {/* Sub-line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              className="mt-3 text-[11px] text-[#8E8A7E] text-center tracking-wide"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Built for African university students.
            </motion.p>

            {/* Hairline progress — Wema-style quiet loader */}
            <div className="mt-12 w-32 h-[1.5px] rounded-full bg-[#EBE6D8] relative overflow-hidden">
              <motion.div
                className="absolute top-0 bottom-0 w-1/3 rounded-full bg-gradient-to-r from-[#C5A059]/30 via-[#C5A059] to-[#C5A059]/30"
                animate={{ x: ["-100%", "300%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </div>

          {/* Bottom footnote */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <p
              className="text-[9px] font-semibold tracking-[0.32em] uppercase text-[#C5A059]/60"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              OverraPrep · Academic OS
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
