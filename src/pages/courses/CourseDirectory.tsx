import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useStudentScope } from "@/hooks/useStudentScope";
import useEnvironment from "@/hooks/useEnvironment";
import { useMyCourses } from "@/hooks/useMyCourses";
import { toast } from "sonner";
import { GraduationCap, Search, Plus, Sparkles, BookOpen } from "lucide-react";
import { CourseCardV2 } from "@/components/courses/CourseCardV2";
import { LevelSection } from "@/components/courses/LevelSection";
import { ChangeLevelSheet } from "@/components/courses/ChangeLevelSheet";

interface CourseRow {
  id: string; code: string; name: string;
  department: string | null; level: string | null;
}

const LEVEL_ORDER = ["100", "200", "300", "400", "500", "JAMB", "Secondary", "Other"];

const CourseDirectory = () => {
  const { user, primaryRole } = useAuth();
  const { isUniversity, institution } = useEnvironment();
  const { level: studentLevel } = useStudentScope();
  const { courseIds, refresh } = useMyCourses();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"mine" | "recommended" | "all">("mine");
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
    toast.success("Course added to your list");
    refresh();
    qc.invalidateQueries({ queryKey: ["course-snapshots"] });
  };

  const isEnrolled = (id: string) => courseIds.includes(id);

  const filteredBySearch = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return courses;
    return courses.filter((c) =>
      [c.code, c.name, c.department, c.level].filter(Boolean).join(" ").toLowerCase().includes(s),
    );
  }, [courses, q]);

  // Pool depends on tab
  const pool = useMemo(() => {
    if (tab === "mine") return filteredBySearch.filter((c) => isEnrolled(c.id));
    if (tab === "recommended")
      return filteredBySearch.filter(
        (c) => !isEnrolled(c.id) && (!studentLevel || !c.level || c.level === studentLevel),
      );
    return filteredBySearch;
  }, [filteredBySearch, tab, courseIds, studentLevel]);

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
    { id: "mine" as const, label: "My Courses", count: enrolledCount },
    { id: "recommended" as const, label: studentLevel ? `For ${studentLevel}` : "Recommended", count: recommendedCount },
    { id: "all" as const, label: "All", count: courses.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Courses — OverraPrep"
        description="Browse and pick the courses for your level. Organised by 100, 200, 300, 400 and 500 level."
      />
      <DashboardNav role={navRole} />
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <DashboardBreadcrumb role={navRole} />

        {/* Header */}
        <header className="mt-2 mb-4">
          <h1 className="font-display text-2xl md:text-3xl flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-amber-500" /> Courses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick the courses for your level. Everything in your dashboard adapts to what you choose here.
          </p>

          {/* Level chip */}
          <button
            type="button"
            onClick={() => setLevelSheetOpen(true)}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="text-[12px] font-bold">
              {studentLevel ? `${studentLevel} Level` : "Set your level"}
            </span>
            <span className="text-[11px] text-amber-700/80">· tap to change</span>
          </button>
        </header>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, name or department…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-bold transition ${
                  active
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-white border border-amber-100 text-amber-800 hover:border-amber-300"
                }`}
              >
                {t.id === "recommended" && <Sparkles className="w-3 h-3" />}
                {t.label}
                <span
                  className={`text-[10.5px] px-1.5 py-0.5 rounded-md ${
                    active ? "bg-white/20" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading courses…</p>
        ) : pool.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-8 text-center">
            <BookOpen className="w-7 h-7 text-amber-500 mx-auto mb-2" />
            <p className="font-display font-bold text-[15px]">
              {tab === "mine"
                ? "No courses yet"
                : tab === "recommended"
                ? `No ${studentLevel || "level-matched"} suggestions right now`
                : "No matches"}
            </p>
            <p className="text-[12.5px] text-neutral-500 mt-1">
              {tab === "mine"
                ? "Add courses from the Recommended or All tab to start studying."
                : "Try a different search term or change your level."}
            </p>
            {tab === "mine" && (
              <Button
                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setTab("recommended")}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Pick courses
              </Button>
            )}
          </div>
        ) : (
          grouped.map((g) => (
            <LevelSection
              key={g.level}
              level={g.level}
              count={g.items.length}
              active={g.level === studentLevel}
              defaultOpen={g.level === studentLevel || tab === "mine"}
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
          ))
        )}
      </div>

      <ChangeLevelSheet open={levelSheetOpen} onOpenChange={setLevelSheetOpen} />
    </div>
  );
};

export default CourseDirectory;
