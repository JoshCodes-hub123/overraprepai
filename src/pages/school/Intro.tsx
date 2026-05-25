import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ClipboardCheck, Wallet, Megaphone, Users, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";

const FEATURES = [
  { icon: Users, label: "Students & Classes" },
  { icon: ClipboardCheck, label: "Attendance & Results" },
  { icon: Wallet, label: "Fees & Payments" },
  { icon: Megaphone, label: "Announcements" },
];

const SchoolIntro = () => {
  const navigate = useNavigate();

  const start = () => {
    navigate(`/auth?mode=signup&intent=school_owner&redirect=${encodeURIComponent("/school/register")}`);
  };

  return (
    <>
      <SEO title="School Management" description="Run your school end-to-end with OverraPrep." noindex url="/school/intro" />
      <div
        className="relative min-h-screen flex flex-col bg-background overflow-hidden"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-accent/25 blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-40 -left-32 w-[32rem] h-[32rem] rounded-full bg-primary/20 blur-3xl"
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.45, 0.65, 0.45] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,hsl(var(--primary)/0.1),transparent_70%)]" />
        </div>

        <header className="relative z-10 flex items-center px-6 pt-5">
          <button onClick={() => navigate("/")} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative mb-7"
          >
            <motion.div
              className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/40 to-accent/40 blur-2xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20 p-[1.5px] shadow-2xl">
              <div className="w-full h-full rounded-[1.95rem] bg-card/90 backdrop-blur-xl flex items-center justify-center border border-primary/20">
                <Building2 className="w-11 h-11 text-primary" strokeWidth={1.4} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-foreground" />
            <span className="text-[11px] font-semibold tracking-wider uppercase">For School Owners</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="font-display text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-4 max-w-md"
          >
            Your entire school,
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              in one app.
            </span>
          </motion.h1>
          <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed text-[15px]">
            Register your school and unlock attendance, results, fees and announcements — built for Nigerian schools.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.07, duration: 0.35 }}
                className="p-3.5 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl flex items-center gap-2.5 hover:border-primary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                </div>
                <span className="text-[13px] font-semibold text-left">{f.label}</span>
              </motion.div>
            ))}
          </div>

          <div className="w-full max-w-md space-y-3">
            <Button
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-semibold shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-accent hover:opacity-95"
              onClick={start}
            >
              Register my school <ArrowRight className="w-5 h-5 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-medium border-border/60 bg-card/50 backdrop-blur-xl hover:bg-card"
              onClick={() => navigate("/auth?mode=signin")}
            >
              I already have an account
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};

export default SchoolIntro;
