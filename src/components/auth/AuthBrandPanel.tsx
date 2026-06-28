import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, GraduationCap, Star, Trophy, Users } from "lucide-react";
import logo from "@/assets/logo.png";
import authBg from "@/assets/auth-bg.jpg";

/**
 * Premium brand showcase panel that sits next to the auth form on large
 * screens. White + gold aesthetic, glassmorphic cards, animated ambassador
 * stack, and rotating student testimonials. Hidden on mobile so the form
 * gets full width.
 */

import bgsFutaAvatar from "@/assets/bgs-futa-ambassador.jpg.asset.json";

const AMBASSADORS: { name: string; seed: string; dept: string; cgpa: string; photo?: string }[] = [
  { name: "BGS FUTA", seed: "BGS", dept: "Lead Ambassador · FUTA", cgpa: "4.95", photo: bgsFutaAvatar.url },
];

const avatarFor = (seed: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=fff8e1,f5c042`;

const TESTIMONIALS = [
  {
    quote:
      "OverraPrep turned my CBT panic into confidence. I went from 52% mocks to a 78% real exam in 6 weeks.",
    name: "Ada O.",
    role: "Computer Science · FUTA",
  },
  {
    quote:
      "The AI explanations are sharper than my tutorials. I finally understand why I get questions wrong.",
    name: "Tunde A.",
    role: "Mechanical Engineering · FUTA",
  },
  {
    quote:
      "Daily streaks + leaderboards keep my class group accountable. We all moved up a grade band.",
    name: "Zainab K.",
    role: "Biochemistry · FUTA",
  },
];

const STATS = [
  { icon: Users,    value: "12,400+", label: "Active students" },
  { icon: Trophy,   value: "78%",     label: "Avg. score lift" },
  { icon: Star,     value: "4.9/5",   label: "Student rating" },
];

const AuthBrandPanel = () => {
  return (
    <aside
      className="hidden lg:flex relative overflow-hidden flex-col justify-between p-10 xl:p-14 text-white"
      aria-label="Why students choose OverraPrep"
    >
      {/* Static editorial photo backdrop */}
      <img
        src={authBg}
        alt=""
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      {/* Readability scrim */}
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-[hsl(35_55%_12%/0.55)] via-[hsl(30_50%_15%/0.45)] to-[hsl(25_60%_10%/0.65)]"
        aria-hidden
      />

      {/* === Top: brand + headline === */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/80 backdrop-blur flex items-center justify-center shadow-[0_10px_30px_-12px_rgba(80,50,0,0.45)]">
            <img src={logo} alt="OverraPrep AI" className="h-9 w-9 object-contain" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-[0.3em] uppercase opacity-70">OverraPrep AI</p>
            <p className="text-sm font-semibold">Study Smart · Not Hard</p>
          </div>
        </div>

        <h1 className="mt-10 text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight drop-shadow-md">
          Where Nigeria's<br />
          <span className="bg-gradient-to-r from-[hsl(45_95%_75%)] via-[hsl(40_100%_85%)] to-[hsl(45_95%_75%)] bg-clip-text text-transparent">
            top students prep
          </span>
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-white/85">
          AI-graded mocks, instant explanations, and the largest FUTA past-question bank — built with our student ambassadors.
        </p>

        {/* Trust pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            { icon: ShieldCheck, label: "Bank-grade security" },
            { icon: Sparkles,    label: "AI-powered explanations" },
            { icon: GraduationCap, label: "Tutor-vetted content" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/65 backdrop-blur px-3 py-1.5 text-[11px] font-semibold border border-white/70 shadow-sm"
            >
              <Icon className="w-3.5 h-3.5 text-[hsl(30_80%_30%)]" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* === Middle: ambassador stack + rotating testimonial === */}
      <div className="my-10 space-y-6">
        <div className="rounded-3xl bg-white/65 backdrop-blur-xl border border-white/70 p-6 shadow-[0_30px_60px_-30px_rgba(80,50,0,0.45)]">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70">
              Student Ambassadors
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[hsl(30_80%_28%)]">
              <Sparkles className="w-3 h-3" /> Verified scholars
            </span>
          </div>

          {/* Avatar stack */}
          <div className="mt-4 flex items-center">
            <div className="flex -space-x-3">
              {AMBASSADORS.map((a, i) => (
                <motion.img
                  key={a.seed}
                  src={a.photo || avatarFor(a.seed)}
                  alt={a.name}
                  loading="lazy"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}
                  className="h-12 w-12 rounded-full border-2 border-white object-cover bg-white shadow-md hover:translate-y-[-3px] transition-transform"
                  style={{ zIndex: AMBASSADORS.length - i }}
                />
              ))}
            </div>
            <div className="ml-4 flex flex-col">
              <span className="text-sm font-semibold">+ 240 ambassadors</span>
              <span className="text-[11px] opacity-70">across 18 Nigerian universities</span>
            </div>
          </div>

          {/* Rotating testimonial cards */}
          <div className="mt-5 space-y-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.5, ease: "easeOut" }}
                className="rounded-2xl bg-white/80 border border-white/80 p-4 shadow-sm"
              >
                <div className="flex gap-0.5 mb-1.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-3 h-3 fill-[hsl(40_95%_50%)] text-[hsl(40_95%_50%)]" />
                  ))}
                </div>
                <p className="text-[13px] leading-relaxed text-[hsl(28_45%_15%)]">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={avatarFor(t.name)}
                    alt={t.name}
                    className="h-7 w-7 rounded-full border border-white shadow-sm"
                  />
                  <div className="leading-tight">
                    <p className="text-[12px] font-semibold">{t.name}</p>
                    <p className="text-[10px] opacity-70">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* === Bottom: stats strip === */}
      <div className="grid grid-cols-3 gap-3">
        {STATS.map(({ icon: Icon, value, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.5 }}
            className="rounded-2xl bg-white/70 backdrop-blur border border-white/80 p-4 text-center shadow-sm"
          >
            <Icon className="w-4 h-4 mx-auto text-[hsl(30_80%_30%)]" />
            <p className="mt-1.5 text-lg font-bold leading-none">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wider opacity-70 font-semibold">{label}</p>
          </motion.div>
        ))}
      </div>
    </aside>
  );
};

export default AuthBrandPanel;