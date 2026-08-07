import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, GraduationCap, Sparkles, ShieldCheck, Building2, Star } from "lucide-react";
import { motion } from "framer-motion";
import heroStudent from "@/assets/hero-student-reading.jpg";
import TutorApplicationDialog from "./TutorApplicationDialog";

const HeroSection = () => {
  const navigate = useNavigate();
  const [showTutorDialog, setShowTutorDialog] = useState(false);

  return (
    <section
      className="relative w-full overflow-hidden bg-background"
      aria-label="Hero"
    >
      {/* Soft gold ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 w-[36rem] h-[36rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,hsl(var(--primary)/0.08),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 pt-20 pb-16 sm:pt-24 sm:pb-20 lg:pt-28 lg:pb-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left — copy */}
          <div className="lg:col-span-7 space-y-7 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-primary">
                AI-Powered Exam Prep
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.55 }}
              className="text-[2.5rem] leading-[1.05] sm:text-5xl lg:text-[4.25rem] font-bold tracking-tight text-foreground"
            >
              OverraPrep AI — Prepare Smarter.
              <br />
              <span className="bg-gradient-to-r from-[hsl(43_85%_50%)] via-[hsl(43_78%_52%)] to-[hsl(38_75%_45%)] bg-clip-text text-transparent">
                AI-Powered Exam Preparation
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              The all-in-one CBT exam prep platform built for university students.
              Pick your tutors, practice past questions, get AI explanations and
              track your readiness — all in one place.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-13 px-7 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-xl shadow-primary/30 hover:shadow-primary/40 active:scale-[0.97] transition-all"
                  onClick={() => navigate("/auth?mode=signup&intent=student")}
                >
                  Get Started as Student
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-13 px-6 text-base font-semibold rounded-full border-2 border-primary/50 text-foreground hover:bg-primary/10 hover:border-primary"
                  onClick={() => setShowTutorDialog(true)}
                >
                  <GraduationCap className="w-4 h-4 mr-1.5" />
                  Apply as Tutor
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-x-5 gap-y-1 items-center justify-center lg:justify-start text-sm">
                <button
                  onClick={() => navigate("/auth?mode=signup&intent=school_owner")}
                  className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Register your school
                </button>
                <span className="hidden sm:inline text-border">•</span>
                <button
                  onClick={() => navigate("/start")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Already have an account? <span className="text-primary font-medium">Sign in</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 justify-center lg:justify-start text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Free to start
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified tutors
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" /> Trusted by FUTA students
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right — hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Gold glow behind image */}
              <div className="absolute -inset-6 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent blur-2xl rounded-[3rem]" />

              {/* Image card */}
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/20 border border-primary/20 bg-card">
                <img
                  src={heroStudent}
                  alt="University student reading on the OverraPrep AI app"
                  width={1024}
                  height={1024}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full h-auto object-cover"
                />
                {/* Soft gold edge gradient */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-primary/10 via-transparent to-transparent" />
              </div>

              {/* Floating stat chip */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute -left-3 sm:-left-6 top-10 bg-card/95 backdrop-blur-md border border-primary/25 rounded-2xl px-4 py-3 shadow-xl shadow-primary/15"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-none mb-1">Today's streak</p>
                    <p className="text-sm font-bold text-foreground leading-none">7 days 🔥</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating tutor chip */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.75, duration: 0.5 }}
                className="absolute -right-3 sm:-right-6 bottom-10 bg-card/95 backdrop-blur-md border border-primary/25 rounded-2xl px-4 py-3 shadow-xl shadow-primary/15"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(38_75%_45%)] flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground leading-none mb-1">Your tutors</p>
                    <p className="text-sm font-bold text-foreground leading-none">3 selected</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Soft gold divider at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <TutorApplicationDialog open={showTutorDialog} onOpenChange={setShowTutorDialog} />
    </section>
  );
};

export default HeroSection;
