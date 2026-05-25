import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, BookOpen, Flame, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Path = "secondary" | "jamb" | "university";

const TRACKS: { id: Path; title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "secondary",  title: "Secondary School", subtitle: "JSS1 – SS3 · WAEC / NECO",         icon: BookOpen },
  { id: "jamb",       title: "JAMB / UTME",       subtitle: "Score the cut-off · Get admission", icon: Flame },
  { id: "university", title: "University Student",subtitle: "100 – 500 Level",                   icon: GraduationCap },
];

const PreparationSettings = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth() as any;
  const current = (profile?.academic_path as Path | null) ?? null;
  const [selected, setSelected] = useState<Path | null>(current);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user?.id || !selected) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ academic_path: selected })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save", { description: error.message });
      return;
    }
    toast.success("Preparation track updated");
    if (refreshProfile) await refreshProfile();
    navigate("/student/dashboard");
  };

  return (
    <>
      <SEO title="Preparation Settings" description="Change your study track anytime." noindex url="https://overraprep.com/profile/preparation" />
      <div className="min-h-screen bg-background pb-24">
        <DashboardNav role="student" />
        <main className="container mx-auto px-4 py-6 max-w-2xl">
          <Link to="/profile/edit" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to profile
          </Link>
          <header className="mb-5">
            <h1 className="font-display text-2xl font-bold">Preparation Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This shapes your dashboard content, AI tone, and recommendations. Change it anytime.
            </p>
          </header>

          <div className="grid gap-3">
            {TRACKS.map((t) => {
              const Icon = t.icon;
              const isSelected = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className={cn(
                    "text-left rounded-2xl border p-4 transition-all flex items-center gap-3",
                    isSelected
                      ? "border-amber-500 bg-amber-50/60 shadow-[0_8px_24px_-12px_rgba(180,140,40,0.45)]"
                      : "border-border bg-card hover:border-amber-200"
                  )}
                >
                  <span className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-100 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-amber-700" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-display font-bold text-foreground">{t.title}</span>
                    <span className="block text-xs text-muted-foreground">{t.subtitle}</span>
                  </span>
                  {isSelected && <Check className="w-5 h-5 text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          <Card className="mt-5 p-4 bg-muted/40 border-dashed">
            <p className="text-xs text-muted-foreground">
              Current track: <span className="font-semibold text-foreground">{current ? TRACKS.find(t => t.id === current)?.title : "Not set"}</span>
            </p>
          </Card>

          <div className="mt-6 flex items-center gap-3">
            <Button onClick={save} disabled={!selected || selected === current || saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </main>
      </div>
    </>
  );
};

export default PreparationSettings;