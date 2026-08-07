import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Screen, ScreenHeader, Section, BrandButton, EnvChip } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Use of English is compulsory in UTME — it is always pre-selected and locked. */
const COMPULSORY = "Use of English";

const UTME_SUBJECTS = [
  COMPULSORY,
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Agricultural Science",
  "Geography",
  "Economics",
  "Government",
  "Commerce",
  "Accounting",
  "Literature in English",
  "Christian Religious Studies",
  "Islamic Studies",
  "History",
  "Civic Education",
];

/**
 * JAMB onboarding — the UTME equivalent of the university stepper.
 *
 * Four subjects, a target course and (optionally) a target university. This is
 * everything the JAMB dashboard needs; no faculty, level or campus course
 * concepts ever appear in this environment.
 */
export default function JambSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [subjects, setSubjects] = useState<string[]>([COMPULSORY]);
  const [course, setCourse] = useState("");
  const [university, setUniversity] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill if the student is editing an existing setup.
  useEffect(() => {
    const p = profile as any;
    if (!p) return;
    if (Array.isArray(p.jamb_subjects) && p.jamb_subjects.length) setSubjects(p.jamb_subjects);
    if (p.target_course) setCourse(p.target_course);
    if (p.target_university) setUniversity(p.target_university);
  }, [profile]);

  const toggle = (s: string) => {
    if (s === COMPULSORY) return;
    setSubjects((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s);
      if (prev.length >= 4) {
        toast.info("UTME allows 4 subjects", {
          description: "Remove one before adding another.",
        });
        return prev;
      }
      return [...prev, s];
    });
  };

  const ready = useMemo(() => subjects.length === 4 && course.trim().length > 1, [subjects, course]);

  const handleSave = async () => {
    if (!user) {
      sessionStorage.setItem("pending_environment", "jamb");
      navigate("/auth");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        environment_type: "jamb",
        academic_path: "jamb",
        jamb_subjects: subjects,
        target_course: course.trim(),
        target_university: university.trim() || null,
        // JAMB students never carry campus fields.
        university: null,
        faculty: null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your setup", { description: error.message });
      return;
    }
    try { sessionStorage.removeItem("pending_environment"); } catch { /* noop */ }
    await refreshProfile();
    navigate("/jamb/dashboard", { replace: true });
  };

  return (
    <>
      <SEO
        title="Set Up Your JAMB Prep | OverraPrep AI"
        description="Pick your four UTME subjects and your target course to unlock a JAMB preparation dashboard built around you."
        url="/onboarding/jamb"
        noindex
      />
      <Screen>
        <ScreenHeader
          back
          chip={<EnvChip label="JAMB · UTME" />}
          title="Set up your UTME prep"
          subtitle="Pick your four subjects and the course you're aiming for. Everything you see next is built around this."
        />

        <Section title={`Subjects · ${subjects.length} of 4`}>
          <div className="grid grid-cols-2 gap-2.5">
            {UTME_SUBJECTS.map((s) => {
              const active = subjects.includes(s);
              const locked = s === COMPULSORY;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggle(s)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-brand border px-3.5 py-3 text-left text-[14px] font-medium transition-colors",
                    active
                      ? "border-env-line bg-env-soft text-brand-ink"
                      : "border-brand-line bg-brand-surface text-brand-ink-soft hover:bg-brand-soft",
                    locked && "opacity-90",
                  )}
                >
                  <span className="truncate">{s}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-env" />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[12.5px] text-brand-ink-soft">
            Use of English is compulsory for every UTME candidate.
          </p>
        </Section>

        <Section title="Your goal">
          <div className="space-y-3">
            <div>
              <label htmlFor="jamb-course" className="mb-1.5 block text-[13.5px] font-medium">
                Course you want to study
              </label>
              <Input
                id="jamb-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. Medicine and Surgery"
                className="h-12 rounded-brand-sm"
              />
            </div>
            <div>
              <label htmlFor="jamb-uni" className="mb-1.5 block text-[13.5px] font-medium">
                Target university <span className="text-brand-ink-soft">(optional)</span>
              </label>
              <Input
                id="jamb-uni"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="e.g. University of Ibadan"
                className="h-12 rounded-brand-sm"
              />
            </div>
          </div>
        </Section>

        <BrandButton size="lg" block loading={saving} disabled={!ready} onClick={handleSave}>
          {saving ? "Saving…" : "Start preparing"}
          {!saving && <Loader2 className="hidden" />}
        </BrandButton>
        {!ready && (
          <p className="mt-3 text-center text-[13px] text-brand-ink-soft">
            Choose 4 subjects and a target course to continue.
          </p>
        )}
      </Screen>
    </>
  );
}
