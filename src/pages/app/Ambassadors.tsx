import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, LogIn, Sparkles, Star, ChevronRight } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import bgsAsset from "@/assets/bgs-futa-ambassador.jpg.asset.json";

const AMBASSADORS = [
  { src: bgsAsset.url, name: "BGS FUTA", school: "Lead Ambassador · FUTA", quote: "Driving OverraPrep across every faculty at FUTA." },
];

const ROTATE_MS = 3500;

const Ambassadors = () => {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % AMBASSADORS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const next = (idx + 1) % AMBASSADORS.length;
    const img = new Image();
    img.src = AMBASSADORS[next].src;
  }, [idx]);

  const current = AMBASSADORS[idx];

  return (
    <>
      <SEO title="Meet Our Ambassadors" description="Real students, real results. Join the OverraPrep community." url="/" />
      <div
        className="relative h-[100dvh] w-full bg-background overflow-hidden flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          paddingRight: "env(safe-area-inset-right)",
        }}
      >
        {/* Animated ambient gold halos */}
        <div className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-32 -right-24 w-[24rem] h-[24rem] rounded-full bg-primary/20 blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 -left-24 w-[20rem] h-[20rem] rounded-full bg-amber-300/15 blur-3xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-20 right-1/4 w-[18rem] h-[18rem] rounded-full bg-primary/10 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(43_78%_52%/0.12),transparent_55%)]" />
        </div>

        {/* Floating sparkles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/60"
              style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1.4, 0.5],
              }}
              transition={{
                duration: 3 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.6,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Top bar — glassmorphic */}
        <header className="relative z-20 mx-auto w-full max-w-md px-5 pt-3 flex items-center justify-between shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/70 backdrop-blur-xl border border-primary/20 shadow-sm shadow-primary/5"
          >
            <img src={logo} alt="OverraPrep AI" width={24} height={24} className="w-6 h-6 object-contain" />
            <p className="font-bold text-[13px] tracking-tight text-foreground">
              OverraPrep
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-gradient-to-br from-primary to-amber-600 text-[8px] font-bold text-primary-foreground">
                AI
              </span>
            </p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/auth?mode=signin")}
            className="text-xs font-semibold text-primary hover:text-amber-700 transition flex items-center gap-0.5"
          >
            Sign in
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </header>

        {/* Hero copy */}
        <section className="relative z-10 mx-auto w-full max-w-md px-5 pt-2.5 text-center shrink-0">
          <motion.span
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-primary/15 to-amber-300/15 border border-primary/30 mb-2 backdrop-blur-sm"
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-3 h-3 text-primary" />
            </motion.span>
            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-primary">
              Meet Our Ambassadors
            </span>
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[22px] sm:text-[26px] leading-[1.1] font-bold tracking-tight text-foreground"
          >
            Real students.{" "}
            <span className="bg-gradient-to-r from-[hsl(43_85%_50%)] via-amber-500 to-[hsl(38_75%_45%)] bg-clip-text text-transparent">
              Real results.
            </span>
          </motion.h1>
        </section>

        {/* Image stage */}
        <section className="relative z-10 mx-auto w-full max-w-md px-5 mt-2.5 flex-1 min-h-0 flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full flex-1 min-h-0 rounded-[28px] overflow-hidden bg-gradient-to-br from-amber-100/60 via-white to-amber-50 shadow-2xl shadow-primary/20"
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-[28px] p-[1.5px] bg-gradient-to-br from-primary/60 via-amber-300/40 to-primary/60">
              <div className="w-full h-full rounded-[27px] bg-white" />
            </div>

            <div className="absolute inset-[1.5px] rounded-[27px] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(45_88%_75%/0.4),transparent_60%)]" />

              <AnimatePresence mode="wait">
                <motion.img
                  key={idx}
                  src={current.src}
                  alt={`${current.name}, OverraPrep ambassador`}
                  width={768}
                  height={1024}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  initial={{ opacity: 0, scale: 1.08, x: 40 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.96, x: -40 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </AnimatePresence>

              {/* Top shine */}
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

              {/* Floating "Verified" badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-primary/20"
              >
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span className="text-[9px] font-bold text-foreground tracking-wide">VERIFIED</span>
              </motion.div>

              {/* Bottom info gradient */}
              <div className="absolute inset-x-0 bottom-0 p-3.5 pt-14 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5 }}
                    className="text-white"
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                        ))}
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-200 ml-0.5">
                        Ambassador
                      </span>
                    </div>
                    <p className="font-bold text-[16px] leading-tight">{current.name}</p>
                    <p className="text-[11px] text-white/80">{current.school}</p>
                    <p className="mt-1 text-[12px] italic text-white/95 line-clamp-1">
                      "{current.quote}"
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Dots */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 shrink-0">
            {AMBASSADORS.map((_, i) => (
              <motion.button
                key={i}
                onClick={() => setIdx(i)}
                whileTap={{ scale: 0.85 }}
                aria-label={`Show ambassador ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === idx
                    ? "w-7 bg-gradient-to-r from-primary to-amber-600 shadow-sm shadow-primary/50"
                    : "w-1.5 bg-primary/25 hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        </section>

        {/* CTAs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 mx-auto w-full max-w-md px-5 pt-3 space-y-2 shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => navigate("/start/persona")}
              className="group w-full h-12 rounded-full font-semibold text-[14px] bg-gradient-to-r from-primary via-amber-500 to-primary bg-[length:200%_auto] hover:bg-[position:right_center] text-primary-foreground shadow-xl shadow-primary/40 transition-all duration-500 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center">
                I'm New — Get Started
                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </span>
              {/* Shimmer */}
              <motion.span
                className="absolute inset-0 -skew-x-12"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                }}
                animate={{ x: ["-150%", "150%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
              />
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => navigate("/auth?mode=signin")}
              variant="outline"
              className="w-full h-11 rounded-full font-semibold text-[14px] border-2 border-primary/40 hover:bg-primary/5 hover:border-primary/60 transition-all bg-white/60 backdrop-blur-sm"
            >
              <LogIn className="w-4 h-4 mr-1.5" />
              I already have an account
            </Button>
          </motion.div>
          <button
            onClick={() => navigate("/welcome-tour")}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-primary transition group"
          >
            Learn more about OverraPrep{" "}
            <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        </motion.section>
      </div>
    </>
  );
};

export default Ambassadors;
