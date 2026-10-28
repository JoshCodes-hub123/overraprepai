import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LogIn,
  ArrowRight,
  GraduationCap,
  Sparkles,
  BookOpen,
  ChevronRight,
  Play,
  Award,
} from "lucide-react";
import logo from "@/assets/logo.png";

export interface HeroContainerProps {
  children: React.ReactNode;
  activeSlide: number;
  totalSlides: number;
  slideProgress: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSelectSlide: (index: number) => void;
  onScrollToDemo?: (e?: React.MouseEvent) => void;
}

export const HeroContainer: React.FC<HeroContainerProps> = ({
  children,
  activeSlide,
  totalSlides,
  slideProgress,
  isPlaying,
  onTogglePlay,
  onSelectSlide,
  onScrollToDemo,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleDemoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
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
    <div className="relative w-full overflow-hidden bg-[#FAF8F5] text-[#1A1813] select-none">
      {/* ============================================================== */}
      {/* 1. AMBIENT WARM GOLDEN LIGHT GLOWS                              */}
      {/* ============================================================== */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 right-[-5%] h-[380px] w-[380px] sm:h-[620px] sm:w-[620px] rounded-full bg-gradient-to-br from-[#D4AF37]/25 via-[#F5D77F]/15 to-transparent blur-[110px]" />
        <div className="absolute -bottom-24 -left-16 h-[320px] w-[320px] sm:h-[500px] sm:w-[500px] rounded-full bg-[#C5A059]/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 h-[240px] w-[240px] rounded-full bg-[#D4AF37]/10 blur-[90px]" />
      </div>

      {/* ============================================================== */}
      {/* 2. AUTHENTIC HERO HEADER BAR                                    */}
      {/* Matches reference screenshot top bar with OverraPrep AI lockup  */}
      {/* ============================================================== */}
      <header className="relative z-30 w-full border-b border-[#D4AF37]/20 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 lg:px-8">
          {/* Brand Wordmark & Tagline */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 transition-transform hover:opacity-95"
            aria-label="OverraPrep AI Homepage"
          >
            <div className="relative flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_2px_10px_rgba(212,175,55,0.18)] border border-[#D4AF37]/30 p-1">
              <img
                src={logo}
                alt="OverraPrep AI"
                className="h-full w-full object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#1A1813]">
                  OverraPrep
                </span>
                <span className="rounded-md bg-gradient-to-r from-[#D4AF37] to-[#B8860B] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                  AI
                </span>
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-[#8A795D] uppercase mt-0.5">
                Study Smarter. Succeed Faster.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (Unboxed, clean typography) */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-semibold text-[#5C5346]">
            <a
              href="#demo"
              onClick={handleDemoClick}
              className="hover:text-[#996515] transition-colors whitespace-nowrap"
            >
              CBT Simulation
            </a>
            <a
              href="#innovations"
              className="hover:text-[#996515] transition-colors whitespace-nowrap"
            >
              Platform Features
            </a>
            <a
              href="#universities"
              className="hover:text-[#996515] transition-colors whitespace-nowrap"
            >
              Supported Universities
            </a>
            <Link
              to="/pricing"
              className="hover:text-[#996515] transition-colors whitespace-nowrap"
            >
              Pricing & Tokens
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("overra:play-intro"))}
              className="hover:text-[#996515] transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer text-amber-800"
              title="Watch Logo Transition Video"
            >
              <Play className="w-3.5 h-3.5 text-[#D4AF37] fill-[#D4AF37]" />
              <span>Logo Intro</span>
            </button>
          </nav>

          {/* Desktop Direct Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5C5346] hover:text-[#1A1813] transition-colors px-3 py-2 rounded-lg hover:bg-[#D4AF37]/10"
            >
              <LogIn className="w-3.5 h-3.5 text-[#996515]" />
              <span>Sign in</span>
            </Link>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#C5A059] to-[#B8860B] text-neutral-950 shadow-[0_4px_14px_rgba(212,175,55,0.35)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.45)] hover:brightness-105 active:scale-98 transition-all"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              to="/auth"
              className="text-xs font-bold text-[#8A795D] hover:text-[#1A1813] px-2.5 py-1.5 rounded-lg"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/35 bg-white/90 text-[#1A1813] shadow-xs hover:bg-white active:scale-95 transition-all"
              aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-[#996515]" />
              ) : (
                <Menu className="h-5 w-5 text-[#996515]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="border-t border-[#D4AF37]/20 bg-white/95 backdrop-blur-xl px-4 py-4 md:hidden overflow-hidden"
            >
              <div className="flex flex-col gap-3">
                <a
                  href="#demo"
                  onClick={handleDemoClick}
                  className="flex items-center justify-between py-2 text-sm font-semibold text-[#1A1813] hover:text-[#996515]"
                >
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-[#D4AF37]" />
                    Interactive CBT Test Drive
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A795D]" />
                </a>
                <a
                  href="#innovations"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-sm font-semibold text-[#1A1813] hover:text-[#996515]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                    Platform Features
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A795D]" />
                </a>
                <a
                  href="#universities"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-sm font-semibold text-[#1A1813] hover:text-[#996515]"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#D4AF37]" />
                    Supported Universities
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A795D]" />
                </a>
                <Link
                  to="/pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 text-sm font-semibold text-[#1A1813] hover:text-[#996515]"
                >
                  <span className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#D4AF37]" />
                    Pricing & Student Bundles
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A795D]" />
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent("overra:play-intro"));
                  }}
                  className="flex w-full items-center justify-between py-2 text-sm font-semibold text-[#1A1813] hover:text-[#996515] text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-[#D4AF37] fill-[#D4AF37]" />
                    Watch Logo Transition Video
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#8A795D]" />
                </button>

                <div className="pt-2 border-t border-[#D4AF37]/15 flex flex-col gap-2">
                  <Link
                    to="/onboarding"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] py-3 text-sm font-bold text-neutral-950 shadow-md"
                  >
                    <span>Start Free Practice</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/auth"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-white py-2.5 text-xs font-bold text-[#1A1813]"
                  >
                    <LogIn className="h-4 w-4 text-[#996515]" />
                    <span>Existing Student Login</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ============================================================== */}
      {/* 3. DYNAMIC BALANCED CONTENT CONTAINER                          */}
      {/* Uses CSS Grid / Flexbox with calculated responsive padding to  */}
      {/* guarantee balanced visual weight and prevent text overlap     */}
      {/* ============================================================== */}
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-5 sm:py-8 lg:py-10">
        {children}
      </main>

      {/* ============================================================== */}
      {/* 4. CAROUSEL CONTROLLER STRIP (Bottom of Hero)                   */}
      {/* Elegant, unobtrusive progress & slide switch bar               */}
      {/* ============================================================== */}
      <div className="relative z-20 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D4AF37]/25 pt-4">
          {/* Slide Indicator Buttons */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSlides }).map((_, idx) => {
              const isActive = activeSlide === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectSlide(idx)}
                  className={`group relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-[#996515] shadow-xs border border-[#D4AF37]/40"
                      : "text-[#8A795D] hover:text-[#1A1813] hover:bg-white/50"
                  }`}
                  aria-label={`Switch to slide ${idx + 1}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span
                    className={`h-2 w-2 rounded-full transition-transform ${
                      isActive ? "bg-[#D4AF37] scale-125" : "bg-[#D4AF37]/40 group-hover:bg-[#D4AF37]/70"
                    }`}
                  />
                  <span className="text-[11px] sm:text-xs">
                    {idx === 0 ? "01. Exam Preparation" : "02. Student Welcome"}
                  </span>

                  {/* Active progress fill line */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-3 right-3 h-[2px] overflow-hidden rounded-full bg-[#D4AF37]/20">
                      <div
                        className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] transition-all duration-75"
                        style={{ width: `${slideProgress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Autoplay Play/Pause & Slide Navigation Shortcuts */}
          <div className="flex items-center gap-3 text-xs text-[#8A795D]">
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/30 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-[#5C5346] hover:bg-white transition-colors cursor-pointer"
              title={isPlaying ? "Pause auto-scroll" : "Resume auto-scroll"}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isPlaying ? "bg-emerald-600 animate-pulse" : "bg-neutral-400"
                }`}
              />
              <span>{isPlaying ? "Autoplay On" : "Paused"}</span>
            </button>
            <span className="hidden sm:inline-block font-mono text-[10px] text-[#A69986]">
              Press ← → keys to switch slides
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
