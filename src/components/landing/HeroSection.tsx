import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Headphones,
  Brain,
  Layers,
  Users,
  ClipboardCheck,
  Award,
  Play,
  Pause,
  FileText,
  Landmark,
  Target,
  Trophy,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Image Assets
const SLIDE1_STUDENTS_IMAGE = "/assets/aistudio/IMG-20260818-WA0024_1__92e6cff2.jpg";
const SLIDE2_STUDENT_IMAGE = "/assets/aistudio/slide2_student_female_clean.png";

export interface HeroSectionProps {
  onScrollToDemo?: (e?: React.MouseEvent) => void;
  onStartPractice?: () => void;
}

const SLIDE_DURATIONS = [6000, 5000]; // 6s for Slide 1, 5s for Slide 2
const TRANSITION_DURATION = 0.9;
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

    // Progress bar updater (runs every 50ms)
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
      scale: shouldReduceMotion ? 1 : 1.025,
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
      scale: shouldReduceMotion ? 1 : 0.99,
      y: shouldReduceMotion ? 0 : -8,
      transition: {
        duration: TRANSITION_DURATION * 0.75,
        ease: TRANSITION_EASE,
      },
    },
  };

  const textFadeUp = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    animate: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: shouldReduceMotion ? 0 : custom * 0.08,
        duration: 0.5,
        ease: TRANSITION_EASE,
      },
    }),
  };

  return (
    <section
      className="relative min-h-[680px] sm:min-h-[760px] lg:min-h-[820px] flex flex-col justify-between pt-6 sm:pt-10 lg:pt-12 pb-8 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#FAF8F5] text-neutral-900 border-b border-[#D4AF37]/20 select-none"
      aria-label="OverraPrep AI Animated Hero"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* ============================================================== */}
      {/* 1. WARM GOLD & IVORY AMBIENCE LAYER                            */}
      {/* ============================================================== */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[#FAF8F5]" />

        {/* Ambient Warm Golden Halos */}
        <motion.div
          animate={{
            opacity: [0.15, 0.25, 0.15],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[8%] right-[8%] w-[420px] sm:w-[680px] h-[420px] sm:h-[680px] bg-gradient-to-br from-[#D4AF37]/25 via-[#F5D77F]/15 to-transparent rounded-full blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-24 -left-20 w-[360px] sm:w-[500px] h-[360px] sm:h-[500px] bg-[#C5A059]/12 rounded-full blur-[130px]"
          aria-hidden="true"
        />
      </div>

      {/* ============================================================== */}
      {/* 2. DUAL ANIMATED SLIDES CONTAINER                              */}
      {/* ============================================================== */}
      <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 flex flex-col justify-center">
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
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#D4AF37]/45 text-[#996515] text-xs font-extrabold tracking-wider uppercase mb-4 shadow-[0_2px_12px_rgba(212,175,55,0.16)]"
                  >
                    <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                    <span>NEXT-GEN CBT PREP FOR NIGERIAN UNIVERSITIES</span>
                  </motion.div>

                  {/* Main Headline */}
                  <motion.h1
                    custom={2}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="text-3xl sm:text-5xl lg:text-[3.55rem] font-black tracking-tight text-[#1A1813] leading-[1.12]"
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
                    className="mt-4 sm:mt-5 text-sm sm:text-lg text-neutral-600 max-w-xl leading-relaxed font-normal"
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
                    className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
                  >
                    <button
                      type="button"
                      onClick={handleStartPractice}
                      className="inline-flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-full bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#1A1813] font-black text-sm sm:text-base tracking-wide shadow-[0_10px_25px_-5px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all cursor-pointer group"
                    >
                      <span>Start Free Practice</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <a
                      href="#demo"
                      onClick={handleDemoClick}
                      className="inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-[#D4AF37]/50 bg-white/95 hover:bg-white text-sm font-bold text-[#1A1813] shadow-sm hover:border-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#FAF0D6] flex items-center justify-center text-[#996515] text-xs font-black">
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
                    className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-neutral-600"
                  >
                    <div className="w-4 h-4 rounded-full bg-emerald-100 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span>14,000+ Verified Past Questions</span>
                  </motion.div>
                </div>

                {/* Right Column: Visual Composition with Students & Floating Badges */}
                <div className="lg:col-span-6 relative mt-4 lg:mt-0 flex justify-center">
                  <div className="relative w-full max-w-[500px] lg:max-w-[540px]">
                    {/* Glowing Golden Ambient Rings */}
                    <div
                      className="absolute -inset-4 sm:-inset-6 rounded-full border border-[#D4AF37]/35 blur-xs pointer-events-none animate-pulse"
                      aria-hidden="true"
                    />
                    <div
                      className="absolute inset-0 rounded-full border-2 border-[#D4AF37]/20 pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* Main Students Picture Card */}
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(212,175,55,0.2)] border-2 border-white/80 bg-white">
                      <img
                        src={SLIDE1_STUDENTS_IMAGE}
                        alt="Nigerian university students preparing for exams with OverraPrep AI"
                        className="w-full h-auto object-cover max-h-[380px] sm:max-h-[440px] select-none"
                        loading="eager"
                      />

                      {/* Handwritten Accent Badge: Study Smarter Not Harder */}
                      <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-[#D4AF37]/50 text-white text-[11px] sm:text-xs font-bold shadow-lg">
                        <span className="text-[#F5D77F]">Study Smarter</span>
                        <span className="block text-[10px] text-neutral-300">Not Harder</span>
                      </div>
                    </div>

                    {/* Floating Feature Badges (Around the Students) */}
                    {/* 1. Audio Learning (Top Left) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-3 -left-2 sm:-top-5 sm:-left-4 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[70px] sm:min-w-[85px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Audio<br />Learning
                      </span>
                    </motion.div>

                    {/* 2. Embedded AI (Top Center) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[75px] sm:min-w-[90px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <Brain className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Embedded<br />AI
                      </span>
                    </motion.div>

                    {/* 3. Flashcards (Top Right) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, -5, 0] }}
                      transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-3 -right-2 sm:-top-5 sm:-right-4 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[70px] sm:min-w-[85px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Flashcards
                      </span>
                    </motion.div>

                    {/* 4. Community (Mid Left) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, 5, 0] }}
                      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-1/2 -translate-y-1/2 -left-3 sm:-left-6 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[70px] sm:min-w-[85px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Community
                      </span>
                    </motion.div>

                    {/* 5. Test Quizzes (Mid Right) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                      transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-1/2 -translate-y-1/2 -right-3 sm:-right-6 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[70px] sm:min-w-[85px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Test Quizzes
                      </span>
                    </motion.div>

                    {/* 6. Scholarship Opportunities (Bottom Right) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, 5, 0] }}
                      transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-4 -right-2 sm:-bottom-5 sm:-right-4 p-2 sm:p-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/40 shadow-lg flex flex-col items-center gap-1 z-20 text-center min-w-[85px] sm:min-w-[100px]"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515]">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-neutral-800 leading-tight">
                        Scholarship<br />Opportunities
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Bottom 4-Column Statistics Strip (Directly From Reference 1) */}
              <motion.div
                custom={6}
                variants={textFadeUp}
                initial="initial"
                animate="animate"
                className="mt-10 sm:mt-12 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/35 shadow-xl p-4 sm:p-6"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
                  {/* Stat 1 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-2">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#1A1813]">14,000+</span>
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-600">
                      Verified Past Questions
                    </span>
                  </div>

                  {/* Stat 2 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-2">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#1A1813]">All Major</span>
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-600">
                      Nigerian Universities
                    </span>
                  </div>

                  {/* Stat 3 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-2">
                      <Target className="w-4 h-4" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#1A1813]">
                      Syllabus-Aligned
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-600">
                      Practice & Explanations
                    </span>
                  </div>

                  {/* Stat 4 */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] mb-2">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <span className="text-base sm:text-lg font-black text-[#1A1813]">
                      Better Results
                    </span>
                    <span className="text-[11px] sm:text-xs font-semibold text-neutral-600">
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
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-[#D4AF37]/45 text-[#996515] text-xs font-extrabold tracking-wider uppercase mb-4 shadow-[0_2px_12px_rgba(212,175,55,0.16)]"
                  >
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    <span>STUDENT EMPOWERMENT & SUCCESS</span>
                  </motion.div>

                  {/* Main Headline (Directly From Reference 2) */}
                  <motion.h1
                    custom={2}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="text-4xl sm:text-6xl lg:text-[4rem] font-black tracking-tight text-[#1A1813] leading-[1.08]"
                  >
                    Your goals.<br />
                    <span className="bg-gradient-to-r from-[#B8860B] via-[#D4AF37] to-[#996515] bg-clip-text text-transparent">
                      Our priority.
                    </span>
                  </motion.h1>

                  {/* Supporting Copy (Directly From Reference 2) */}
                  <motion.p
                    custom={3}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-4 sm:mt-6 text-base sm:text-xl text-neutral-600 max-w-lg leading-relaxed font-normal"
                  >
                    Join thousands of Nigerian students already achieving more with OverraPrep AI.
                  </motion.p>

                  {/* CTA Buttons (Directly From Reference 2) */}
                  <motion.div
                    custom={4}
                    variants={textFadeUp}
                    initial="initial"
                    animate="animate"
                    className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto"
                  >
                    <button
                      type="button"
                      onClick={handleStartPractice}
                      className="inline-flex items-center justify-center gap-2.5 h-[52px] px-8 rounded-full bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#1A1813] font-black text-sm sm:text-base tracking-wide shadow-[0_10px_25px_-5px_rgba(212,175,55,0.4)] active:scale-[0.98] transition-all cursor-pointer group"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>

                    <a
                      href="#innovations"
                      onClick={handleLearnMoreClick}
                      className="inline-flex items-center justify-center gap-2.5 h-[52px] px-7 rounded-full border border-[#D4AF37]/50 bg-white/95 hover:bg-white text-sm font-bold text-[#1A1813] shadow-sm hover:border-[#D4AF37] active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <span className="w-6 h-6 rounded-full bg-[#FAF0D6] flex items-center justify-center text-[#996515] text-xs font-black">
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
                    className="mt-6 flex items-center gap-3 text-xs sm:text-sm font-semibold text-neutral-600"
                  >
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center border-2 border-white">
                        TA
                      </div>
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white">
                        CO
                      </div>
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white">
                        BK
                      </div>
                    </div>
                    <span>Over 12,000 active university scholars nationwide</span>
                  </motion.div>
                </div>

                {/* Right Column: Welcoming Female Student Visual Composition */}
                <div className="lg:col-span-6 relative mt-4 lg:mt-0 flex justify-center">
                  <div className="relative w-full max-w-[420px] sm:max-w-[480px]">
                    {/* Golden Circular Aura (From Reference 2) */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { scale: [1, 1.04, 1] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 m-auto w-[300px] sm:w-[380px] h-[300px] sm:h-[380px] rounded-full border-4 border-[#F5D77F]/60 bg-gradient-to-tr from-[#D4AF37]/20 via-[#FAF0D6]/30 to-transparent pointer-events-none"
                      aria-hidden="true"
                    />

                    {/* Clean Female Student Visual Card */}
                    <div className="relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(212,175,55,0.22)] border-2 border-white bg-white/90">
                      <img
                        src={SLIDE2_STUDENT_IMAGE}
                        alt="Happy student holding books ready to achieve with OverraPrep AI"
                        className="w-full h-auto object-cover max-h-[380px] sm:max-h-[440px] select-none mx-auto"
                        loading="eager"
                      />
                    </div>

                    {/* Floating Encouragement Badge */}
                    <motion.div
                      animate={shouldReduceMotion ? {} : { y: [0, -6, 0] }}
                      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -bottom-4 left-4 sm:left-6 px-4 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/45 shadow-lg flex items-center gap-2.5 z-20"
                    >
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block text-xs font-black text-[#1A1813]">
                          98.4% Pass Rate
                        </span>
                        <span className="block text-[10px] text-neutral-500">
                          Students scoring 70%+ in CBTs
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Bottom Highlights Card (For Slide 2) */}
              <motion.div
                custom={6}
                variants={textFadeUp}
                initial="initial"
                animate="animate"
                className="mt-10 sm:mt-12 rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-[#D4AF37]/35 shadow-xl p-4 sm:p-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                  <div className="flex items-center gap-3 text-left p-2">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] shrink-0">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#1A1813] block">
                        Adaptive AI Explanations
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Every formula, calculation & derivation broken down
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-left p-2">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#1A1813] block">
                        Targeted Weak-Area Drills
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Pinpoint low-scoring topics before your actual exams
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-left p-2">
                    <div className="w-9 h-9 rounded-xl bg-[#FAF0D6] flex items-center justify-center text-[#996515] shrink-0">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#1A1813] block">
                        First-Class CGPA Blueprint
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        Trusted by federal & state university high-achievers
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ============================================================== */}
      {/* 3. DUAL CAROUSEL CONTROLS & TIMED INDICATORS                   */}
      {/* ============================================================== */}
      <div className="relative z-20 mt-8 mx-auto w-full max-w-7xl flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#D4AF37]/25">
        {/* Slide Indicators with Animated Progress Bars */}
        <div className="flex items-center gap-2 sm:gap-3" role="tablist" aria-label="Hero Carousel Slides">
          {/* Slide 1 Tab Button */}
          <button
            type="button"
            role="tab"
            aria-selected={currentSlide === 0}
            onClick={() => goToSlide(0)}
            className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentSlide === 0
                ? "bg-white text-[#996515] border border-[#D4AF37] shadow-sm"
                : "bg-white/60 hover:bg-white text-neutral-600 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span>01 · Exam Preparation</span>
            {currentSlide === 0 && isPlaying && !isHovered && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#D4AF37] rounded-full overflow-hidden"
                style={{ width: `${slideProgress}%` }}
              />
            )}
          </button>

          {/* Slide 2 Tab Button */}
          <button
            type="button"
            role="tab"
            aria-selected={currentSlide === 1}
            onClick={() => goToSlide(1)}
            className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentSlide === 1
                ? "bg-white text-[#996515] border border-[#D4AF37] shadow-sm"
                : "bg-white/60 hover:bg-white text-neutral-600 border border-transparent"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
            <span>02 · Student Welcome</span>
            {currentSlide === 1 && isPlaying && !isHovered && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#D4AF37] rounded-full overflow-hidden"
                style={{ width: `${slideProgress}%` }}
              />
            )}
          </button>
        </div>

        {/* Play / Pause Toggle Control */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 hover:bg-white border border-[#D4AF37]/35 text-neutral-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title={isPlaying ? "Pause automatic slide animation" : "Resume automatic slide animation"}
            aria-label={isPlaying ? "Pause automatic slide animation" : "Resume automatic slide animation"}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3 h-3 text-[#996515]" />
                <span className="text-[11px]">Pause Loop</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-[#996515] text-[#996515]" />
                <span className="text-[11px]">Play Loop</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-neutral-500 hidden sm:inline">
            Auto-advancing (6s · 5s)
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
