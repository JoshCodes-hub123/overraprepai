import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ChevronRight, ArrowLeft, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/seo/SEO";

const ChooseProduct = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO title="Choose your path" description="Pick the OverraPrep product that fits you." noindex url="/start" />
      <div
        className="relative min-h-screen flex flex-col bg-background overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-20 w-[26rem] h-[26rem] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.08),transparent_70%)]" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 pt-5">
          <button onClick={() => navigate("/")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={logo} alt="OverraPrep" className="h-7 w-auto" />
          <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            1 of 2
          </span>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold tracking-wider text-primary uppercase">Welcome</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-3"
          >
            What brings you
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">here today?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-muted-foreground max-w-sm mb-10 text-[15px]"
          >
            Pick a product to get started. You can always switch later.
          </motion.p>

          <div className="w-full max-w-md space-y-4">
            <ProductCard
              delay={0.2}
              icon={GraduationCap}
              title="University Degree Prep"
              subtitle="For university students and tutors preparing for campus semester and CBT exams."
              tag="University Track"
              gradient="from-primary/20 via-primary/5 to-transparent"
              onClick={() => navigate("/start/persona")}
            />
          </div>

          <button
            onClick={() => navigate("/auth?mode=signin")}
            className="mt-10 text-sm text-muted-foreground hover:text-foreground transition"
          >
            I already have an account →
          </button>
        </main>
      </div>
    </>
  );
};

const ProductCard = ({
  icon: Icon,
  title,
  subtitle,
  tag,
  gradient,
  onClick,
  delay,
}: {
  icon: any;
  title: string;
  subtitle: string;
  tag?: string;
  gradient: string;
  onClick: () => void;
  delay: number;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    onClick={onClick}
    className="group relative w-full text-left p-5 rounded-3xl border border-border/60 bg-card/70 backdrop-blur-xl hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 active:scale-[0.98] overflow-hidden"
  >
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
    <div className="relative flex items-start gap-4">
      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/20 p-[1px] shrink-0 shadow-lg shadow-primary/20">
        <div className="w-full h-full rounded-2xl bg-card/90 flex items-center justify-center border border-primary/15">
          <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <h3 className="font-display font-bold text-lg leading-tight">{title}</h3>
          {tag && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm">
              {tag}
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all mt-3" />
    </div>
  </motion.button>
);

export default ChooseProduct;
