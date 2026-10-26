import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Plus,
  GraduationCap,
  Sparkles,
  X,
  Layers,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { useMyCourses } from "@/hooks/useMyCourses";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useReadinessAll } from "@/hooks/useIntelligence";
import { useStudentScope } from "@/hooks/useStudentScope";
import { SEO } from "@/components/seo/SEO";
import { CourseCardV2 } from "@/components/courses/CourseCardV2";
import { ChangeLevelSheet } from "@/components/courses/ChangeLevelSheet";
import CourseDirectory from "@/pages/courses/CourseDirectory";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const LEVEL_TABS = ["all", "100", "200", "300", "400", "500"] as const;

/**
 * Rebranded Courses Screen
 * Beautiful, organized, and tranquil course grid featuring automatic subject
 * imagery, clean metadata typography, CBT practice triggers, and seamless enrollment.
 */
const CoursesScreen = () => {
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { isUniversity, institution } = useEnvironment();
  const qc = useQueryClient();
  const { level: studentLevel, department: studentDept } = useStudentScope();
  const { courseIds, refresh } = useMyCourses();
  const { data: enrolled = [], isLoading: isLoadingEnrolled } = useCourseSnapshots();
  const { data: readiness = [] } = useReadinessAll();

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "explore">("mine");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const isStudent = primaryRole !== "admin" && primaryRole !== "tutor";

  // Map weak topics and readiness by course ID
  const readinessByCourse = useMemo(() => {
    const map: Record<string, { weakTopic?: string; score?: number }> = {};
    for (const r of readiness) {
      if (r.course_id) {
        map[r.course_id] = {
          weakTopic: r.weak_topics?.[0]?.topic,
          score: (r as any).overall_score ?? r.readiness ?? undefined,
        };
      }
    }
    return map;
  }, [readiness]);

  const term = q.trim().toLowerCase();

  // Full university course catalogue for exploration/adding
  const { data: fullCatalogue = [], isLoading: isLoadingCatalogue } = useQuery({
    queryKey: ["courses-screen-catalogue", user?.id, institution],
    enabled: isStudent && !!user && isUniversity && !!institution,
    staleTime: 60_000,
    queryFn: async () => {
      if (!isUniversity || !institution) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level")
        .eq("is_active", true)
        .eq("environment_type", "university")
        .eq("university", institution)
        .order("code", { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        code: string;
        name: string;
        department: string | null;
        level: string | null;
      }>;
    },
  });

  const isEnrolled = (id: string) => courseIds.includes(id);

  // Enroll in course
  const enroll = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any)
      .from("student_courses")
      .insert({ student_id: user.id, course_id: id });
    setBusy(null);
    if (error) {
      return toast.error("Could not enroll in course");
    }
    toast.success("Course added to your curriculum");
    refresh();
    qc.invalidateQueries({ queryKey: ["course-snapshots"] });
  };

  // Filtered enrolled courses
  const filteredMine = useMemo(() => {
    return enrolled.filter((c: any) => {
      if (term) {
        const str = `${c.code} ${c.name} ${c.department || ""}`.toLowerCase();
        if (!str.includes(term)) return false;
      }
      if (levelFilter !== "all" && c.level !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [enrolled, term, levelFilter]);

  // Filtered explore courses
  const filteredExplore = useMemo(() => {
    return fullCatalogue.filter((c) => {
      if (term) {
        const str = `${c.code} ${c.name} ${c.department || ""}`.toLowerCase();
        if (!str.includes(term)) return false;
      }
      if (levelFilter !== "all" && c.level !== levelFilter) {
        return false;
      }
      return true;
    });
  }, [fullCatalogue, term, levelFilter]);

  // Automatically show Explore tab if student has no enrolled courses yet once loaded
  const effectiveTab =
    activeTab === "mine" && !isLoadingEnrolled && enrolled.length === 0 && fullCatalogue.length > 0
      ? "explore"
      : activeTab;

  // Tutors and admins use the administration directory
  if (primaryRole === "admin" || primaryRole === "tutor") {
    return <CourseDirectory />;
  }

  const enrolledCount = enrolled.length;
  const catalogueCount = fullCatalogue.length;

  return (
    <>
      <SEO
        title="Courses — OverraPrep"
        description="Your academic curriculum, lecture notes, syllabus breakdowns and CBT practice."
        noindex
      />

      <div className="min-h-screen bg-background pb-28 pt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Header Card: Tranquil, dignified university brand presence */}
          <header className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-amber-500/5 p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                {/* Academic Context line */}
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                  <GraduationCap className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span className="font-semibold">{institution || "University Curriculum"}</span>
                  {studentDept && (
                    <>
                      <span aria-hidden="true" className="opacity-40">·</span>
                      <span className="text-muted-foreground">{studentDept}</span>
                    </>
                  )}
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Courses & Curriculum
                </h1>

                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl leading-relaxed">
                  Every course includes weekly syllabus breakdowns, KaTeX notes, and verified CBT past questions.
                </p>
              </div>

              {/* Level Status & Switcher */}
              <button
                type="button"
                onClick={() => setLevelSheetOpen(true)}
                className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border/80 hover:border-amber-400/80 hover:shadow-xs transition-all self-start md:self-center cursor-pointer group select-none"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center font-mono font-bold text-xs group-hover:scale-105 transition-transform">
                  {studentLevel ? studentLevel.replace(/\D/g, "") || "L" : "L"}
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Academic Level
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1">
                    <span>{studentLevel ? `${studentLevel} Level` : "Set your level"}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </div>
              </button>
            </div>

            {/* Quick Search Input */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <div className="relative max-w-xl">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by course code (e.g. MTH 101, CSC 201), title, or department…"
                  aria-label="Search courses"
                  className="h-11 w-full rounded-xl border border-border/80 bg-background pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-2xs transition-all"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Interactive Navigation Controls: Segmented Tabs + Level Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            {/* Primary Segmented Tabs */}
            <div className="inline-flex p-1 rounded-2xl bg-muted/70 border border-border/60 self-start">
              <button
                type="button"
                onClick={() => setActiveTab("mine")}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  effectiveTab === "mine"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>My Courses</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                    effectiveTab === "mine"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {enrolledCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("explore")}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  effectiveTab === "explore"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Explore Curriculum</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                    effectiveTab === "explore"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {catalogueCount}
                </span>
              </button>
            </div>

            {/* Level Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
              {LEVEL_TABS.map((lvl) => {
                const isSelected = levelFilter === lvl;
                const label = lvl === "all" ? "All Levels" : `${lvl}L`;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    className={`shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-slate-950 font-bold shadow-2xs"
                        : "bg-card border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab 1: My Courses Grid */}
          {effectiveTab === "mine" && (
            <div>
              {isLoadingEnrolled ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/60 bg-card overflow-hidden h-72 animate-pulse flex flex-col"
                    >
                      <div className="h-36 bg-muted/60" />
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                        <div className="h-9 bg-muted/50 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMine.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>
                      Showing {filteredMine.length} enrolled course{filteredMine.length === 1 ? "" : "s"}
                      {levelFilter !== "all" ? ` · ${levelFilter} Level` : ""}
                    </span>
                    {term && (
                      <button
                        type="button"
                        onClick={() => setQ("")}
                        className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                      >
                        Reset search
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    {filteredMine.map((c: any) => {
                      const readinessInfo = readinessByCourse[c.id];
                      return (
                        <CourseCardV2
                          key={c.id}
                          course={c}
                          state="enrolled"
                          weakTopic={readinessInfo?.weakTopic}
                          readinessScore={readinessInfo?.score}
                          unreadUpdates={c.unread_updates ?? 0}
                          studentLevel={studentLevel}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : term ? (
                <div className="rounded-3xl border border-border/80 bg-card p-10 text-center max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    No enrolled courses match “{q.trim()}”
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Would you like to search across the entire university catalogue instead?
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <Button
                      onClick={() => setActiveTab("explore")}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl h-9"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Search All Curriculum
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setQ("")}
                      className="text-xs font-semibold rounded-xl h-9"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 grid place-items-center mx-auto">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-lg text-foreground">
                      No courses registered yet
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      Select your semester courses from your department curriculum to start practicing verified past questions and reading lecture notes.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      onClick={() => setActiveTab("explore")}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl h-11 px-5 shadow-xs"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Explore & Add Semester Courses
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Explore Curriculum & Add Courses */}
          {effectiveTab === "explore" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>
                  Showing {filteredExplore.length} curriculum courses in {institution || "University"}
                  {levelFilter !== "all" ? ` (${levelFilter}L)` : ""}
                </span>
                {term && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>

              {isLoadingCatalogue ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-border/60 bg-card overflow-hidden h-72 animate-pulse flex flex-col"
                    >
                      <div className="h-36 bg-muted/60" />
                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted/60 rounded w-3/4" />
                          <div className="h-3 bg-muted/40 rounded w-1/2" />
                        </div>
                        <div className="h-9 bg-muted/50 rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredExplore.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {filteredExplore.map((c) => {
                    const enrolled = isEnrolled(c.id);
                    const locked =
                      !enrolled && !!studentLevel && !!c.level && c.level !== studentLevel;
                    const state = enrolled ? "enrolled" : locked ? "locked" : "available";

                    return (
                      <CourseCardV2
                        key={c.id}
                        course={c}
                        state={state}
                        recommended={
                          !enrolled && !locked && !!studentLevel && c.level === studentLevel
                        }
                        busy={busy === c.id}
                        studentLevel={studentLevel}
                        onAdd={() => enroll(c.id)}
                        onLockedTap={() => setLevelSheetOpen(true)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-border/80 bg-card p-10 text-center max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground grid place-items-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-display font-bold text-base text-foreground">
                    No curriculum courses match “{q.trim()}”
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Try checking your course code or clearing the level filter.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQ("");
                      setLevelFilter("all");
                    }}
                    className="text-xs font-semibold rounded-xl h-9"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Academic Level Switcher Bottom Sheet */}
      <ChangeLevelSheet open={levelSheetOpen} onOpenChange={setLevelSheetOpen} />
    </>
  );
};

export default CoursesScreen;
