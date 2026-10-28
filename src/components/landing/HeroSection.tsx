import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  FileText,
  Landmark,
  Target,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { HeroContainer } from "./HeroContainer";

const SLIDE1_IMAGE = "/assets/aistudio/slide1_students_master.png";
const SLIDE2_IMAGE = "/assets/aistudio/image_603fcbad.png";

export interface HeroSectionProps {
  onScrollToDemo?: (e?: React.MouseEvent) => void;
  onStartPractice?: () => void;
}

const SLIDE_DURATIONS = [6000, 5000]; // 6s for Slide 1, 5s for Slide 2
const TRANSITION_DURATION = 0.85;
const TRANSITION_EASE = [0.22, 1, 0.36, 1];

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToDemo,
  onStartPractice,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  // Slide state: 0 = Exam Prep, 1 = Student Welcome
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [slideProgress, setSlideProgress] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Navigation handlers
  const handleStartPractice = useCallback(() => {
    if (onStartPractice) {
      onStartPractice();
      return;
    }
    if (user) {
      navigate("/student/dashboard");
    } else {
      navigate("/onboarding");
    }
  }, [onStartPractice, user, navigate]);

  const handleDemoClick = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [onScrollToDemo, navigate]
  );

  const handleLearnMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const innovationsEl = document.getElementById("innovations");
      if (innovationsEl) {
        innovationsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", "#innovations");
      } else {
        navigate("/#innovations");
      }
    },
    [navigate]
  );

  // Advance to next slide smoothly
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? 1 : 0));
    setSlideProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setSlideProgress(0);
    startTimeRef.current = Date.now();
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToSlide(0);
      } else if (e.key === "ArrowRight") {
        goToSlide(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToSlide]);

  // Autoplay loop timer with document visibility check
  useEffect(() => {
    if (!isPlaying || isHovered) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const currentDuration = SLIDE_DURATIONS[currentSlide];
    startTimeRef.current = Date.now();

    // Progress bar updater
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / currentDuration) * 100, 100);
      setSlideProgress(pct);
    }, 50);

    // Slide transition timeout
    timerRef.current = setTimeout(() => {
      nextSlide();
    }, currentDuration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentSlide, isPlaying, isHovered, nextSlide]);

  // Pause when browser tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Motion variants for layered crossfade + scale
  const slideVariants = {
    initial: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 1.015,
      y: shouldReduceMotion ? 0 : 8,
    },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: TRANSITION_DURATION,
        ease: TRANSITION_EASE,
      },
    },
    exit: {
      opacity: 0,
      scale: shouldReduceMotion ? 1 : 0.985,
      y: shouldReduceMotion ? 0 : -8,
      transition: {
        duration: TRANSITION_DURATION * 0.7,
        ease: TRANSITION_EASE,
      },
    },
  };

  const textFadeUp = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    animate: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : custom * 0.05,
        duration: 0.45,
        ease: TRANSITION_EASE,
      },
    }),
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full"
    >
      <HeroContainer
        activeSlide={currentSlide}
        totalSlides={2}
        slideProgress={slideProgress}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSelectSlide={goToSlide}
        onScrollToDemo={onScrollToDemo}
      >
        <AnimatePresence mode="wait">
          {currentSlide === 0 ? (
            /* ============================================================ */
            /* SLIDE 1: EXAM PREPARATION (Matches Reference 1)              */
            /* ============================================================ */
            <motion.div
              key="slide-exam-prep"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Exam Preparation Pitch & Actions */}
                <div className="lg:col-span-6 flex flex-col items-start text-left">
                  {/* Eyebrow Badge */}
                  <motion.div
                    custom={1}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#D4AF37]/50 text-[#996515] text-[11px] sm:text-xs font-black tracking-wider uppercase mb-3 shadow-[0_2px_8px_rgba(212,175,55,0.15)]"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>NEXT-GEN CBT PREP FOR NIGERIAN UNIVERSITIES</span>
                  </motion.div>

                  {/* Main Headline */}
                  <motion.h1
                    custom={2}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="text-2xl sm:text-4xl lg:text-[3.35rem] font-black tracking-tight text-[#1A1813] leading-[1.14]"
                  >
                    Master every university exam with{" "}
                    <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#996515] bg-clip-text text-transparent">
                      surgical precision.
                    </span>
                  </motion.h1>

                  {/* Supporting Copy */}
                  <motion.p
                    custom={3}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-3 sm:mt-4 text-xs sm:text-base text-[#4A443A] max-w-xl leading-relaxed font-normal"
                  >
                    Syllabus-aligned CBT simulations, instant AI step-by-step derivations,
                    and targeted weak-area drills designed for students striving for a
                    first-class academic record.
                  </motion.p>

                  {/* CTA Buttons */}
                  <motion.div
                    custom={4}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 w-full sm:w-auto"
                  >
                    <button
                      type="button"
                      onClick={handleStartPractice}
                      className="inline-flex items-center justify-center gap-2 h-[48px] sm:h-[52px] px-6 sm:px-8 rounded-full bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#1A1813] font-black text-sm sm:text-base tracking-wide shadow-[0_8px_20px_-4px_rgba(212,175,55,0.35)] active:scale-[0.98] transition-all cursor-pointer group"
                    >
                      <span>Start Free Practice</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <a
                      href="#demo"
                      onClick={handleDemoClick}
                      className="inline-flex items-center justify-center gap-2 h-[48px] sm:h-[52px] px-5 sm:px-7 rounded-full border border-[#D4AF37]/50 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-bold text-[#1A1813] shadow-xs hover:border-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FAF0D6] flex items-center justify-center text-[#996515] text-[10px] font-black">
                        ▶
                      </span>
                      <span>Try Live CBT Demo</span>
                    </a>
                  </motion.div>

                  {/* Trust Checkmark */}
                  <motion.div
                    custom={5}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-[#5C5346]"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span>14,000+ Verified Past Questions</span>
                  </motion.div>
                </div>

                {/* Right Column: Visual Composition with Integrated Badges */}
                <div className="lg:col-span-6 relative mt-4 lg:mt-0 flex justify-center">
                  <div className="relative w-full max-w-[480px] lg:max-w-[560px]">
                    {/* Glowing Golden Ring Backing */}
                    <div
                      className="absolute -inset-2 sm:-inset-4 rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-tr from-[#D4AF37]/25 via-[#F5D77F]/15 to-transparent blur-md pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* High-Resolution Students Master Card */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(212,175,55,0.22)] border border-[#D4AF37]/40 bg-white">
                      <img
                        src={SLIDE1_IMAGE}
                        alt="Nigerian university students preparing with OverraPrep AI"
                        className="w-full h-auto object-cover select-none"
                        loading="eager"
                        width={1402}
                        height={1122}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 4-Column Statistics Strip */}
              <motion.div
                custom={6}
                variants={textFadeUp}
                initial="initial"
                animate="animate"
                className="mt-8 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/35 shadow-lg p-3 sm:p-5"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
                  <div className="flex flex-col items-center p-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-1.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-[#1A1813]">14,000+</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-[#5C5346]">
                      Verified Past Questions
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-1.5">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-[#1A1813]">All Major</span>
                    <span className="text-[10px] sm:text-xs font-semibold text-[#5C5346]">
                      Nigerian Universities
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-1.5">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-[#1A1813]">
                      Syllabus-Aligned
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold text-[#5C5346]">
                      Practice & Explanations
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-1.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm sm:text-base font-black text-[#1A1813]">
                      Better Results
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold text-[#5C5346]">
                      Track, Improve, Succeed
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* SLIDE 2: STUDENT WELCOME (Matches Reference 2)               */
            /* ============================================================ */
            <motion.div
              key="slide-student-welcome"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Left Column: Student Welcome Pitch & Actions */}
                <div className="lg:col-span-6 flex flex-col items-start text-left">
                  {/* Eyebrow Badge */}
                  <motion.div
                    custom={1}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md border border-[#D4AF37]/50 text-[#996515] text-[11px] sm:text-xs font-black tracking-wider uppercase mb-3 shadow-[0_2px_8px_rgba(212,175,55,0.15)]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>STUDENT EMPOWERMENT & SUCCESS</span>
                  </motion.div>

                  {/* Main Headline */}
                  <motion.h1
                    custom={2}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="text-3xl sm:text-5xl lg:text-[3.8rem] font-black tracking-tight text-[#1A1813] leading-[1.1]"
                  >
                    Your goals.<br />
                    <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#996515] bg-clip-text text-transparent">
                      Our priority.
                    </span>
                  </motion.h1>

                  {/* Supporting Copy */}
                  <motion.p
                    custom={3}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-3 sm:mt-4 text-xs sm:text-lg text-[#4A443A] max-w-lg leading-relaxed font-normal"
                  >
                    Join thousands of Nigerian students already achieving more with OverraPrep AI.
                  </motion.p>

                  {/* CTA Buttons */}
                  <motion.div
                    custom={4}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3.5 w-full sm:w-auto"
                  >
                    <button
                      type="button"
                      onClick={handleStartPractice}
                      className="inline-flex items-center justify-center gap-2 h-[48px] sm:h-[52px] px-6 sm:px-8 rounded-full bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#1A1813] font-black text-sm sm:text-base tracking-wide shadow-[0_8px_20px_-4px_rgba(212,175,55,0.35)] active:scale-[0.98] transition-all cursor-pointer group"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <a
                      href="#innovations"
                      onClick={handleLearnMoreClick}
                      className="inline-flex items-center justify-center gap-2 h-[48px] sm:h-[52px] px-5 sm:px-7 rounded-full border border-[#D4AF37]/50 bg-white hover:bg-neutral-50 text-xs sm:text-sm font-bold text-[#1A1813] shadow-xs hover:border-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#FAF0D6] flex items-center justify-center text-[#996515] text-[10px] font-black">
                        ▶
                      </span>
                      <span>Learn More</span>
                    </a>
                  </motion.div>

                  {/* Social Proof */}
                  <motion.div
                    custom={5}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-4 flex items-center gap-2.5 text-xs font-semibold text-[#5C5346]"
                  >
                    <div className="flex -space-x-1.5">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                        TA
                      </div>
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                        CO
                      </div>
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                        BK
                      </div>
                    </div>
                    <span>Over 12,000 active university scholars nationwide</span>
                  </motion.div>
                </div>

                {/* Right Column: Clean Golden Aura Card for Students Welcome */}
                <div className="lg:col-span-6 relative mt-4 lg:mt-0 flex justify-center">
                  <div className="relative w-full max-w-[360px] sm:max-w-[440px]">
                    {/* Glowing Golden Circle Ambient Background */}
                    <div
                      className="absolute inset-0 m-auto w-[260px] sm:w-[340px] h-[260px] sm:h-[340px] rounded-full border-4 border-[#F5D77F]/60 bg-gradient-to-tr from-[#D4AF37]/25 via-[#FAF0D6]/40 to-transparent pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* Crisp High-Res Student Visual Card */}
                    <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_16px_40px_rgba(212,175,55,0.22)] border border-[#D4AF37]/45 bg-white">
                      <img
                        src={SLIDE2_IMAGE}
                        alt="OverraPrep AI students studying with tablet and AI learning engine"
                        className="w-full h-auto object-cover select-none mx-auto"
                        loading="eager"
                        width={715}
                        height={882}
                      />
                    </div>

                    {/* Floating Metric Card (Balanced Position) */}
                    <div className="absolute -bottom-3.5 left-4 px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/45 shadow-md flex items-center gap-2.5 z-20">
                      <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left">
                        <span className="block text-[11px] font-black text-[#1A1813]">
                          98.4% Pass Rate
                        </span>
                        <span className="block text-[9px] font-medium text-[#7A6E5D]">
                          Scoring 70%+ in Exam Hall
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </HeroContainer>
    </div>
  );
};

export default HeroSection;

