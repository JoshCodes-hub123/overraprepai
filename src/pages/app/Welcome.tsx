import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ArrowRight, BookOpen, Target, CheckCircle2, ShieldCheck, Sparkles, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getValidResumeRoute } from "@/lib/environmentScope";
import { SEO } from "@/components/seo/SEO";
import { UNIVERSITIES } from "@/config/universities";

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

      <div className="min-h-screen bg-neutral-50/60 text-neutral-900 flex flex-col selection:bg-amber-500 selection:text-neutral-950">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-display font-bold text-neutral-950 text-lg shadow-sm">
              O
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight text-neutral-950">OverraPrep</span>
              <span className="ml-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/auth"
              className="text-xs sm:text-sm font-semibold text-neutral-700 hover:text-neutral-950 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
            <Link
              to="/onboarding"
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs sm:text-sm font-bold px-4 py-2 rounded-xl transition shadow-sm inline-flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-900 mx-auto mb-6">
            <GraduationCap className="w-4 h-4 text-amber-700" />
            <span>Built Exclusively for Nigerian University Students</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-950 leading-[1.15] max-w-3xl mx-auto">
            Know what to study. <br className="hidden sm:inline" />
            Understand what you read. <br className="hidden sm:inline" />
            <span className="text-amber-800 underline decoration-amber-500/40 underline-offset-4">Ace your CBT exams.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            Turn your examination anxiety into confidence. Practice verified past questions, understand difficult concepts with instant AI explanations, and eliminate your weak topics before test day.
          </p>

          {/* Primary 2 CTAs */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto w-full">
            <Link
              to="/onboarding"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-base px-8 py-3.5 rounded-xl shadow-sm hover:shadow transition flex items-center justify-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/auth"
              className="w-full sm:w-auto bg-white hover:bg-neutral-50 text-neutral-800 font-semibold text-base px-8 py-3.5 rounded-xl border border-neutral-300 transition flex items-center justify-center gap-2"
            >
              <span>Sign In</span>
            </Link>
          </div>

          {/* Supported Universities Strip */}
          <div className="mt-12 pt-8 border-t border-neutral-200/80">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-600 mb-3">
              Curriculum isolated by institution
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {Object.values(UNIVERSITIES).map((u) => (
                <span
                  key={u.code}
                  className="bg-white border border-neutral-200 px-3 py-1 rounded-lg text-xs font-semibold text-neutral-700 shadow-2xs"
                >
                  {u.code} · {u.name}
                </span>
              ))}
            </div>
          </div>

          {/* 3 Value Pillars */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-sm hover:border-amber-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-800 mb-4">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1.5">
                Departmental Outlines
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Study directly from lecture materials, past outlines, and summaries mapped to your university, faculty, and academic level.
              </p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-sm hover:border-amber-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-800 mb-4">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1.5">
                Realistic CBT Simulation
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Practise timed past questions with the exact feel of your university CBT centre, with step-by-step solutions for every question.
              </p>
            </div>

            <div className="bg-white border border-neutral-200/90 rounded-2xl p-6 shadow-sm hover:border-amber-500/50 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-800 mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-neutral-900 mb-1.5">
                Targeted Weak-Area AI
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                OverraPrep AI pinpoints exactly where you lose marks and recommends high-yield 5-minute revision drills before your test.
              </p>
            </div>
          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-neutral-200 bg-white py-6 px-4 text-center text-xs text-neutral-600">
          <p>© {new Date().getFullYear()} OverraPrep AI. University CBT & Exam Preparation.</p>
        </footer>
      </div>
    </>
  );
};

export default Welcome;
