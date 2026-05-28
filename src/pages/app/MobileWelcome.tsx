import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  GraduationCap,
  PencilLine,
  Bot,
  FileText,
  Star,
  Sparkles,
  Globe,
  ChevronRight,
  Headphones,
} from "lucide-react";
import logo from "@/assets/logo.png";
import appIcon from "@/assets/app-icon.png";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";

/**
 * Premium mobile-first welcome screen.
 * Inspired by the OverraPrep AI mobile concept: gold/white aesthetic,
 * hero copy, "What You Get", "How It Works", "Top Tutors" preview, then
 * a clear CTA at the very bottom to optionally view the full website.
 *
 * The full marketing /website is intentionally NOT auto-loaded — first
 * impression should be this app-like experience.
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
          <header className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <img
                src={appIcon}
                alt="OverraPrep AI"
                width={36}
                height={36}
                className="w-9 h-9 object-contain drop-shadow-sm"
              />
              <div className="leading-tight">
                <p className="font-bold text-[15px] tracking-tight text-foreground">
                  OverraPrep
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-md border border-primary/40 text-[10px] font-bold text-primary">
                    AI
                  </span>
                </p>
              </div>
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
            className="mb-7"
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
              The all-in-one platform for CBT practice, theory preparation,
              and smarter learning.
            </p>

            <div className="mt-5 flex gap-2.5">
              <Button
                onClick={() => navigate("/start")}
                className="h-11 px-5 rounded-full font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30"
              >
                I'm New — Get Started
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                onClick={() => navigate("/apply-tutor")}
                variant="outline"
                className="h-11 px-5 rounded-full font-semibold border-2 border-primary/40 hover:bg-primary/5"
              >
                Apply as Tutor
              </Button>
            </div>
          </motion.section>

          {/* What You Get */}
          <SectionCard title="What You Get" delay={0.1}>
            <div className="grid grid-cols-2 gap-3">
              <FeatureTile
                icon={FileText}
                title="CBT Practice"
                desc="Practice unlimited questions with instant feedback."
              />
              <FeatureTile
                icon={Headphones}
                title="Audio Learning"
                desc="Upload notes, listen anywhere in clear English."
                accent
              />
              <FeatureTile
                icon={PencilLine}
                title="Theory Writing"
                desc="Write, get AI feedback and improve faster."
              />
              <FeatureTile
                icon={Bot}
                title="AI Tutor"
                desc="Get explanations, answers and study support."
              />
              <FeatureTile
                icon={GraduationCap}
                title="Smart Notes"
                desc="Access, upload and organize study materials."
              />
              <FeatureTile
                icon={Sparkles}
                title="Question Cards"
                desc="Tutors craft branded card sets, students study them."
              />
            </div>
          </SectionCard>

          {/* Ambassadors */}
          <SectionCard title="Our Ambassadors" delay={0.15}>
            <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 snap-x">
              {[
                { name: "Adaeze O.", role: "Computer Science · 400L", initials: "AO", grad: "from-amber-400 to-amber-600" },
                { name: "Tunde A.", role: "Mech. Eng. · 500L", initials: "TA", grad: "from-rose-400 to-amber-500" },
                { name: "Chiamaka E.", role: "Biochemistry · 300L", initials: "CE", grad: "from-emerald-400 to-amber-500" },
                { name: "Ibrahim Y.", role: "Civil Eng. · 400L", initials: "IY", grad: "from-violet-400 to-amber-500" },
              ].map((a) => (
                <div
                  key={a.name}
                  className="snap-start shrink-0 w-32 rounded-2xl border border-border/60 bg-background/40 p-2.5 text-center"
                >
                  <div
                    className={`w-14 h-14 mx-auto rounded-full bg-gradient-to-br ${a.grad} text-white font-bold text-sm flex items-center justify-center mb-1.5 shadow-md`}
                  >
                    {a.initials}
                  </div>
                  <p className="font-semibold text-[11px] text-foreground truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.role}</p>
                  <p className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold text-primary">
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                    Ambassador
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* How It Works */}
          <SectionCard
            title="How It Works"
            action={
              <button
                onClick={() => navigate("/website")}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
              >
                View all
              </button>
            }
            delay={0.2}
          >
            <div className="flex items-start gap-3">
              <Step n={1} title="Choose School & Level" desc="Select your school, level and courses." />
              <Connector />
              <Step n={2} title="Practice & Learn" desc="CBT, AI study & smart notes." />
              <Connector />
              <Step n={3} title="Improve" desc="Track progress & ace exams." />
            </div>
          </SectionCard>

          {/* Top Tutors preview */}
          <SectionCard
            title="Top Tutors"
            action={
              <button
                onClick={() => navigate("/tutors")}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary"
              >
                View all
              </button>
            }
            delay={0.3}
          >
            <div className="grid grid-cols-3 gap-2.5">
              <TutorTile name="David J." subject="Mathematics" rating={4.9} />
              <TutorTile name="Esther U." subject="Physics" rating={4.8} />
              <TutorTile name="Michael O." subject="Chemistry" rating={4.9} />
            </div>
          </SectionCard>

          {/* Footer CTA — visit full website */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 mb-2"
          >
            <button
              onClick={() => navigate("/website")}
              className="group w-full flex items-center justify-between p-4 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all"
            >
              <span className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5 text-primary" />
                </span>
                <span className="text-left">
                  <span className="block font-semibold text-sm text-foreground">
                    Visit the full website
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    Explore everything OverraPrep AI offers
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

/* ---------- helpers ---------- */

const SectionCard = ({
  title,
  action,
  children,
  delay = 0,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="mb-5 rounded-2xl bg-card/80 backdrop-blur-md border border-border/70 p-4 shadow-sm"
  >
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-[15px] tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
    {children}
  </motion.section>
);

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
      "rounded-xl border p-3 hover:shadow-md transition-all " +
      (accent
        ? "border-primary/50 bg-primary/5 hover:border-primary"
        : "border-border/60 bg-background/40 hover:border-primary/40")
    }
  >
    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
      <Icon className="w-4.5 h-4.5 text-primary" />
    </div>
    <p className="font-semibold text-[13px] leading-tight text-foreground">{title}</p>
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{desc}</p>
  </div>
);

const Step = ({ n, title, desc }: { n: number; title: string; desc: string }) => (
  <div className="flex-1 min-w-0">
    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shadow-md shadow-primary/30 mb-2">
      {n}
    </div>
    <p className="font-semibold text-[12px] leading-tight text-foreground">{title}</p>
    <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">{desc}</p>
  </div>
);

const Connector = () => (
  <div className="hidden xs:block w-4 h-px mt-3.5 bg-border" aria-hidden />
);

const TutorTile = ({
  name,
  subject,
  rating,
}: {
  name: string;
  subject: string;
  rating: number;
}) => (
  <div className="rounded-xl border border-border/60 p-2.5 text-center bg-background/40">
    <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center mb-1.5">
      <GraduationCap className="w-5 h-5 text-primary" />
    </div>
    <p className="font-semibold text-[11px] leading-tight text-foreground truncate">
      {name}
    </p>
    <p className="text-[10px] text-muted-foreground truncate">{subject}</p>
    <p className="mt-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-foreground">
      <Star className="w-2.5 h-2.5 fill-primary text-primary" />
      {rating}
    </p>
  </div>
);

export default MobileWelcome;
