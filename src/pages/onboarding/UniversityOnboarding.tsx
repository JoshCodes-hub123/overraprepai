import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  School,
  BookOpen,
  Coins,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  UNIVERSITIES,
  facultiesOf,
  departmentsOf,
  LEVELS,
  type UniversityCode,
} from "@/config/universities";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

interface PreviewCourse {
  id: string;
  code: string;
  name: string;
  level: string | null;
}

const UNIVERSITY_GATE_IMAGES: Partial<Record<UniversityCode, string>> = {
  FUTA: "/assets/aistudio/image_1cdb46ce.png",
  OAU: "/assets/aistudio/image_7a396a45.png",
  UI: "/assets/aistudio/image_34f037cc.png",
};

export const UniversityOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [selectedUni, setSelectedUni] = useState<UniversityCode>(() => {
    const fromProfile = (profile as any)?.university as UniversityCode | undefined;
    if (fromProfile && UNIVERSITIES[fromProfile]) return fromProfile;
    try {
      const saved = localStorage.getItem("overra_express_uni") as UniversityCode | null;
      if (saved && UNIVERSITIES[saved]) return saved;
    } catch {
      /* ignore */
    }
    return "FUTA";
  });

  const [selectedLevel, setSelectedLevel] = useState<string>(() => {
    const raw = String((profile as any)?.level || "").replace(/\D/g, "");
    if (raw && ["100", "200", "300", "400", "500"].includes(raw)) return raw;
    try {
      const saved = localStorage.getItem("overra_express_level");
      if (saved && ["100", "200", "300", "400", "500"].includes(saved)) return saved;
    } catch {
      /* ignore */
    }
    return "100";
  });

  const [availableCourses, setAvailableCourses] = useState<PreviewCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync with profile if it loads after initial mount
  useEffect(() => {
    const profUni = (profile as any)?.university as UniversityCode | undefined;
    if (profUni && UNIVERSITIES[profUni]) {
      setSelectedUni(profUni);
    }
    const profLvl = String((profile as any)?.level || "").replace(/\D/g, "");
    if (profLvl && ["100", "200", "300", "400", "500"].includes(profLvl)) {
      setSelectedLevel(profLvl);
    }
  }, [profile]);

  // Pre-fetch active courses for the selected university in the background
  useEffect(() => {
    let active = true;
    async function fetchUniversityCourses() {
      setLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, code, name, level")
          .eq("is_active", true)
          .eq("university", selectedUni)
          .limit(40);

        if (error) throw error;
        if (active) {
          setAvailableCourses(((data as any) || []) as PreviewCourse[]);
        }
      } catch (err) {
        console.warn("Could not pre-fetch university courses:", err);
      } finally {
        if (active) setLoadingCourses(false);
      }
    }

    void fetchUniversityCourses();
    return () => {
      active = false;
    };
  }, [selectedUni]);

  // Filter courses matching the chosen level (or fallback to all university courses if none match)
  const matchedCourseIds = useMemo(() => {
    if (availableCourses.length === 0) return [];
    const levelPrefix = selectedLevel.charAt(0); // e.g. '1' for 100L
    const levelFiltered = availableCourses.filter((c) => {
      const lvlStr = String(c.level || "").replace(/\D/g, "");
      if (lvlStr === selectedLevel) return true;
      // Match course code digit (e.g. MTH 101 -> '1' for 100L)
      const codeMatch = c.code?.match(/\b(\d)\d{2}\b/);
      return codeMatch ? codeMatch[1] === levelPrefix : false;
    });

    const finalCourses = levelFiltered.length > 0 ? levelFiltered : availableCourses.slice(0, 12);
    return finalCourses.map((c) => c.id);
  }, [availableCourses, selectedLevel]);

  const handleSelectUni = (code: UniversityCode) => {
    setSelectedUni(code);
    try {
      localStorage.setItem("overra_express_uni", code);
    } catch {
      /* ignore */
    }
  };

  const handleSelectLevel = (lvl: string) => {
    setSelectedLevel(lvl);
    try {
      localStorage.setItem("overra_express_level", lvl);
    } catch {
      /* ignore */
    }
  };

  const handleExpressLaunch = async () => {
    try {
      localStorage.setItem("overra_express_uni", selectedUni);
      localStorage.setItem("overra_express_level", selectedLevel);
    } catch {
      /* ignore */
    }

    if (!user) {
      toast.success(`Saved ${selectedUni} · ${selectedLevel}L! Create your account or sign in to start.`);
      navigate(`/auth?mode=signup&redirect=${encodeURIComponent("/student/dashboard")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const numericLevel = parseInt(selectedLevel, 10) || 100;
      const existingFaculty = (profile as any)?.faculty;
      const existingDept = (profile as any)?.department;

      // Assign sensible default faculty & department silently if not already set
      const defaultFaculties = facultiesOf(selectedUni);
      const fallbackFaculty = existingFaculty || defaultFaculties[0] || "General Studies";
      const defaultDepts = departmentsOf(selectedUni, fallbackFaculty);
      const fallbackDept = existingDept || defaultDepts[0] || "General Programme";

      const currentTokenBalance = (profile as any)?.ai_token_balance ?? 0;
      const updatedBalance = currentTokenBalance <= 0 ? 50 : currentTokenBalance;

      // 1. Update student profile in one fast call
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          university: selectedUni,
          faculty: fallbackFaculty,
          department: fallbackDept,
          level: numericLevel,
          environment_type: "university",
          academic_path: "university",
          onboarding_completed: true,
          ai_token_balance: updatedBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) {
        console.warn("Profile update note:", profileError.message);
      }

      // 2. Silently auto-enroll student into all matched level courses
      if (matchedCourseIds.length > 0) {
        const enrollments = matchedCourseIds.map((cId) => ({
          student_id: user.id,
          course_id: cId,
        }));
        await (supabase as any)
          .from("student_courses")
          .upsert(enrollments, { onConflict: "student_id,course_id", ignoreDuplicates: true });
      }

      try {
        localStorage.removeItem(`overra_last_route:${user.id}`);
      } catch {
        /* ignore */
      }

      await refreshProfile();

      toast.success(
        `You're all set for ${selectedUni} (${selectedLevel}L)! +50 Starter Tokens credited.`
      );
      navigate("/student/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Could not complete setup. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const levelOptions = LEVELS.slice(0, 5);

  return (
    <>
      <SEO
        title="Quick Setup · OverraPrep AI"
        description="Pick your university and academic level to launch your personalized CBT practice dashboard in seconds."
        noindex
      />

      <div className="min-h-screen bg-background flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
        {/* Clean 3-Zone Top Bar */}
        <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-8 pb-4 border-b border-border/60">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-foreground whitespace-nowrap shrink-0"
          >
            <img src={logo} alt="OverraPrep AI" className="w-7 h-7 object-contain" />
            <span className="font-display">OverraPrep AI</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap shrink-0">
            <span>Express Setup</span>
            <span aria-hidden="true">·</span>
            <span>Takes 5 seconds</span>
          </div>

          <div className="flex items-center shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => navigate("/student/dashboard")}
                className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
              >
                Skip for now
              </button>
            ) : (
              <Link
                to="/auth?mode=signin"
                className="px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Main Single-Screen 3-Tap Express Container */}
        <main className="w-full max-w-4xl mx-auto my-auto py-6">
          <div className="text-center max-w-xl mx-auto mb-6 space-y-2">
            <h1
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground tracking-tight"
              style={{ textWrap: "balance" }}
            >
              Pick your school and level to start practicing
            </h1>
            <p className="text-sm text-muted-foreground">
              We automatically load your past CBT questions, lecture notes, and credit +50 free tokens.
            </p>
          </div>

          {/* Single-Elevation Express Card */}
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-8 shadow-sm space-y-7">
            {/* TAP 1: UNIVERSITY SELECTION */}
            <section aria-labelledby="step-uni-heading" className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h2
                  id="step-uni-heading"
                  className="font-display text-sm sm:text-base font-bold text-foreground flex items-center gap-2"
                >
                  <School className="w-4 h-4 text-primary shrink-0" />
                  <span>1. Choose Your University</span>
                </h2>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  Selected: <strong className="text-foreground">{selectedUni}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(UNIVERSITIES).map((uni) => {
                  const isSelected = selectedUni === uni.code;
                  const gateImg = UNIVERSITY_GATE_IMAGES[uni.code];

                  return (
                    <button
                      key={uni.code}
                      type="button"
                      onClick={() => handleSelectUni(uni.code)}
                      className={`group relative text-left rounded-2xl border transition-all duration-150 overflow-hidden min-h-[88px] flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border bg-background hover:border-primary/50 hover:bg-muted/40"
                      }`}
                    >
                      {gateImg ? (
                        <div className="relative h-20 w-full overflow-hidden bg-muted">
                          <img
                            src={gateImg}
                            alt={uni.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="eager"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                          <span className="absolute bottom-2 left-3 font-display font-extrabold text-sm text-white tracking-tight">
                            {uni.code}
                          </span>
                          {isSelected && (
                            <span className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground shadow-xs">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between px-3.5 pt-3.5">
                          <span className="font-display font-extrabold text-sm text-foreground">
                            {uni.code}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          )}
                        </div>
                      )}

                      <div className="p-3">
                        <p className="text-xs font-semibold text-foreground line-clamp-1">
                          {uni.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {uni.city}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Hairline Divider */}
            <div className="border-t border-border/70" />

            {/* TAP 2: ACADEMIC LEVEL BAR */}
            <section aria-labelledby="step-level-heading" className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h2
                  id="step-level-heading"
                  className="font-display text-sm sm:text-base font-bold text-foreground flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-primary shrink-0" />
                  <span>2. Pick Your Current Level</span>
                </h2>
                <span className="text-xs text-muted-foreground font-mono tabular-nums">
                  {loadingCourses
                    ? "Checking courses…"
                    : `${matchedCourseIds.length} courses ready`}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
                {levelOptions.map((lvl) => {
                  const isSelected = selectedLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleSelectLevel(lvl)}
                      className={`min-h-[48px] rounded-xl font-mono text-xs sm:text-sm font-bold tabular-nums border transition-all duration-150 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/40"
                      }`}
                    >
                      <span>{lvl}L</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 hidden sm:inline shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* TAP 3: INSTANT LAUNCH & SILENT AUTO-ENROLL CTA */}
            <section className="pt-2 space-y-3">
              <Button
                type="button"
                onClick={handleExpressLaunch}
                disabled={isSubmitting}
                className="w-full min-h-[52px] rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold text-sm sm:text-base shadow-md transition-transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading your {selectedUni} {selectedLevel}L dashboard…</span>
                  </>
                ) : (
                  <>
                    <span>Start Studying ({selectedUni} · {selectedLevel}L)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground text-center">
                <span className="inline-flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span className="tabular-nums">
                    Auto-enrolls {matchedCourseIds.length || "verified"} {selectedLevel}L courses
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-primary" />
                  <span>+50 Free CBT Starter Tokens</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>Change anytime in Settings</span>
              </div>
            </section>
          </div>
        </main>

        {/* Quiet Footer */}
        <footer className="w-full max-w-5xl mx-auto pt-4 text-center text-xs text-muted-foreground">
          <span>OverraPrep AI · Nigerian University CBT &amp; Study Companion</span>
        </footer>
      </div>
    </>
  );
};

export default UniversityOnboarding;
