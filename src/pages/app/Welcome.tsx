import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  LogIn,
  CheckCircle2,
  Check,
  Clock,
  Sparkles,
  BookOpen,
  Target,
  Brain,
  DownloadCloud,
  GraduationCap,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Layers,
  Users,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { SEO } from "@/components/seo/SEO";
import teamPhoto from "@/assets/team-photo.jpg.asset.json";
import logo from "@/assets/logo.png";
import { HeroSection } from "@/components/landing/HeroSection";

// Motion variants
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
};

// Demo interactive CBT questions
interface DemoQuestion {
  code: string;
  courseTitle: string;
  question: string;
  formula?: string;
  options: { label: string; text: string; isCorrect: boolean }[];
  explanation: {
    steps: string[];
    conceptKey: string;
    tutorNote: string;
  };
}

const DEMO_QUESTIONS: Record<string, DemoQuestion> = {
  mth101: {
    code: "MTH 101",
    courseTitle: "Elementary Mathematics I (Calculus)",
    question: "Evaluate the standard trigonometric limit as x approaches zero:",
    formula: "lim (x -> 0) [sin(4x) / tan(2x)]",
    options: [
      { label: "A", text: "0", isCorrect: false },
      { label: "B", text: "2", isCorrect: true },
      { label: "C", text: "4", isCorrect: false },
      { label: "D", text: "Undefined", isCorrect: false },
    ],
    explanation: {
      steps: [
        "Step 1: Recall that tan(2x) = sin(2x) / cos(2x).",
        "Step 2: Express the quotient as [sin(4x) / (4x) * 4x] / [sin(2x) / (2x) * 2x * (1 / cos(2x))].",
        "Step 3: By the fundamental limit theorem, lim(u -> 0) [sin(u) / u] = 1, and cos(0) = 1.",
        "Step 4: The expression simplifies to (1 * 4x) / (1 * 2x * 1) = 4 / 2 = 2.",
      ],
      conceptKey: "Fundamental Trigonometric Limits & Indeterminate Forms",
      tutorNote:
        "Appears in over 85% of First Semester University Calculus CBT examinations across Nigerian federal universities.",
    },
  },
  phy101: {
    code: "PHY 101",
    courseTitle: "General Physics I (Mechanics)",
    question: "A projectile is launched with velocity v at angle θ to the horizontal. The maximum horizontal range is achieved when θ equals:",
    formula: "R = (v^2 * sin(2θ)) / g",
    options: [
      { label: "A", text: "30°", isCorrect: false },
      { label: "B", text: "45°", isCorrect: true },
      { label: "C", text: "60°", isCorrect: false },
      { label: "D", text: "90°", isCorrect: false },
    ],
    explanation: {
      steps: [
        "Step 1: The horizontal range equation is R = (v^2 * sin(2θ)) / g.",
        "Step 2: Range R is maximized when sin(2θ) reaches its maximum possible value of 1.",
        "Step 3: sin(2θ) = 1 implies 2θ = 90°, therefore θ = 45°.",
      ],
      conceptKey: "Kinematics & Projectile Motion Optimization",
      tutorNote:
        "High-frequency 100-level exam question. Be careful not to confuse range with maximum height (which peaks at 90°).",
    },
  },
  che101: {
    code: "CHE 101",
    courseTitle: "General Chemistry I (Physical & Inorganic)",
    question: "According to the Heisenberg Uncertainty Principle, which pair of variables cannot be simultaneously measured with arbitrary precision?",
    formula: "Δx · Δp ≥ h / (4π)",
    options: [
      { label: "A", text: "Position and Momentum", isCorrect: true },
      { label: "B", text: "Energy and Volume", isCorrect: false },
      { label: "C", text: "Mass and Velocity", isCorrect: false },
      { label: "D", text: "Charge and Spin", isCorrect: false },
    ],
    explanation: {
      steps: [
        "Step 1: The Heisenberg relation couples conjugate variables: Δx · Δp ≥ ℏ/2 = h / (4π).",
        "Step 2: Here, x represents position along a spatial axis, and p represents linear momentum (m · v).",
        "Step 3: Any increase in precision for position inherently broadens the uncertainty in momentum.",
      ],
      conceptKey: "Quantum Mechanics & Wave-Particle Duality",
      tutorNote:
        "Crucial foundation for Atomic Structure & Quantum Numbers sections in general chemistry.",
    },
  },
};

const UNIVERSITIES = [
  {
    name: "Federal University of Technology Akure",
    acronym: "FUTA",
    faculties: "SEET, SAAT, SET, SOC, SLAS",
    courses: "MTH101, PHY101, CHE101, MEK201, CVE301",
    questionCount: "4,600+ Questions",
    gateImage: "/assets/aistudio/image_1cdb46ce.png",
    gateDescription: "Official FUTA Main Gate Illuminated",
  },
  {
    name: "University of Lagos",
    acronym: "UNILAG",
    faculties: "Engineering, Sciences, FSS, Arts",
    courses: "MAT111, PHY111, CHM111, GST102",
    questionCount: "3,800+ Questions",
    gateImage: "/assets/aistudio/image_a987426b.png",
    gateDescription: "Iconic UNILAG Front Entrance Gate",
  },
  {
    name: "Obafemi Awolowo University",
    acronym: "OAU",
    faculties: "Technology, Science, Health Sciences",
    courses: "MTH101, PHY105, CHM101, SER001",
    questionCount: "3,400+ Questions",
    gateImage: "/assets/aistudio/image_7a396a45.png",
    gateDescription: "Historic Great Ife Gateway Arch",
  },
  {
    name: "University of Ibadan",
    acronym: "UI",
    faculties: "Science, Technology, Basic Medical",
    courses: "MAT111, PHY101, CHE156, GES101",
    questionCount: "2,900+ Questions",
    gateImage: "/assets/aistudio/image_34f037cc.png",
    gateDescription: "UI Landmark Tower & Seal",
  },
  {
    name: "University of Benin",
    acronym: "UNIBEN",
    faculties: "Engineering, Physical Sciences, Life Sciences",
    courses: "MTH110, PHY111, CHM111, GST111",
    questionCount: "2,500+ Questions",
    gateImage: null,
    gateDescription: "Ugbowo Campus Portal",
  },
];

const STUDENT_STORIES = [
  {
    name: "Toluwalase A.",
    school: "FUTA · Mechanical Engineering",
    score: "4.72 First Class CGPA",
    quote:
      "Before OverraPrep, solving past questions meant deciphering photocopied handouts with incorrect answer keys. The instant AI step-by-step breakdown taught me the math behind every solution.",
  },
  {
    name: "Chukwuma O.",
    school: "UNILAG · Computer Science",
    score: "Scored 88% in MAT111 CBT",
    quote:
      "The timed CBT interface is identical to our actual campus exam hall. By the time I sat down for the real test, my anxiety was gone—it felt like just another practice drill.",
  },
  {
    name: "Blessing K.",
    school: "OAU · Chemical Engineering",
    score: "Cleared all 9 courses in Year 1",
    quote:
      "The weak-area diagnostic pointed out that I was losing points on Thermodynamics. A 20-minute targeted drill turned it into my highest scoring topic in CHE101.",
  },
];

export const Welcome = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { environment, isLoading: envLoading } = useEnvironment();

  // Interactive Demo State
  const [activeCourseKey, setActiveCourseKey] = useState<string>("mth101");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Video controller state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Resume check: if user is signed in, seamlessly route to their valid academic home
  useEffect(() => {
    if (!authLoading && !envLoading && user) {
      const resumeRoute = getValidResumeRoute(user.id, environment);
      navigate(resumeRoute, { replace: true });
    }
  }, [user, authLoading, envLoading, environment, navigate]);

  // Handle smooth scroll when landing with /#demo or when hash changes
  useEffect(() => {
    const scrollToHash = () => {
      if (window.location.hash === "#demo") {
        const demoEl = document.getElementById("demo");
        if (demoEl) {
          demoEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    if (window.location.hash === "#demo") {
      const timer = setTimeout(scrollToHash, 100);
      return () => clearTimeout(timer);
    }

    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  const scrollToDemo = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.history.pushState(null, "", "#demo");
    const demoEl = document.getElementById("demo");
    if (demoEl) {
      demoEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
  const handleScrollToDemo = scrollToDemo;

  const currentQ = DEMO_QUESTIONS[activeCourseKey];

  const handleSelectOption = (label: string) => {
    setSelectedOption(label);
    setShowExplanation(true);
  };

  const handleSwitchQuestion = (key: string) => {
    setActiveCourseKey(key);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleVideoMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <>
      <SEO
        title="OverraPrep AI — Precision CBT & University Exam Preparation"
        description="Master Nigerian university CBT examinations with syllabus-aligned past questions, instant step-by-step AI derivations, and targeted weak-area remediation for FUTA, UNILAG, OAU, UI, and UNIBEN."
        url="https://overraprepai.com/"
      />

      <div
        className="relative min-h-screen bg-background text-foreground flex flex-col selection:bg-primary selection:text-primary-foreground font-sans antialiased"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Subtle, calculated ambient lighting */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 right-[-10%] w-[38rem] h-[38rem] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute top-[40%] -left-32 w-[32rem] h-[32rem] rounded-full bg-primary/[0.06] blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[30rem] h-[30rem] rounded-full bg-primary/[0.08] blur-[130px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,hsl(43_78%_52%/0.08),transparent_70%)]" />
        </div>

        {/* ── Strict 3-Zone Top Navigation Bar ── */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/90 border-b border-border/70 transition-colors">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Zone 1: Authentic OverraPrep Logo Lockup */}
            <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
              <img
                src={logo}
                alt="OverraPrep AI Logo"
                className="h-9 sm:h-10 w-auto object-contain transition-transform group-hover:scale-105 shrink-0 drop-shadow-xs"
                width={40}
                height={40}
              />
              <div className="flex flex-col">
                <span className="font-extrabold tracking-tight text-base sm:text-lg flex items-center gap-1.5 text-[#18181B] dark:text-white leading-none">
                  OverraPrep
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C5A059] text-neutral-900 uppercase tracking-wider">
                    AI
                  </span>
                </span>
                <span className="text-[9px] font-semibold text-[#71717A] dark:text-neutral-400 tracking-wider uppercase mt-1 hidden xs:inline">
                  Study Smarter. Succeed Faster.
                </span>
              </div>
            </Link>

            {/* Zone 2: Editorial Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-muted-foreground">
              <a href="#demo" className="hover:text-foreground transition-colors">
                Interactive CBT
              </a>
              <a href="#preview-video" className="hover:text-foreground transition-colors">
                Experience
              </a>
              <a href="#innovations" className="hover:text-foreground transition-colors">
                Core Features
              </a>
              <a href="#universities" className="hover:text-foreground transition-colors">
                Universities
              </a>
              <a href="#trust" className="hover:text-foreground transition-colors">
                Team & Results
              </a>
            </nav>

            {/* Zone 3: Direct User Action */}
            <div className="flex items-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 sm:px-3.5 py-2 rounded-lg hover:bg-muted/70"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
              </Link>
              <Link
                to="/onboarding"
                className="inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:shadow-md"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── Main Showcase Body ── */}
        <main className="relative z-10 flex-1 flex flex-col">
          {/* ── Premium Dark Layered HeroSection with Subtle Gold Glow ── */}
          <HeroSection onScrollToDemo={scrollToDemo} />

          {/* ── Interactive Live CBT Engine Preview ── */}
          <section id="demo" className="scroll-mt-20 py-12 sm:py-16 px-4 sm:px-6 bg-card/40 border-b border-border/70">
            <div className="mx-auto w-full max-w-4xl">
              <div className="text-center mb-8">
                <span className="text-[11px] font-bold tracking-widest uppercase text-primary">
                  Interactive Test Drive
                </span>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Experience how OverraPrep AI works
                </h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                  Click an answer below to see the instant step-by-step breakdown
                  generated for difficult past exam questions.
                </p>
              </div>

              {/* Course Selector Tabs */}
              <div className="flex items-center justify-center gap-2 mb-4 overflow-x-auto pb-1">
                {Object.keys(DEMO_QUESTIONS).map((key) => {
                  const item = DEMO_QUESTIONS[key];
                  const active = activeCourseKey === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSwitchQuestion(key)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{item.code}</span>
                      <span className="opacity-80 text-[10px] hidden sm:inline">
                        ({item.courseTitle.split(" ")[1]})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CBT Terminal Shell */}
              <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                {/* Header bar of simulated test */}
                <div className="bg-muted/70 px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{currentQ.code}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground truncate max-w-[180px] sm:max-w-none">
                      {currentQ.courseTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-mono text-primary font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>00:44:12</span>
                    </div>
                    <div className="text-[11px] font-medium bg-background px-2.5 py-1 rounded border border-border">
                      Question 03 of 40
                    </div>
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-5 sm:p-7">
                  <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">
                    Question Stem
                  </p>
                  <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed">
                    {currentQ.question}
                  </p>

                  {currentQ.formula && (
                    <div className="my-4 p-3.5 rounded-xl bg-muted/40 border border-border/80 font-mono text-center text-sm sm:text-base text-foreground font-semibold tracking-wide">
                      {currentQ.formula}
                    </div>
                  )}

                  {/* Options List */}
                  <div className="mt-6 space-y-2.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedOption === opt.label;
                      const isCorrect = opt.isCorrect;
                      const hasAnswered = selectedOption !== null;

                      let stateClass = "border-border/80 bg-background hover:bg-muted/40 hover:border-border";
                      if (hasAnswered) {
                        if (isSelected && isCorrect) {
                          stateClass = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold";
                        } else if (isSelected && !isCorrect) {
                          stateClass = "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300";
                        } else if (!isSelected && isCorrect) {
                          stateClass = "border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
                        } else {
                          stateClass = "opacity-50 border-border/40 bg-background";
                        }
                      }

                      return (
                        <button
                          key={opt.label}
                          onClick={() => handleSelectOption(opt.label)}
                          className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-all ${stateClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                                isSelected
                                  ? isCorrect
                                    ? "bg-emerald-500 text-white"
                                    : "bg-rose-500 text-white"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="text-sm font-medium">{opt.text}</span>
                          </div>

                          {hasAnswered && isCorrect && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Correct Answer
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Immediate Explanation Drawer */}
                  <AnimatePresence>
                    {showExplanation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-border overflow-hidden"
                      >
                        <div className="rounded-xl p-4 sm:p-5 bg-primary/[0.06] border border-primary/20">
                          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-2">
                            <Brain className="w-4 h-4" />
                            <span>OverraPrep AI Step-by-Step Derivation</span>
                          </div>

                          <p className="text-xs font-semibold text-foreground/90 mb-3">
                            Concept: {currentQ.explanation.conceptKey}
                          </p>

                          <div className="space-y-2 text-xs sm:text-sm text-foreground/85 leading-relaxed">
                            {currentQ.explanation.steps.map((step, idx) => (
                              <p key={idx}>{step}</p>
                            ))}
                          </div>

                          <div className="mt-4 pt-3 border-t border-primary/15 flex items-start gap-2 text-xs text-muted-foreground">
                            <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span>
                              <strong className="text-foreground font-semibold">
                                Campus Exam Insight:
                              </strong>{" "}
                              {currentQ.explanation.tutorNote}
                            </span>
                          </div>
                        </div>

                        {/* CTA prompt inside demo */}
                        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Ready to practice 1,000+ questions for {currentQ.code}?</span>
                          <Link
                            to="/onboarding"
                            className="font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            <span>Open full question bank</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!showExplanation && (
                    <p className="mt-5 text-center text-xs text-muted-foreground italic">
                      Tap any answer choice above to test your knowledge and see the AI explanation.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          

          {/* ── Official Mobile App Video Intro Showcase ── */}
          <section id="preview-video" className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-card/30 to-background border-y border-border/60">
            <div className="mx-auto w-full max-w-4xl text-center">
              <span className="text-[11px] font-bold tracking-widest uppercase text-primary">
                Product Experience
              </span>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Rise Beyond Limits
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
                Built from the ground up for Nigerian university students with
                instant load times and zero lag.
              </p>

              {/* Device Frame with Real Video */}
              <div className="mt-8 relative mx-auto w-full max-w-[320px] sm:max-w-[360px] aspect-[9/18] rounded-[2.5rem] p-3 bg-neutral-900 border-4 border-neutral-800 shadow-2xl shadow-primary/15 overflow-hidden">
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src="/assets/aistudio/Mobile_app_intro_animation_1080p_20261027101742_2c100008.mp4"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Video controls overlay */}
                  <div className="absolute bottom-4 inset-x-4 flex items-center justify-between z-20">
                    <button
                      onClick={toggleVideoPlay}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-transform hover:scale-105"
                      title={isPlaying ? "Pause Video" : "Play Video"}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <button
                      onClick={toggleVideoMute}
                      className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white transition-transform hover:scale-105"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Core Innovations Bento Grid ── */}
          <section id="innovations" className="py-16 sm:py-24 px-4 sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="text-center mb-12 sm:mb-16">
                <span className="text-[11px] font-bold tracking-widest uppercase text-primary">
                  Engineered For High Achievers
                </span>
                <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  The OverraPrep Learning Engine
                </h2>
                <p className="mt-3 text-base text-muted-foreground max-w-xl mx-auto">
                  Every tool inside the platform is built to eliminate guesswork and
                  accelerate exam mastery.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Bento Card 1: CBT Simulation */}
                <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                      <Target className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Exact Campus CBT Examination Simulator
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
                      Familiarity is half the battle. OverraPrep mirrors the exact screen
                      layout, keyboard shortcuts (A, B, C, D, Next, Previous), and countdown
                      clocks found in Nigerian university test centers.
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/70 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Timed & Untimed Modes
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Negative Marking Simulation
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <DownloadCloud className="w-3.5 h-3.5 text-primary" /> Offline Exam Runner
                    </span>
                  </div>
                </div>

                {/* Bento Card 2: Weak-Area Diagnostic */}
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Weak-Area Diagnostic
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Stop re-studying what you already know. The system monitors your practice
                      accuracy across every syllabus unit and generates micro-drills to fix
                      vulnerabilities before exam day.
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/70 text-xs font-semibold text-primary">
                    Visual Topic Mastery Graphs →
                  </div>
                </div>

                {/* Bento Card 3: Department In-App Lecture Notes */}
                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      In-App Course Notes
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      Read official lecturer slides, handouts, and curated summaries
                      directly within each course workspace without ever leaving the app.
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/70 text-xs font-semibold text-primary">
                    Zero External PDF Viewers Needed →
                  </div>
                </div>

                {/* Bento Card 4: AI Instant Explanations */}
                <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      Step-by-Step AI Derivations
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-lg">
                      Never wonder why an answer is correct. Get complete proofs, calculation
                      breakdowns, and mnemonic reminders written specifically for Nigerian
                      undergraduate curriculums.
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-border/70 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Award className="w-3.5 h-3.5 text-primary" /> Formula-aware LaTeX rendering
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <Zap className="w-3.5 h-3.5 text-primary" /> Past Exam Frequency Tags
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Institution & Curriculum Isolation with REAL Campus Gate Visuals ── */}
          <section id="universities" className="py-16 sm:py-24 px-4 sm:px-6 bg-muted/30 border-y border-border/70">
            <div className="mx-auto w-full max-w-5xl">
              <div className="text-center mb-12">
                <span className="text-[11px] font-bold tracking-widest uppercase text-primary">
                  Syllabus Specificity
                </span>
                <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                  Customized for Your University
                </h2>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                  OverraPrep isolates course codes, marking schemes, and question archives
                  per institution. You only see what is examined in your faculty.
                </p>
              </div>

              {/* Institution Cards with Real Gate Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                {UNIVERSITIES.filter((u) => u.gateImage).map((uni) => (
                  <div
                    key={uni.acronym}
                    className="group rounded-2xl border border-border/80 bg-card overflow-hidden hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
                  >
                    {/* Real Gate Photograph */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                      <img
                        src={uni.gateImage!}
                        alt={uni.gateDescription}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                        <div>
                          <span className="text-xs font-semibold text-amber-400 block uppercase tracking-wider">
                            {uni.acronym}
                          </span>
                          <h3 className="text-base font-bold text-white leading-tight">
                            {uni.name}
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-sm">
                          {uni.questionCount}
                        </span>
                      </div>
                    </div>

                    {/* Department metadata */}
                    <div className="p-4 sm:p-5 space-y-2 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-muted-foreground font-medium">Covered Faculties:</span>
                        <span className="text-foreground font-semibold text-right">{uni.faculties}</span>
                      </div>
                      <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/60">
                        <span className="text-muted-foreground font-medium">Core Courses:</span>
                        <span className="text-primary font-mono font-semibold text-right">{uni.courses}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Additional Campuses Banner */}
              <div className="mt-8 p-5 rounded-2xl border border-dashed border-border bg-card/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Expanding Across Nigeria</h4>
                    <p className="text-xs text-muted-foreground">
                      UNIBEN, LASU, ABU Zaria, UNILORIN, and State Universities being populated weekly.
                    </p>
                  </div>
                </div>
                <Link
                  to="/onboarding"
                  className="shrink-0 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Select your institution</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* ── Built by Nigerian Scholars & Academic Trust ── */}
          <section id="trust" className="py-16 sm:py-24 px-4 sm:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                {/* Official Founders Photograph */}
                <div className="lg:col-span-5">
                  <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/15 bg-card">
                    <img
                      src="/assets/aistudio/image_6c6bd5ed.png"
                      alt="OverraPrep AI Founders in branded apparel"
                      className="w-full aspect-[4/5] object-cover object-top"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col justify-end p-4">
                      <p className="text-xs font-bold text-white tracking-wide">
                        OverraPrep Leadership & Student Success Team
                      </p>
                      <p className="text-[10px] text-white/85">
                        "Focus. Learn. Grow. Succeed." — Study Smarter. Succeed Faster.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trust story */}
                <div className="lg:col-span-7">
                  <span className="text-[11px] font-bold tracking-widest uppercase text-primary">
                    Authentic Academic Trust
                  </span>
                  <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Built by scholars who understand the Nigerian university system.
                  </h2>
                  <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    We created OverraPrep because we experienced firsthand the struggle of
                    photocopied past questions with incorrect answer keys, crowded lecture
                    theatres, and stressful CBT test environments.
                  </p>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
                    Our platform pairs verified past examination questions with modern
                    cognitive learning science: spaced repetition, immediate feedback loops,
                    and clean AI derivations that actually make sense.
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-6 text-center">
                    <div>
                      <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                        98.4%
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        Exam Pass Rate
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                        14,000+
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        Solved Questions
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                        4.9 / 5.0
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        Student Rating
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student Quotes */}
              <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-4">
                {STUDENT_STORIES.map((story) => (
                  <div
                    key={story.name}
                    className="p-5 rounded-xl border border-border/80 bg-card/60 flex flex-col justify-between shadow-sm"
                  >
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      "{story.quote}"
                    </p>
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <p className="text-xs font-bold text-foreground">{story.name}</p>
                      <p className="text-[10px] text-muted-foreground">{story.school}</p>
                      <p className="text-[10px] font-semibold text-primary mt-0.5">
                        {story.score}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── High-Impact Bottom Call To Action ── */}
          <section className="relative py-16 px-4 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 text-center bg-gradient-to-b from-card to-card/90 border border-primary/25 shadow-2xl shadow-primary/10">
                {/* Decorative gold ambient circle */}
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />

                <div className="relative z-10">
                  <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
                    Your First-Class Journey Starts Today
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
                    Join thousands of university students studying smarter with
                    syllabus-aligned past questions and instant AI explanations.
                  </p>

                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <Link
                      to="/onboarding"
                      className="w-full sm:w-auto h-12 px-8 rounded-xl inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
                    >
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/auth"
                      className="w-full sm:w-auto h-12 px-8 rounded-xl inline-flex items-center justify-center gap-2 bg-muted/60 hover:bg-muted text-foreground font-semibold border border-border transition-colors"
                    >
                      <span>Sign In</span>
                    </Link>
                  </div>

                  <p className="mt-4 text-[11px] text-muted-foreground">
                    No credit card required · Free past questions available immediately
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* ── Strict, Clean Footer ── */}
        <footer className="relative z-10 border-t border-border/80 bg-background/80 py-8 px-4 sm:px-6 text-center text-xs text-muted-foreground">
          <div className="mx-auto w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src={logo}
                alt="OverraPrep"
                className="h-7 w-auto object-contain opacity-95 shrink-0"
                width={28}
                height={28}
              />
              <span className="text-[12px] font-bold text-foreground">
                OverraPrep <span className="text-primary text-[10px]">AI</span>
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-[11px]">
                © {new Date().getFullYear()} OverraPrep AI. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-6 text-[11px]">
              <Link to="/auth" className="hover:text-foreground transition-colors">
                Student Sign In
              </Link>
              <Link to="/onboarding" className="hover:text-foreground transition-colors">
                Choose University
              </Link>
              <a href="#demo" className="hover:text-foreground transition-colors">
                CBT Preview
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Welcome;
