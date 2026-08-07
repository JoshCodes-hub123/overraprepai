import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flame,
  Target,
  Timer,
  BookOpenCheck,
  Brain,
  Trophy,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const SUBJECTS = [
  "Use of English",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Government",
  "Economics",
  "Literature",
];

const TILES = [
  { to: "/practice", label: "CBT Practice", desc: "Real UTME timing & interface", icon: Timer },
  { to: "/exams", label: "Mock Exams", desc: "Full 4-subject mock papers", icon: BookOpenCheck },
  { to: "/jamb-intelligence", label: "Past Question Intelligence", desc: "What JAMB repeats most", icon: Brain },
  { to: "/arena", label: "Arena", desc: "Compete daily with other candidates", icon: Trophy },
  { to: "/intelligence", label: "My Readiness", desc: "Score prediction & weak topics", icon: BarChart3 },
  { to: "/flashcards", label: "Flashcards", desc: "Fast recall before the exam", icon: Target },
];

/**
 * JAMB / UTME dashboard — a fully separate environment from the
 * university tracks. No campus courses, faculties or levels here.
 */
const JambDashboard = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <SEO
        title="JAMB / UTME Dashboard"
        description="Your JAMB preparation hub: CBT simulation, mock exams, past-question intelligence and readiness scoring."
        url="/jamb/dashboard"
        noindex
      />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 mb-6"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
              <Flame className="w-3.5 h-3.5" /> JAMB / UTME Environment
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-bold mt-3">
              {firstName ? `${firstName}, let's beat the cut-off.` : "Let's beat the cut-off."}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-lg">
              Everything here is built only for UTME candidates — four subjects, real CBT
              timing, and AI that knows what JAMB actually asks.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button onClick={() => navigate("/practice")} className="gap-2">
                Start CBT practice <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/exams")}>
                Take a mock exam
              </Button>
            </div>
          </motion.section>

          <section className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Your subjects
            </h2>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <Link
                  key={s}
                  to={`/subjects?q=${encodeURIComponent(s)}`}
                  className="text-xs font-medium rounded-full border border-border bg-card px-3 py-1.5 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                >
                  {s}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid sm:grid-cols-2 gap-3">
            {TILES.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.3) }}
                >
                  <Link to={t.to}>
                    <Card
                      className={cn(
                        "p-4 h-full flex items-start gap-3 transition-all",
                        "hover:border-emerald-300 hover:shadow-md"
                      )}
                    >
                      <span className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-emerald-700" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.desc}</span>
                      </span>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </section>
        </main>
      </div>
    </>
  );
};

export default JambDashboard;
