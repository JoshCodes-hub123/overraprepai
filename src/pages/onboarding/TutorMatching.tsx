import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Check, GraduationCap, BookOpen, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LEARNING_STYLES = [
  { id: "visual", label: "Visual", icon: "🎨", desc: "Diagrams & videos" },
  { id: "reading", label: "Reading", icon: "📖", desc: "Notes & text" },
  { id: "practice", label: "Practice", icon: "✍️", desc: "Lots of quizzes" },
  { id: "discussion", label: "Discussion", icon: "💬", desc: "Q&A with tutors" },
];

const TUTOR_PERSONALITIES = [
  { id: "patient", label: "Patient & gentle", icon: "🌿" },
  { id: "strict", label: "Strict & focused", icon: "🎯" },
  { id: "friendly", label: "Friendly & casual", icon: "🤝" },
  { id: "rigorous", label: "Rigorous & deep", icon: "🧠" },
];

const SESSION_LENGTHS = [
  { id: "short", label: "15 min sprints", desc: "Quick daily wins" },
  { id: "medium", label: "30–45 min", desc: "Focused sessions" },
  { id: "long", label: "1+ hour", desc: "Deep study blocks" },
];

interface TutorMatchPrefs {
  learning_style: string[];
  tutor_personality: string;
  session_length: string;
  notifications_enabled: boolean;
}

export default function TutorMatchingOnboarding() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [prefs, setPrefs] = useState<TutorMatchPrefs>({
    learning_style: [],
    tutor_personality: "",
    session_length: "",
    notifications_enabled: true,
  });

  const totalSteps = 4;

  const toggleStyle = (id: string) => {
    setPrefs((p) => ({
      ...p,
      learning_style: p.learning_style.includes(id)
        ? p.learning_style.filter((s) => s !== id)
        : [...p.learning_style, id],
    }));
  };

  const canContinue = () => {
    if (step === 0) return true;
    if (step === 1) return prefs.learning_style.length > 0;
    if (step === 2) return !!prefs.tutor_personality;
    if (step === 3) return !!prefs.session_length;
    return false;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        tutor_match_prefs: prefs as any,
        onboarding_completed: true,
      } as any)
      .eq("id", user.id);

    if (error) {
      toast.error("Couldn't save preferences. Try again.");
      setSubmitting(false);
      return;
    }

    await refreshProfile();
    toast.success("You're all set! Welcome aboard. ✨");
    const role = profile?.academic_path;
    navigate(role === "secondary" ? "/student/dashboard" : "/student/dashboard", { replace: true });
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else handleFinish();
  };
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Status bar safe area */}
      <div className="h-[env(safe-area-inset-top)] bg-background" />

      {/* Progress dots */}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={back}
          className={cn(
            "p-2 rounded-full transition-opacity",
            step === 0 ? "opacity-0 pointer-events-none" : "opacity-100 hover:bg-muted"
          )}
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>
        <button
          onClick={handleFinish}
          className="text-xs text-muted-foreground hover:text-foreground px-2"
        >
          Skip
        </button>
      </div>

      {/* Swipeable content */}
      <div className="flex-1 flex flex-col px-6 pt-6 pb-32 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col"
          >
            {step === 0 && <WelcomeStep name={profile?.full_name?.split(" ")[0]} />}
            {step === 1 && (
              <StyleStep selected={prefs.learning_style} onToggle={toggleStyle} />
            )}
            {step === 2 && (
              <PersonalityStep
                value={prefs.tutor_personality}
                onSelect={(id) => setPrefs((p) => ({ ...p, tutor_personality: id }))}
              />
            )}
            {step === 3 && (
              <SessionStep
                value={prefs.session_length}
                onSelect={(id) => setPrefs((p) => ({ ...p, session_length: id }))}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 px-6 pb-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20"
          onClick={next}
          disabled={!canContinue() || submitting}
        >
          {step === totalSteps - 1 ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              {submitting ? "Saving..." : "Finish setup"}
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </>
          )}
        </Button>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}

function WelcomeStep({ name }: { name?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-8 shadow-2xl shadow-primary/30"
      >
        <Sparkles className="w-12 h-12 text-primary-foreground" />
      </motion.div>
      <h1 className="font-display text-3xl font-bold mb-3">
        Welcome{name ? `, ${name}` : ""} 👋
      </h1>
      <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
        Let's personalize your experience. We'll match you with the right tutors and study style in just 3 quick taps.
      </p>
    </div>
  );
}

function StyleStep({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="w-5 h-5 text-primary" />
        <Badge variant="outline" className="text-xs">Step 1</Badge>
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">How do you learn best?</h2>
      <p className="text-sm text-muted-foreground mb-8">Pick one or more. We'll prioritize matching content.</p>
      <div className="grid grid-cols-2 gap-3">
        {LEARNING_STYLES.map((s) => {
          const active = selected.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.id)}
              className={cn(
                "p-4 rounded-2xl border-2 text-left transition-all active:scale-95",
                active
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-semibold text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
              {active && (
                <div className="mt-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PersonalityStep({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-primary" />
        <Badge variant="outline" className="text-xs">Step 2</Badge>
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Your ideal tutor vibe?</h2>
      <p className="text-sm text-muted-foreground mb-8">We'll surface tutors who teach in this style.</p>
      <div className="space-y-3">
        {TUTOR_PERSONALITIES.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={cn(
                "w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all active:scale-[0.98]",
                active
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="text-3xl">{p.icon}</div>
              <div className="flex-1 text-left font-semibold">{p.label}</div>
              {active && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SessionStep({ value, onSelect }: { value: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <GraduationCap className="w-5 h-5 text-primary" />
        <Badge variant="outline" className="text-xs">Step 3</Badge>
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Preferred session length?</h2>
      <p className="text-sm text-muted-foreground mb-8">We'll size quizzes and study plans to match.</p>
      <div className="space-y-3">
        {SESSION_LENGTHS.map((s) => {
          const active = value === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all active:scale-[0.98]",
                active
                  ? "border-primary bg-primary/10 shadow-md shadow-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <div className="font-semibold text-base mb-1">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
