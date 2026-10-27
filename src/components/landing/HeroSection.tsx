import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Maximize2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const STUDENTS_HERO_IMAGE = "/assets/aistudio/IMG-20260818-WA0024_1__92e6cff2.jpg";

interface FeaturePill {
  label: string;
  icon: string;
  href: string;
  tag: string;
}

const FEATURE_PILLS: FeaturePill[] = [
  { label: "Audio Learning", icon: "🎧", href: "#preview-video", tag: "Hands-free" },
  { label: "Embedded AI", icon: "🧠", href: "#innovations", tag: "Step-by-step" },
  { label: "Flashcards", icon: "📇", href: "#innovations", tag: "Spaced recall" },
  { label: "Community", icon: "👥", href: "#innovations", tag: "Campus hubs" },
  { label: "Test Quizzes", icon: "📋", href: "#demo", tag: "Timed CBT" },
  { label: "Scholarships", icon: "🎓", href: "#universities", tag: "Merit alerts" },
];

export interface HeroSectionProps {
  onScrollToDemo?: (e?: React.MouseEvent) => void;
  onStartPractice?: () => void;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToDemo,
  onStartPractice,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  const handleStartPractice = () => {
    if (onStartPractice) {
      onStartPractice();
      return;
    }
    if (user) {
      navigate("/student/dashboard");
    } else {
      navigate("/onboarding");
    }
  };

  const handleDemoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onScrollToDemo) {
      onScrollToDemo(e);
      return;
    }
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", "#demo");
    } else {
      navigate("/#demo");
    }
  };

  return (
    <>
      <section
        className="relative min-h-[640px] sm:min-h-[700px] lg:min-h-[760px] flex flex-col justify-center pt-8 sm:pt-14 lg:pt-20 pb-12 sm:pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#0A0A0D] text-white border-b border-[#D4AF37]/20 selection:bg-[#D4AF37] selection:text-black"
        aria-label="OverraPrep AI Introduction"
      >
        {/* ============================================================== */}
        {/* 1. LAYERED BACKGROUND: Semi-Fixed Aesthetic Students Backdrop  */}
        {/* ============================================================== */}
        <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
          {/* Base Dark Atmosphere */}
          <div className="absolute inset-0 bg-[#0A0A0D]" />

          {/* Semi-Fixed Aesthetic Students Image */}
          <div className="absolute inset-0 w-full h-full">
            <img
              src={STUDENTS_HERO_IMAGE}
              alt=""
              className="w-full h-full object-cover object-[72%_top] sm:object-[center_22%] lg:object-[82%_18%] scale-100 sm:scale-105 opacity-40 sm:opacity-55 lg:opacity-65 transition-transform duration-1000 will-change-transform"
              loading="eager"
              aria-hidden="true"
            />
          </div>

          {/* Golden Ambient Nebulae (Behind Students & Central Canvas) */}
          <div
            className="absolute top-[10%] right-[10%] w-[380px] sm:w-[620px] h-[380px] sm:h-[620px] bg-gradient-to-br from-[#D4AF37]/30 via-[#F5D77F]/15 to-transparent rounded-full blur-[140px] mix-blend-screen"
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-24 -left-16 w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] bg-[#996515]/20 rounded-full blur-[130px]"
            aria-hidden="true"
          />

          {/* Desktop Directional Scrim: Smooth Fade from Solid Deep Charcoal to Reveal Students on Right */}
          <div
            className="hidden lg:block absolute inset-0 bg-gradient-to-r from-[#0A0A0D] via-[#0A0A0D]/90 via-45% to-transparent"
            aria-hidden="true"
          />
          <div
            className="hidden sm:block lg:hidden absolute inset-0 bg-gradient-to-r from-[#0A0A0D] via-[#0A0A0D]/85 via-55% to-[#0A0A0D]/30"
            aria-hidden="true"
          />

          {/* Mobile Atmospheric Dark Scrim: Ensures Total Readability without Obscuring Students' Faces */}
          <div
            className="block sm:hidden absolute inset-0 bg-gradient-to-t from-[#0A0A0D] via-[#0A0A0D]/92 via-65% to-[#0A0A0D]/40"
            aria-hidden="true"
          />

          {/* Seamless Bottom Vignette */}
          <div
            className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#0A0A0D] to-transparent"
            aria-hidden="true"
          />
        </div>

        {/* ============================================================== */}
        {/* 2. FOREGROUND CONTENT: High-Contrast Editorial Composition     */}
        {/* ============================================================== */}
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <div className="max-w-2xl lg:max-w-3xl flex flex-col items-start text-left">
            {/* Innovative Mobile Frosted Glass Pod: Gives Mobile Supreme Contrast & Depth */}
            <div className="w-full p-4 sm:p-0 rounded-3xl bg-black/45 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border border-[#D4AF37]/25 sm:border-none shadow-2xl sm:shadow-none">
              {/* Eyebrow Pill */}
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A1813]/90 backdrop-blur-md border border-[#D4AF37]/40 text-[#F5D77F] text-xs font-bold tracking-wider uppercase mb-3.5 sm:mb-5 shadow-[0_2px_12px_rgba(212,175,55,0.18)]"
              >
                <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                <span>NEXT-GEN CBT PREP FOR NIGERIAN UNIVERSITIES</span>
              </motion.div>

              {/* Main Headline with Metallic Gold Polish */}
              <motion.h1
                {...fadeUp}
                transition={{ delay: 0.08, duration: 0.45 }}
                className="text-3xl sm:text-5xl lg:text-[3.5rem] xl:text-[3.85rem] font-black tracking-tight text-white leading-[1.12] sm:leading-[1.08] drop-shadow-sm"
              >
                Master every university exam with{" "}
                <span className="bg-gradient-to-r from-[#F5D77F] via-[#DFBE57] to-[#C5A059] bg-clip-text text-transparent">
                  surgical precision.
                </span>
              </motion.h1>

              {/* Subtitle with High Legibility */}
              <motion.p
                {...fadeUp}
                transition={{ delay: 0.16, duration: 0.45 }}
                className="mt-3.5 sm:mt-5 text-sm sm:text-lg text-neutral-300 max-w-xl sm:max-w-2xl leading-relaxed font-normal"
              >
                Syllabus-aligned CBT simulations, instant AI step-by-step derivations,
                and targeted weak-area drills designed for Nigerian university students
                striving for a first-class academic record.
              </motion.p>

              {/* Action Buttons Row */}
              <motion.div
                {...fadeUp}
                transition={{ delay: 0.22, duration: 0.45 }}
                className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto"
              >
                <button
                  type="button"
                  onClick={handleStartPractice}
                  className="inline-flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-full bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] hover:from-[#DFBE57] hover:to-[#B8860B] text-[#0A0A0D] font-extrabold text-sm sm:text-base tracking-wide shadow-[0_10px_25px_-5px_rgba(212,175,55,0.5)] active:scale-[0.98] transition-all cursor-pointer group"
                >
                  <span>Start Free Practice</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <a
                  href="#demo"
                  onClick={handleDemoClick}
                  className="inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-[#D4AF37]/40 bg-black/50 hover:bg-black/80 backdrop-blur-md text-sm font-bold text-white shadow-lg hover:border-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer"
                >
                  <span className="w-6 h-6 rounded-full bg-[#2A2312] flex items-center justify-center text-[#F5D77F] text-xs font-black">
                    ▶
                  </span>
                  <span>Try Live CBT Demo</span>
                </a>

                {/* Spotlight Button to View Full High-Res Artwork */}
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 h-[52px] px-5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 backdrop-blur-md text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer"
                  title="View full study success photo in high resolution"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Full Artwork</span>
                </button>
              </motion.div>

              {/* Trust Indicator */}
              <motion.div
                {...fadeUp}
                transition={{ delay: 0.28, duration: 0.45 }}
                className="mt-4 sm:mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-300"
              >
                <div className="w-4 h-4 rounded-full bg-emerald-950 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span>14,000+ Verified Past Questions</span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400">FUTA, UNILAG, OAU, UI, UNIBEN</span>
              </motion.div>
            </div>

            {/* ============================================================== */}
            {/* 3. INTERACTIVE 6 PILLARS RIBBON (From the Artwork Badges)      */}
            {/* ============================================================== */}
            <motion.div
              {...fadeUp}
              transition={{ delay: 0.34, duration: 0.45 }}
              className="mt-6 sm:mt-8 pt-5 border-t border-[#D4AF37]/20 w-full"
            >
              <p className="text-[11px] font-bold text-[#F5D77F] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Everything university students need to excel:</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {FEATURE_PILLS.map((pill) => (
                  <a
                    key={pill.label}
                    href={pill.href}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151419]/80 backdrop-blur-md border border-[#D4AF37]/30 hover:border-[#D4AF37] hover:bg-[#221F17] text-xs font-medium text-neutral-200 hover:text-white transition-all shadow-sm"
                  >
                    <span>{pill.icon}</span>
                    <span>{pill.label}</span>
                    <span className="text-[9px] text-[#D4AF37] opacity-80 hidden sm:inline">
                      ({pill.tag})
                    </span>
                  </a>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. HIGH-RESOLUTION SPOTLIGHT MODAL (Full Artwork View)         */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isSpotlightOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSpotlightOpen(false)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-[#111116] border border-[#D4AF37]/50 shadow-2xl p-3 sm:p-5 text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-3 px-1 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    OverraPrep AI — Study Smarter. Succeed Faster.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSpotlightOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-sm transition-colors cursor-pointer"
                  aria-label="Close spotlight view"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative mt-3 rounded-xl sm:rounded-2xl overflow-hidden bg-black/50">
                <img
                  src={STUDENTS_HERO_IMAGE}
                  alt="OverraPrep AI Students High-Resolution Artwork"
                  className="w-full h-auto max-h-[72vh] object-contain mx-auto select-none"
                  loading="eager"
                  width={2045}
                  height={2560}
                />
              </div>

              <div className="mt-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
                <span>Authentic OverraPrep AI university exam preparation environment</span>
                <Link
                  to="/onboarding"
                  onClick={() => setIsSpotlightOpen(false)}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#F5D77F] to-[#D4AF37] text-neutral-900 font-bold hover:brightness-105 transition-all text-xs"
                >
                  Start Free Practice →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroSection;
