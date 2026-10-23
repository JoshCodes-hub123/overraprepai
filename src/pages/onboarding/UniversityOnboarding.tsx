import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  School,
  Search,
  BookOpen,
  Coins,
  ShieldCheck,
  Check,
  Zap,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";

interface PreviewCourse {
  id: string;
  code: string;
  name: string;
  level: string | null;
}

export const UniversityOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedUni, setSelectedUni] = useState<UniversityCode>(
    ((profile as any)?.university as UniversityCode) || "FUTA"
  );
  const [selectedFaculty, setSelectedFaculty] = useState<string>(
    (profile as any)?.faculty || "School of Computing"
  );
  const [selectedDept, setSelectedDept] = useState<string>(
    (profile as any)?.department || "Computer Science"
  );
  const [deptSearch, setDeptSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>(
    String((profile as any)?.level || "200")
  );

  const [previewCourses, setPreviewCourses] = useState<PreviewCourse[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  // Available faculties for currently selected university
  const availableFaculties = useMemo(() => facultiesOf(selectedUni), [selectedUni]);

  // When university changes, ensure faculty and department stay synchronized
  const handleUniChange = (code: UniversityCode) => {
    setSelectedUni(code);
    const faculties = facultiesOf(code);
    const nextFaculty = faculties[0] || "";
    setSelectedFaculty(nextFaculty);
    const depts = departmentsOf(code, nextFaculty);
    setSelectedDept(depts[0] || "");
  };

  // Available departments for selected university and faculty
  const allDeptsInFaculty = useMemo(
    () => departmentsOf(selectedUni, selectedFaculty),
    [selectedUni, selectedFaculty]
  );

  // Filtered departments based on user search query
  const filteredDepartments = useMemo(() => {
    if (!deptSearch.trim()) return allDeptsInFaculty;
    const q = deptSearch.toLowerCase().trim();
    return allDeptsInFaculty.filter((d) => d.toLowerCase().includes(q));
  }, [allDeptsInFaculty, deptSearch]);

  // Fetch verified courses when entering Step 3 (Academic Level & Course Bundle)
  useEffect(() => {
    if (step !== 3) return;

    let active = true;
    async function loadCoursesForLevel() {
      setLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, code, name, level, department, university")
          .eq("is_active", true)
          .eq("university", selectedUni)
          .limit(15);

        if (error) throw error;
        if (active) {
          const list = (data as any) || [];
          setPreviewCourses(list);
          setSelectedCourseIds(list.map((c: any) => c.id));
        }
      } catch (err) {
        console.warn("Could not load preview courses:", err);
      } finally {
        if (active) setLoadingCourses(false);
      }
    }

    loadCoursesForLevel();
    return () => {
      active = false;
    };
  }, [step, selectedUni, selectedDept, selectedLevel]);

  const toggleCourseSelect = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleNextToStep2 = () => {
    if (!selectedUni) {
      toast.error("Please choose your university.");
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (!selectedFaculty) {
      toast.error("Please select your faculty or school.");
      return;
    }
    if (!selectedDept) {
      toast.error("Please pick your department.");
      return;
    }
    setStep(3);
  };

  const handleFinish = async () => {
    if (!user) {
      toast.error("Please sign in or create an account first.");
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    try {
      const numericLevel = parseInt(selectedLevel, 10) || 200;

      // 1. Update student profile with full academic scope & starter 50 tokens bonus
      const currentTokenBalance = (profile as any)?.ai_token_balance ?? 0;
      const updatedBalance = currentTokenBalance <= 0 ? 50 : currentTokenBalance;

      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          university: selectedUni,
          faculty: selectedFaculty,
          department: selectedDept,
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

      // 2. Auto-enroll student into verified course bundle
      if (selectedCourseIds.length > 0) {
        const enrollments = selectedCourseIds.map((cId) => ({
          student_id: user.id,
          course_id: cId,
        }));
        await (supabase as any)
          .from("student_courses")
          .upsert(enrollments, { onConflict: "student_id,course_id", ignoreDuplicates: true });
      }

      await refreshProfile();
      setShowRewardModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to finalize academic onboarding. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToDashboard = () => {
    setShowRewardModal(false);
    navigate("/student/dashboard", { replace: true });
  };

  return (
    <>
      <SEO
        title="Academic Onboarding &amp; Curriculum Setup · OverraPrep AI"
        description="Configure your official Nigerian university curriculum, department handbooks, and verified semester courses."
        noindex
      />

      <div className="min-h-screen bg-slate-50/60 dark:bg-neutral-950 py-10 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Academic Onboarding</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Set Up Your University Workspace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              We isolate all past CBT exams, syllabi outlines, and AI tutor explanations strictly to your university curriculum.
            </p>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="grid grid-cols-3 gap-2 py-2">
            {[
              { num: 1, label: "Institution" },
              { num: 2, label: "Faculty & Dept" },
              { num: 3, label: "Level & Courses" },
            ].map((s) => (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    step >= s.num ? "bg-amber-500 shadow-xs" : "bg-muted"
                  }`}
                />
                <p
                  className={`text-[11px] font-semibold text-center ${
                    step >= s.num ? "text-foreground font-bold" : "text-muted-foreground"
                  }`}
                >
                  Step {s.num}: {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Wizard Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <AnimatePresence mode="wait">
              {/* STEP 1: Institution / University Island */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <School className="w-4 h-4 text-amber-600" />
                        Select Your University
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Your tests and syllabus will be strictly grounded in this institution.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border-amber-300">
                      {selectedUni}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {Object.values(UNIVERSITIES).map((uni) => {
                      const isSelected = selectedUni === uni.code;
                      return (
                        <button
                          key={uni.code}
                          type="button"
                          onClick={() => handleUniChange(uni.code)}
                          className={`text-left p-4 rounded-xl border transition-all relative ${
                            isSelected
                              ? "bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                              : "bg-background border-border hover:border-amber-400 hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-base text-foreground tracking-tight">
                              {uni.code}
                            </span>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-amber-600" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-border" />
                            )}
                          </div>
                          <p className="text-xs font-medium text-foreground line-clamp-1">
                            {uni.name}
                          </p>
                          <span className="text-[11px] text-muted-foreground mt-0.5 block">
                            {uni.city} · Accredited Campus
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex items-center justify-end">
                    <Button
                      onClick={handleNextToStep2}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl h-11 px-6 shadow-sm gap-2"
                    >
                      <span>Continue to Faculty &amp; Dept</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Faculty & Department Selection with Instant Search */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-amber-600" />
                        Faculty &amp; Department
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Select your school and department to align past questions with official curricula.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border-amber-300">
                      {selectedUni}
                    </Badge>
                  </div>

                  {/* Faculty Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Faculty / School in {selectedUni}
                    </label>
                    <select
                      value={selectedFaculty}
                      onChange={(e) => {
                        const nextFac = e.target.value;
                        setSelectedFaculty(nextFac);
                        const depts = departmentsOf(selectedUni, nextFac);
                        setSelectedDept(depts[0] || "");
                      }}
                      className="w-full h-11 bg-background border border-border rounded-xl px-3.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {availableFaculties.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Department Quick Filter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Department
                      </label>
                      <span className="text-[11px] text-muted-foreground">
                        {filteredDepartments.length} Departments Available
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search your department (e.g. Computer, Mechanical, Electrical)..."
                        value={deptSearch}
                        onChange={(e) => setDeptSearch(e.target.value)}
                        className="pl-9 h-10 text-xs rounded-xl"
                      />
                    </div>

                    <div className="max-h-52 overflow-y-auto rounded-xl border border-border/80 bg-muted/20 p-1.5 space-y-1">
                      {filteredDepartments.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">
                          No departments matching "{deptSearch}". Pick from available list.
                        </p>
                      ) : (
                        filteredDepartments.map((dept) => {
                          const isSelected = selectedDept === dept;
                          return (
                            <button
                              key={dept}
                              type="button"
                              onClick={() => setSelectedDept(dept)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                                isSelected
                                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300 font-semibold"
                                  : "hover:bg-muted text-foreground"
                              }`}
                            >
                              <span>{dept}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="rounded-xl h-11 px-4 gap-1.5 text-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNextToStep3}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl h-11 px-6 shadow-sm gap-2 text-xs"
                    >
                      <span>Continue to Academic Level</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Academic Level & Verified Course Bundle */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        Level &amp; Course Enrollment
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Select your academic year to automatically preload departmental course outlines.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold text-amber-700 bg-amber-50 border-amber-300">
                      {selectedDept}
                    </Badge>
                  </div>

                  {/* Level Pill Buttons */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Academic Level (Study Year)
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {LEVELS.slice(0, 5).map((lvl) => {
                        const isSelected = selectedLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSelectedLevel(lvl)}
                            className={`py-2.5 rounded-xl text-center text-xs font-bold border transition-all ${
                              isSelected
                                ? "bg-amber-500 text-white border-amber-600 shadow-xs scale-102"
                                : "bg-background text-foreground border-border hover:border-amber-300"
                            }`}
                          >
                            {lvl}L
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verified Course Package Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        Preloaded Courses ({selectedUni} · {selectedLevel}L)
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {selectedCourseIds.length} Selected
                      </span>
                    </div>

                    {loadingCourses ? (
                      <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span>Querying verified department course database…</span>
                      </div>
                    ) : previewCourses.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground space-y-1">
                        <p className="font-semibold text-foreground">No specific courses locked yet.</p>
                        <p>You can add and browse courses from the catalog right after completion.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border rounded-xl bg-muted/20">
                        {previewCourses.map((c) => {
                          const isEnrolled = selectedCourseIds.includes(c.id);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCourseSelect(c.id)}
                              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs text-left transition-all ${
                                isEnrolled
                                  ? "bg-amber-500/10 border-amber-400 text-amber-950 dark:text-amber-200"
                                  : "bg-background border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <div className="truncate">
                                <span className="font-mono font-bold text-[11px] block text-foreground">
                                  {c.code}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate block">
                                  {c.name}
                                </span>
                              </div>
                              {isEnrolled && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Summary Callout */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 p-3 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
                    <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p>
                      Completing onboarding deposits <strong>+50 Starter Tokens</strong> directly into your exam wallet.
                    </p>
                  </div>

                  <div className="pt-3 flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                      className="rounded-xl h-11 px-4 gap-1.5 text-xs"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleFinish}
                      disabled={isSubmitting}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-11 px-7 shadow-sm gap-2 text-xs"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Finalizing Setup…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Complete &amp; Launch Dashboard</span>
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Completion Celebration & Starter Tokens Reward Splash Dialog */}
      <Dialog open={showRewardModal} onOpenChange={setShowRewardModal}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 text-center">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-2 shadow-xs">
              <Coins className="w-8 h-8 text-emerald-600 animate-bounce" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Academic Workspace Ready!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Your curriculum island is configured for {selectedUni} · {selectedDept} ({selectedLevel}L).
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3.5 text-xs">
            <div className="rounded-xl border border-amber-300 bg-amber-500/10 p-4 space-y-1">
              <span className="font-bold text-base text-amber-800 dark:text-amber-200">
                +50 Free CBT Exam Tokens Credited
              </span>
              <p className="text-[11.5px] text-muted-foreground">
                Use your tokens to take timed mock exams, unlock verified answer keys, and get step-by-step AI tutoring.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-xl border border-border bg-muted/40">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Enrolled Courses
                </span>
                <span className="text-sm font-extrabold text-foreground">
                  {selectedCourseIds.length} Verified Units
                </span>
              </div>
              <div className="p-3 rounded-xl border border-border bg-muted/40">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  CBT Question Bank
                </span>
                <span className="text-sm font-extrabold text-emerald-600">
                  Instant Access
                </span>
              </div>
            </div>

            <Button
              onClick={handleGoToDashboard}
              className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md gap-2 mt-2"
            >
              <span>Go to My Student Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UniversityOnboarding;
