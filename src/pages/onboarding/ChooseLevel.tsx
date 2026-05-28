import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LEVELS } from "@/config/universities";
import { toast } from "sonner";

export default function ChooseLevel() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  if (!(profile as any)?.department) { navigate("/onboarding/department", { replace: true }); return null; }

  const choose = async (l: string) => {
    if (!user) return;
    setSaving(l);
    // Do NOT mark onboarding_completed here — course selection is the final gate.
    const { error } = await supabase
      .from("profiles")
      .update({ level: l, academic_path: "university" as any })
      .eq("id", user.id);
    setSaving(null);
    if (error) { toast.error("Couldn't save your level", { description: error.message }); return; }
    await refreshProfile();
    navigate("/onboarding/courses");
  };

  return (
    <>
      <SEO title="Choose your level" noindex />
      <main className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Step 4 of 4</p>
            <h1 className="font-display text-3xl font-bold">What level are you in?</h1>
            <p className="text-sm text-muted-foreground mt-2">Used to recommend courses for your current semester.</p>
          </motion.div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {LEVELS.map((l, i) => (
              <motion.button
                key={l}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.04 * i }}
                onClick={() => choose(l)}
                disabled={!!saving}
                className="aspect-square rounded-2xl border bg-white text-2xl font-bold hover:border-amber-400 hover:bg-amber-50 transition-all flex items-center justify-center"
              >
                {saving === l ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : l}
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}