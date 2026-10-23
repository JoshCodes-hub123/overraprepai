import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useStudentScope } from "@/hooks/useStudentScope";
import useEnvironment from "@/hooks/useEnvironment";
import { useMyCourses } from "@/hooks/useMyCourses";
import { toast } from "sonner";
import {
  GraduationCap,
  Search,
  Plus,
  Sparkles,
  BookOpen,
  X,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { CourseCardV2 } from "@/components/courses/CourseCardV2";
import { LevelSection } from "@/components/courses/LevelSection";
import { ChangeLevelSheet } from "@/components/courses/ChangeLevelSheet";

interface CourseRow {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
}

const LEVEL_ORDER = ["100", "200", "300", "400", "500", "Other"];

const QUICK_SEARCH_CHIPS = ["MTH 101", "PHY 101", "CSC 201", "CHM 101", "GST 111", "MEE 201"];

const CourseDirectory = () => {
  const { user, primaryRole } = useAuth();
  const { isUniversity, institution } = useEnvironment();
  const { level: studentLevel } = useStudentScope();
  const { courseIds, refresh } = useMyCourses();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"mine" | "recommended" | "all">("mine");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<"all" | "1st" | "2nd">("all");
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["course-directory", user?.id, navRole, institution],
    enabled: !!user && (navRole !== "student" || (isUniversity && !!institution)),
    queryFn: async () => {
      if (navRole === "student" && (!isUniversity || !institution)) return [];
      let query = supabase
        .from("courses")
        .select("id, code, name, department, level")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(1000);
      if (navRole === "student") {
        query = query
          .eq("environment_type", "university")
          .eq("university", institution);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 60_000,
  });

  const enroll = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any)
      .from("student_courses")
      .insert({ student_id: user.id, course_id: id });
    setBusy(null);
    if (error) return toast.error("Could not enroll");
    toast.success("Course added to your curriculum list");
    refresh();
    qc.invalidateQueries({ queryKey: ["course-snapshots"] });
  };

  const isEnrolled = (id: string) => courseIds.includes(id);

  // Search and filter pipeline
  const filteredCourses = useMemo(() => {
    const s = q.trim().toLowerCase();
    return courses.filter((c) => {
      // Search text match
      if (s) {
        const fullString = [c.code, c.name, c.department, c.level].filter(Boolean).join(" ").toLowerCase();
        if (!fullString.includes(s)) return false;
      }

      // Level filter
      if (levelFilter !== "all" && c.level !== levelFilter) {
        return false;
      }

      // Semester filter heuristic (e.g. 101, 201, 301 vs 102, 202, 302)
      if (semesterFilter === "1st") {
        const isSecond = /2$|two|ii/i.test(c.code);
        if (isSecond) return false;
      } else if (semesterFilter === "2nd") {
        const isSecond = /2$|two|ii/i.test(c.code);
        if (!isSecond) return false;
      }

      return true;
    });
  }, [courses, q, levelFilter, semesterFilter]);

  // Tab pools
  const pool = useMemo(() => {
    if (tab === "mine") return filteredCourses.filter((c) => isEnrolled(c.id));
    if (tab === "recommended")
      return filteredCourses.filter(
        (c) => !isEnrolled(c.id) && (!studentLevel || !c.level || c.level === studentLevel),
      );
    return filteredCourses;
  }, [filteredCourses, tab, courseIds, studentLevel]);

  // Group by level
  const grouped = useMemo(() => {
    const map: Record<string, CourseRow[]> = {};
    pool.forEach((c) => {
      const key = c.level || "Other";
      (map[key] ||= []).push(c);
    });
    return LEVEL_ORDER
      .filter((l) => map[l]?.length)
      .map((l) => ({ level: l, items: map[l] }));
  }, [pool]);

  const enrolledCount = courseIds.length;
  const recommendedCount = useMemo(
    () =>
      courses.filter(
        (c) => !isEnrolled(c.id) && (!studentLevel || !c.level || c.level === studentLevel),
      ).length,
    [courses, courseIds, studentLevel],
  );

  const TABS = [
    { id: "mine" as const, label: "My Enrolled Courses", count: enrolledCount },
    {
      id: "recommended" as const,
      label: studentLevel ? `Curated for ${studentLevel}` : "Recommended",
      count: recommendedCount,
    },
    { id: "all" as const, label: "All University Courses", count: courses.length },
  ];

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-24">
      <SEO
        title="Courses & Syllabi — OverraPrep"
        description="Browse institutional courses, verified syllabus breakdowns, KaTeX lecture notes and CBT question banks."
      />
      <DashboardNav role={navRole} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DashboardBreadcrumb role={navRole} />

        {/* Hero Header */}
        <header className="mt-3 mb-6 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border border-amber-200/70 rounded-3xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold mb-2">
                <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                {institution || "Accredited University Directory"}
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                Academic Course Hub & Syllabi
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 max-w-2xl leading-relaxed">
                Explore your departmental semester curriculum, view weekly syllabus breakdowns, read KaTeX-rendered notes, and drill verified CBT questions.
              </p>
            </div>

            {/* Level Selector Button */}
            <button
              type="button"
              onClick={() => setLevelSheetOpen(true)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 hover:shadow-sm transition shrink-0 self-start md:self-center"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 grid place-items-center font-bold text-xs">
                {studentLevel ? studentLevel[0] : "L"}
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Current Level</p>
                <p className="text-xs font-extrabold text-neutral-900">
                  {studentLevel ? `${studentLevel} Level` : "Tap to set level"}
                </p>
              </div>
            </button>
          </div>

          {/* Search Bar & Quick Chips */}
          <div className="mt-6 pt-5 border-t border-amber-200/50 space-y-3">
            <div className="relative w-full max-w-xl">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search course code (e.g. MTH 101, CSC 201), title, or department…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 pr-9 h-11 bg-white border-neutral-300 focus:border-amber-500 rounded-xl text-sm shadow-xs"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick search chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              <span className="text-[11px] font-semibold text-neutral-500 shrink-0 mr-1">Popular:</span>
              {QUICK_SEARCH_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setQ(chip)}
                  className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    q.toLowerCase() === chip.toLowerCase()
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-neutral-700 border-neutral-200 hover:border-amber-300"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Filter Controls Row: Tabs + Semester + Level */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-neutral-200/80">
          {/* Main Segmented Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  {t.id === "recommended" && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                  {t.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sub-filters (Semester & Level filter) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Semester selector */}
            <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-0.5 text-xs font-semibold">
              <button
                onClick={() => setSemesterFilter("all")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  semesterFilter === "all" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                All Semesters
              </button>
              <button
                onClick={() => setSemesterFilter("1st")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  semesterFilter === "1st" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                1st Sem
              </button>
              <button
                onClick={() => setSemesterFilter("2nd")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  semesterFilter === "2nd" ? "bg-amber-100 text-amber-900 font-bold" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                2nd Sem
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-neutral-700">Loading university curriculum courses…</p>
          </div>
        ) : pool.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-neutral-900">
              {tab === "mine"
                ? "No Enrolled Courses Yet"
                : q
                ? `No courses matching "${q}"`
                : "No Courses Found for Current Filter"}
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 leading-relaxed">
              {tab === "mine"
                ? "Switch to the Recommended or All Courses tab to add your semester courses and access CBT past questions."
                : "Try resetting your search query or switching semester/level filters."}
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {tab === "mine" ? (
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl h-10 px-4"
                  onClick={() => setTab("recommended")}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Browse Recommended Courses
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="text-xs font-semibold rounded-xl h-9"
                  onClick={() => {
                    setQ("");
                    setSemesterFilter("all");
                    setLevelFilter("all");
                  }}
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((g) => (
              <LevelSection
                key={g.level}
                level={g.level}
                count={g.items.length}
                active={g.level === studentLevel}
                defaultOpen={g.level === studentLevel || tab === "mine" || pool.length <= 15}
              >
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {g.items.map((c) => {
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
              </LevelSection>
            ))}
          </div>
        )}
      </main>

      <ChangeLevelSheet open={levelSheetOpen} onOpenChange={setLevelSheetOpen} />
    </div>
  );
};

export default CourseDirectory;
