import React from "react";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, GraduationCap, Star, Trophy, Users, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";

const AMBASSADORS_PHOTO = "/assets/aistudio/image_6c6bd5ed.png";

const TESTIMONIALS = [
  {
    quote: "OverraPrep turned my CBT panic into confidence. I went from 52% mocks to a 78% real exam in 6 weeks.",
    name: "Ada O.",
    role: "Computer Science · FUTA",
    grade: "First Class Track",
  },
  {
    quote: "The instant AI explanations break down complex engineering math faster than tutorial centers.",
    name: "Tunde A.",
    role: "Mechanical Engineering · FUTA",
    grade: "4.82 CGPA",
  },
];

const STATS = [
  { icon: Users, value: "12,400+", label: "Active Scholars" },
  { icon: Trophy, value: "78%", label: "Avg. Score Lift" },
  { icon: Star, value: "4.9/5", label: "Student Rating" },
];

const UNIVERSITIES = ["FUTA", "OAU", "UI", "UNILAG", "FUTESIYIN"];

export const AuthBrandPanel: React.FC = () => {
  return (
    <aside
      className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white min-h-screen select-none"
      aria-label="OverraPrep AI Academic Excellence"
    >
      {/* 1. Authentic Photography Background with Elegant Vignette */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <img
          src={AMBASSADORS_PHOTO}
          alt="OverraPrep student ambassadors"
          className="h-full w-full object-cover object-center scale-[1.02] transform transition-transform duration-1000 hover:scale-105"
          loading="eager"
        />
        {/* Editorial multi-stop luxury gradient scrim for pristine contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0E0D] via-[#1A1713]/85 to-[#0F0E0D]/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0E0D]/90 via-[#1A1713]/50 to-transparent" />
        {/* Subtle warm gold ambient light */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-[120px] pointer-events-none" />
      </div>

      {/* 2. Top Bar: Authentic Logo Lockup & Ambition Badge */}
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/95 backdrop-blur-md p-1.5 flex items-center justify-center shadow-[0_8px_25px_rgba(0,0,0,0.3)] border border-[#D4AF37]/30">
              <img src={logo} alt="OverraPrep AI Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-[0.22em] uppercase text-white/95">
                  OverraPrep
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#D4AF37] text-[#18181B] tracking-wider uppercase">
                  AI
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-wider text-[#E5D7B5]">
                Rise Beyond Limits
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-[11px] font-medium text-[#F5D77F]">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>2026/2027 Syllabus Updated</span>
          </div>
        </div>

        {/* Hero Narrative */}
        <div className="mt-12 xl:mt-16 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-xs font-semibold text-[#F5D77F] mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Official University Ambassador Community
          </div>

          <h1 className="text-3xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
            Where Nigeria's{" "}
            <span className="bg-gradient-to-r from-[#F5D77F] via-[#D4AF37] to-[#F3C044] bg-clip-text text-transparent">
              brightest minds
            </span>{" "}
            master every exam.
          </h1>

          <p className="mt-4 text-base xl:text-lg text-white/80 leading-relaxed font-normal">
            Past questions curated by top scholars, step-by-step AI guidance, and real CBT simulation designed for first-class ambition.
          </p>

          {/* Trust Value Props */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { icon: ShieldCheck, label: "Verified Past Questions" },
              { icon: Sparkles, label: "Instant AI Explanations" },
              { icon: GraduationCap, label: "Targeted Grade Tracking" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/90 font-medium"
              >
                <Icon className="w-3.5 h-3.5 text-[#F5D77F]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Middle / Bottom: Editorial Testimonial Card & Live Metrics */}
      <div className="relative z-10 space-y-6 pt-8">
        {/* Real Student Showcase Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 text-[#F5D77F]">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-[#F5D77F]" />
              ))}
            </div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-white/60">
              Verified Student Result
            </span>
          </div>

          <p className="text-sm xl:text-base text-white/95 italic leading-relaxed font-light">
            &ldquo;{TESTIMONIALS[0].quote}&rdquo;
          </p>

          <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/10 text-xs">
            <div>
              <p className="font-semibold text-white">{TESTIMONIALS[0].name}</p>
              <p className="text-white/70 text-[11px]">{TESTIMONIALS[0].role}</p>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[11px] font-semibold text-[#F5D77F]">
              {TESTIMONIALS[0].grade}
            </span>
          </div>
        </motion.div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 p-3.5 text-center"
            >
              <Icon className="w-4 h-4 mx-auto text-[#F5D77F] mb-1.5" />
              <p className="text-lg xl:text-xl font-bold text-white tracking-tight">{value}</p>
              <p className="text-[10px] xl:text-[11px] text-white/65 uppercase tracking-wider font-medium mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* University Logos / Badges strip */}
        <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-white/60">
          <span className="font-medium tracking-wide">Supported campuses:</span>
          <div className="flex items-center gap-3 font-semibold text-white/80">
            {UNIVERSITIES.map((uni) => (
              <span key={uni} className="hover:text-[#F5D77F] transition-colors">
                {uni}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default AuthBrandPanel;