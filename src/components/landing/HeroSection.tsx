import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Building2,
  Star,
  Smartphone,
  CheckCircle2,
  Clock,
  Brain,
  HelpCircle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import TutorApplicationDialog from "./TutorApplicationDialog";
import { InstallAppModal } from "@/components/pwa/InstallAppModal";
import { Badge } from "@/components/ui/badge";

interface SampleQuestion {
  course: string;
  topic: string;
  question: string;
  options: { label: string; text: string; correct?: boolean }[];
  explanation: {
    analogy: string;
    rule: string;
  };
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    course: "CSC 201 · FUTA",
    topic: "Data Structures & Asymptotics",
    question: "Given a binary search tree with n keys, what is the worst-case search time complexity when the tree is degenerate (skewed)?",
    options: [
      { label: "A", text: "O(1)" },
      { label: "B", text: "O(log n)" },
      { label: "C", text: "O(n)", correct: true },
      { label: "D", text: "O(n log n)" },
    ],
    explanation: {
      analogy: "Like searching through a single unindexed line in a queue instead of binary division.",
      rule: "When elements are inserted in sorted order without balancing, height h = n - 1, yielding linear O(n) search time.",
    },
  },
  {
    course: "PHY 101 · OAU",
    topic: "Thermodynamics & Energy",
    question: "According to the Second Law of Thermodynamics, in any spontaneous cyclic process, the total entropy of an isolated system:",
    options: [
      { label: "A", text: "Always decreases" },
      { label: "B", text: "Always increases or remains constant", correct: true },
      { label: "C", text: "Fluctuates sinusoidally" },
      { label: "D", text: "Becomes strictly zero at 300K" },
    ],
    explanation: {
      analogy: "Think of perfume sprayed in a campus hall: molecules naturally disperse and never spontaneously gather back into the bottle.",
      rule: "ΔS_universe ≥ 0 for all spontaneous irreversible processes.",
    },
  },
];

const CAMPUSES = [
  { code: "FUTA", name: "Fed. Univ. of Tech, Akure" },
  { code: "OAU", name: "Obafemi Awolowo Univ." },
  { code: "UI", name: "Univ. of Ibadan" },
  { code: "FUTEsIyin", name: "FUTEs Iyin-Ekiti" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  const [showTutorDialog, setShowTutorDialog] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [activeCampus, setActiveCampus] = useState("FUTA");
  const [qIndex, setQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<string | null>("C");
  const [showExplanation, setShowExplanation] = useState(true);

  const currentQ = SAMPLE_QUESTIONS[qIndex];

  const handleSelectOption = (label: string) => {
    setSelectedOpt(label);
    setShowExplanation(true);
  };

  const handleNextSample = () => {
    setQIndex((prev) => (prev + 1) % SAMPLE_QUESTIONS.length);
    setSelectedOpt(null);
    setShowExplanation(false);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-background pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24"
      aria-label="OverraPrep AI Hero"
    >
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 -right-24 w-[38rem] h-[38rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-36 -left-24 w-[34rem] h-[34rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,hsl(var(--primary)/0.09),transparent_65%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Value Prop, Campus Selection, Dual CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Top Pill: Live Play Store & Campus Pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-primary">
                Official Nigerian University CBT Engine
              </span>
              <span className="text-primary/40">•</span>
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                Play Store Ready
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.55 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]"
            >
              Master Your University Exams With{" "}
              <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 dark:from-amber-400 dark:via-amber-300 dark:to-yellow-400 bg-clip-text text-transparent">
                Grounded AI &amp; Real CBT.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16, duration: 0.5 }}
              className="text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto lg:mx-0"
            >
              The definitive academic exam workspace built for university students. Practice verified departmental past questions,
              instant step-by-step KaTeX explanations, offline CBT simulations, and peer showdowns.
            </motion.p>

            {/* Interactive Campus Selector Strip */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.5 }}
              className="space-y-2 pt-1"
            >
              <div className="flex items-center justify-center lg:justify-start gap-1.5 text-xs text-muted-foreground font-medium">
                <span>Select target institution:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-1.5">
                {CAMPUSES.map((c) => {
                  const isActive = activeCampus === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => setActiveCampus(c.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                          : "bg-card/70 hover:bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                      title={c.name}
                    >
                      {c.code}
                    </button>
                  );
                })}
                <span className="text-xs text-muted-foreground italic ml-1 hidden sm:inline">
                  + 100L–500L Handbooks
                </span>
              </div>
            </motion.div>

            {/* Dual CTAs & Play Store Trigger */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.5 }}
              className="space-y-3.5 pt-2"
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="h-12 px-7 text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/35 active:scale-[0.98] transition-all"
                  onClick={() => navigate("/start")}
                >
                  Start Free CBT Practice
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 text-sm sm:text-base font-semibold rounded-full border-2 border-primary/40 text-foreground hover:bg-primary/10 hover:border-primary shadow-2xs"
                  onClick={() => setShowInstallModal(true)}
                >
                  <Smartphone className="w-4 h-4 mr-2 text-primary" />
                  Install Android App
                </Button>
              </div>

              {/* Sub-links */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 items-center justify-center lg:justify-start text-xs text-muted-foreground">
                <button
                  onClick={() => setShowTutorDialog(true)}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-amber-600" />
                  Apply as Educator / Tutor
                </button>
                <span>•</span>
                <button
                  onClick={() => navigate("/auth?mode=signup&intent=school_owner")}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors font-medium"
                >
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  School Partners
                </button>
                <span>•</span>
                <span className="text-foreground/80 font-medium">
                  No credit card required
                </span>
              </div>

              {/* Trust Micro-Badges */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 justify-center lg:justify-start text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Offline CBT
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Verified Syllabus
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 99.4% Pass Rate
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: World-Class Interactive Live CBT Simulation Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-5 relative"
          >
            {/* Ambient gold glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/25 via-primary/10 to-transparent blur-2xl rounded-3xl" />

            {/* Interactive CBT Preview Card */}
            <div className="relative rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-5 shadow-2xl shadow-primary/10 space-y-4">
              {/* CBT Simulation Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-border/70 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold uppercase tracking-wider text-[11px] text-foreground">
                    CBT Exam Mock
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                    {currentQ.course}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground font-mono font-semibold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>28:45</span>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    Question {qIndex + 1} of 40
                  </span>
                  <button
                    onClick={handleNextSample}
                    className="flex items-center gap-1 text-[11px] hover:text-foreground text-muted-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Next Sample
                  </button>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">
                  {currentQ.question}
                </p>
              </div>

              {/* Interactive Options */}
              <div className="space-y-2">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedOpt === opt.label;
                  const isCorrect = opt.correct;
                  let optStyle =
                    "border-border/80 bg-background/80 hover:border-primary/50 text-foreground";

                  if (isSelected) {
                    if (isCorrect) {
                      optStyle =
                        "border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs";
                    } else {
                      optStyle =
                        "border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 font-semibold";
                    }
                  }

                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handleSelectOption(opt.label)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs text-left transition-all ${optStyle}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          isSelected && isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {opt.label}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isSelected && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Instant Grounded AI Breakdown Drawer */}
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl border border-amber-200/80 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-amber-600" />
                      <span>OverraPrep AI Step-by-Step Solution</span>
                    </div>
                    <Badge variant="success" className="text-[9px] py-0">
                      Curriculum Grounded
                    </Badge>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    💡 <strong>Intuitive Analogy:</strong> {currentQ.explanation.analogy}
                  </p>
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    🎯 <strong>Core Rule:</strong> {currentQ.explanation.rule}
                  </p>
                </motion.div>
              )}

              {/* Card Footer CTA */}
              <div className="pt-2 border-t border-border/70 flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-[11px]">
                  Real time tracking &amp; instant scoring
                </span>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg"
                  onClick={() => navigate("/start")}
                >
                  Try Full Mock Exam
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Soft divider below */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <TutorApplicationDialog open={showTutorDialog} onOpenChange={setShowTutorDialog} />
      <InstallAppModal open={showInstallModal} onOpenChange={setShowInstallModal} />
    </section>
  );
};

export default HeroSection;
