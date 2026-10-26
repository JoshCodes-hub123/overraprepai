import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, LogIn, Bot, Target, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { SEO } from "@/components/seo/SEO";
import lockup from "@/assets/overraprep-lockup.png.asset.json";
import teamPhoto from "@/assets/team-photo.jpg.asset.json";

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export const Welcome = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { environment, isLoading: envLoading } = useEnvironment();

  useEffect(() => {
    if (!authLoading && !envLoading && user) {
      const resumeRoute = getValidResumeRoute(user.id, environment);
      navigate(resumeRoute, { replace: true });
    }
  }, [user, authLoading, envLoading, environment, navigate]);

  return (
    <>
      <SEO
        title="OverraPrep AI — AI-Powered University CBT & Exam Preparation"
        description="Ace your university CBT exams with syllabus-aligned past questions, instant concept explanations, and targeted weak-area practice for Nigerian universities."
        url="https://overraprepai.com/"
      />

      <div
        className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden selection:bg-primary selection:text-primary-foreground"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Soft ambient gold halos — calm, never busy */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-36 -right-28 w-[24rem] h-[24rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-1/2 -left-28 w-[20rem] h-[20rem] rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(43_78%_52%/0.07),transparent_55%)]" />
        </div>

        {/* Top bar — logo lockup + sign in */}
        <header className="relative z-10 mx-auto w-full max-w-md lg:max-w-3xl px-5 pt-5 flex items-center justify-between">
          <img
            src={lockup.url}
            alt="OverraPrep AI — Study Smarter. Succeed Faster."
            className="h-9 w-auto object-contain"
            width={132}
            height={36}
          />
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-full hover:bg-muted/60"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Link>
        </header>

        <main className="relative z-10 flex-1 mx-auto w-full max-w-md lg:max-w-3xl px-5 pt-10 pb-10 flex flex-col justify-center">
          {/* Hero */}
          <motion.section
            {...fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/25 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-primary">
                For Nigerian university students
              </span>
            </span>

            <h1 className="font-display text-[2.1rem] sm:text-5xl leading-[1.08] font-bold tracking-tight text-foreground">
              Your next academic
              <br />
              chapter{" "}
              <span className="bg-gradient-to-r from-primary to-[hsl(38_75%_45%)] bg-clip-text text-transparent">
                starts here.
              </span>
            </h1>

            <p className="mt-4 text-[14px] sm:text-base leading-relaxed text-muted-foreground max-w-sm sm:max-w-md mx-auto">
              Prepare for your courses, practise questions, and build confidence
              throughout the semester.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-xs sm:max-w-none mx-auto">
              <Link
                to="/onboarding"
                className="w-full sm:w-auto h-12 px-8 rounded-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth"
                className="w-full sm:w-auto h-12 px-8 rounded-full inline-flex items-center justify-center gap-2 bg-card hover:bg-muted/50 text-foreground font-semibold border border-border transition-colors"
              >
                I already have an account
              </Link>
            </div>
          </motion.section>

          {/* Team photo — one warm, quiet image */}
          <motion.section
            {...fadeUp}
            transition={{ delay: 0.12, duration: 0.55, ease: "easeOut" }}
            className="mt-10 max-w-sm mx-auto w-full"
          >
            <div className="relative rounded-[1.75rem] overflow-hidden border border-primary/15 shadow-xl shadow-primary/10">
              <img
                src={teamPhoto.url}
                alt="The OverraPrep team in branded shirts"
                className="w-full aspect-[4/3] object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
              <p className="absolute bottom-3.5 inset-x-0 text-center text-[11px] font-semibold tracking-wide text-white/95">
                Study smarter. Succeed faster.
              </p>
            </div>
          </motion.section>

          {/* Three quiet value tiles */}
          <motion.section
            {...fadeUp}
            transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
            className="mt-10"
          >
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <ValueTile icon={Target} title="CBT Practice" desc="Real exam feel" />
              <ValueTile icon={Bot} title="AI Explanations" desc="Instant clarity" accent />
              <ValueTile icon={BookOpen} title="Weak-Area Drills" desc="Fix gaps fast" />
            </div>
          </motion.section>

          {/* Universities strip */}
          <motion.p
            {...fadeUp}
            transition={{ delay: 0.28, duration: 0.55 }}
            className="mt-10 text-center text-[11px] text-muted-foreground tracking-wide"
          >
            Curriculum isolated by institution · FUTA, OAU, UI, UNILAG & more
          </motion.p>
        </main>

        <footer className="relative z-10 pb-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} OverraPrep AI
        </footer>
      </div>
    </>
  );
};

const ValueTile = ({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: any;
  title: string;
  desc: string;
  accent?: boolean;
}) => (
  <div
    className={
      "rounded-2xl border p-3 sm:p-4 text-center transition-colors " +
      (accent
        ? "border-primary/40 bg-primary/[0.06]"
        : "border-border/70 bg-card/60")
    }
  >
    <div className="w-8 h-8 sm:w-9 sm:h-9 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
    </div>
    <p className="font-display font-semibold text-[11px] sm:text-[13px] leading-tight text-foreground">
      {title}
    </p>
    <p className="mt-0.5 text-[9px] sm:text-[11px] text-muted-foreground">{desc}</p>
  </div>
);

export default Welcome;
