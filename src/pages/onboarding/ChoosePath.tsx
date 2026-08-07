import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, Flame, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EnvironmentType } from "@/config/environments";

const TRACKS: {
  id: EnvironmentType;
  title: string;
  tagline: string;
  description: string;
  icon: typeof Flame;
  accent: string;
}[] = [
  {
    id: "jamb",
    title: "JAMB / UTME",
    tagline: "Prepare for your UTME journey.",
    description:
      "Four subjects, past-question intelligence, timed CBT simulation and mock exams — built only for UTME.",
    icon: Flame,
    accent: "from-emerald-500/15 to-emerald-700/5 border-emerald-500/30",
  },
  {
    id: "university",
    title: "University",
    tagline: "Master your university courses.",
    description:
      "Your campus, your courses. CBT practice, theory grading, survival kits and AI notes scoped to your department and level.",
    icon: GraduationCap,
    accent: "from-amber-500/15 to-amber-700/5 border-amber-500/30",
  },
];

/**
 * Step 1 of onboarding: pick the academic environment.
 * University and JAMB are fully isolated systems — this choice decides
 * every screen, feed and piece of content the student ever sees.
 */
export default function ChoosePath() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<EnvironmentType | null>(null);

  const handleChoose = async (env: EnvironmentType) => {
    // Remember the choice either way — signup finishes the right onboarding.
    try { sessionStorage.setItem("pending_environment", env); } catch { /* noop */ }
    if (!user) {
      navigate("/auth?mode=signup");
      return;
    }
    setSaving(env);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        environment_type: env,
        academic_path: env,
        ...(env === "jamb" ? { university: null, faculty: null } : {}),
      })
      .eq("id", user.id);
    setSaving(null);
    if (error) {
      toast.error("Couldn't save your choice", { description: error.message });
      return;
    }
    await refreshProfile();
    navigate(env === "jamb" ? "/onboarding/jamb" : "/onboarding/university");
  };

  return (
    <>
      <SEO
        title="Choose Your Path | OverraPrep AI"
        description="Pick your academic environment — University or JAMB / UTME — to unlock a fully tailored learning experience."
      />
      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-700 mb-3 font-semibold">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              What are you preparing for?
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              These are two separate learning environments. Pick the one you belong to —
              you can change it later in your profile.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-5">
            {TRACKS.map((t, i) => {
              const Icon = t.icon;
              const busy = saving === t.id;
              return (
                <motion.button
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.08 }}
                  whileHover={{ y: -4 }}
                  onClick={() => handleChoose(t.id)}
                  disabled={!!saving}
                  className={cn(
                    "group relative text-left rounded-2xl border bg-gradient-to-br p-6 transition-all",
                    "hover:shadow-2xl hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                    t.accent,
                    saving && !busy && "opacity-50"
                  )}
                >
                  <div className="w-14 h-14 rounded-xl bg-card/80 backdrop-blur flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {busy ? (
                      <Loader2 className="w-6 h-6 animate-spin text-foreground" />
                    ) : (
                      <Icon className="w-7 h-7 text-foreground" />
                    )}
                  </div>
                  <h2 className="font-display text-xl font-bold mb-1">{t.title}</h2>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    {t.tagline}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                    Continue <ArrowRight className="w-4 h-4" />
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}
