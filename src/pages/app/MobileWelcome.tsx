import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  FileText,
  Sparkles,
  Globe,
  ChevronRight,
  Headphones,
  PencilLine,
} from "lucide-react";
import appIcon from "@/assets/app-icon.png";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";

/**
 * Slim mobile-first welcome screen.
 * Just hero + 4 core value tiles + footer CTA to view full website.
 * Less is more — first impression should feel calm, not overwhelming.
 */
const MobileWelcome = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="OverraPrep AI — Read with Ease"
        description="AI-powered CBT exam preparation. Practice, learn, and ace your university exams with smart tutors and AI explanations."
        url="/"
      />
      <div
        className="relative min-h-screen bg-background overflow-hidden"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Soft ambient gold halos */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-24 w-[22rem] h-[22rem] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-1/3 -left-24 w-[18rem] h-[18rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(43_78%_52%/0.08),transparent_55%)]" />
        </div>

        <main className="relative z-10 mx-auto w-full max-w-md px-5 pt-5 pb-10">
          {/* Top bar: logo */}
          <header className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img
                src={appIcon}
                alt="OverraPrep AI"
                width={36}
                height={36}
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
              <p className="font-bold text-[15px] tracking-tight text-foreground">
                OverraPrep
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md border border-primary/40 text-[10px] font-bold text-primary">
                  AI
                </span>
              </p>
            </div>
            <button
              onClick={() => navigate("/auth?mode=signin")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Sign in
            </button>
          </header>

          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 mb-4">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-primary">
                AI-Powered. Student-Focused.
              </span>
            </span>

            <h1 className="text-[2rem] leading-[1.05] font-bold tracking-tight text-foreground">
              Prepare Smarter.
              <br />
              <span className="bg-gradient-to-r from-[hsl(43_85%_50%)] to-[hsl(38_75%_45%)] bg-clip-text text-transparent">
                Perform Better.
              </span>
            </h1>

            <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
              CBT practice, AI explanations, and study tools — all in one calm,
              focused app.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                onClick={() => navigate("/start")}
                className="h-12 px-5 rounded-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                3 free AI actions every day · no card required
              </p>
            </div>
          </motion.section>

          {/* What You Get — 4 tiles only */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8"
          >
            <h2 className="font-bold text-[15px] tracking-tight text-foreground mb-3 px-1">
              What you get
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <FeatureTile icon={FileText} title="CBT Practice" desc="Unlimited questions, instant feedback." />
              <FeatureTile icon={Bot} title="AI Tutor" desc="Step-by-step explanations on demand." accent />
              <FeatureTile icon={Headphones} title="Audio Learning" desc="Listen to your notes anywhere." />
              <FeatureTile icon={PencilLine} title="Theory Writing" desc="Write and improve with AI feedback." />
            </div>
          </motion.section>

          {/* Footer CTA — visit full website */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-6 mb-2"
          >
            <button
              onClick={() => navigate("/website")}
              className="group w-full flex items-center justify-between p-4 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all"
            >
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </span>
                <span className="text-left">
                  <span className="block font-semibold text-sm text-foreground">
                    Learn more
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Tutors, how it works, pricing
                  </span>
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>

            <p className="mt-5 text-center text-[11px] text-muted-foreground">
              © {new Date().getFullYear()} OverraPrep AI · Read with Ease.
            </p>
          </motion.section>
        </main>
      </div>
    </>
  );
};

const FeatureTile = ({
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
      "rounded-xl border p-3.5 transition-all " +
      (accent
        ? "border-primary/50 bg-primary/5"
        : "border-border/60 bg-background/40")
    }
  >
    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-2.5">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <p className="font-semibold text-[13px] leading-tight text-foreground">{title}</p>
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{desc}</p>
  </div>
);

export default MobileWelcome;
