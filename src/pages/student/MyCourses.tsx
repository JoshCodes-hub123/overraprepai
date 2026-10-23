import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyCourses } from "@/hooks/useMyCourses";
import { useStudentScope } from "@/hooks/useStudentScope";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { BookOpen, Plus, Search, GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { CourseCardV2 } from "@/components/courses/CourseCardV2";
import { LevelSection } from "@/components/courses/LevelSection";
import { ChangeLevelSheet } from "@/components/courses/ChangeLevelSheet";

interface Course {
  id: string; code: string; name: string;
  department: string | null; level: string | null;
}

const LEVEL_ORDER = ["100", "200", "300", "400", "500", "Other"];
const MAX_COURSES = 12;

const MyCourses = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { level: studentLevel, label: scopeLabel } = useStudentScope();
  const navigate = useNavigate();
  const { courseIds, refresh } = useMyCourses();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [levelSheetOpen, setLevelSheetOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, department, level")
        .eq("is_active", true)
        .order("code");
      setAllCourses((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const enrolled = useMemo(
    () => allCourses.filter((c) => courseIds.includes(c.id)),
    [allCourses, courseIds],
  );

  const recommended = useMemo(
    () =>
      allCourses.filter(
        (c) =>
          !courseIds.includes(c.id) &&
          (!studentLevel || !c.level || c.level === studentLevel),
      ),
    [allCourses, courseIds, studentLevel],
  );

  const enroll = async (id: string) => {
    if (!user) return;
    if (courseIds.length >= MAX_COURSES) {
      toast.error(`You've reached the ${MAX_COURSES}-course limit`);
      return;
    }
    setBusy(id);
    const { error } = await (supabase as any)
      .from("student_courses")
      .insert({ student_id: user.id, course_id: id });
    setBusy(null);
    if (error) return toast.error("Could not enroll");
    toast.success("Course added");
    refresh();
  };

  // Filter enrolled by search
  const filteredEnrolled = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return enrolled;
    return enrolled.filter((c) =>
      [c.code, c.name, c.department].filter(Boolean).join(" ").toLowerCase().includes(s),
    );
  }, [enrolled, search]);

  // Group enrolled by level
  const grouped = useMemo(() => {
    const map: Record<string, Course[]> = {};
    filteredEnrolled.forEach((c) => {
      const key = c.level || "Other";
      (map[key] ||= []).push(c);
    });
    return LEVEL_ORDER
      .filter((l) => map[l]?.length)
      .map((l) => ({ level: l, items: map[l] }));
  }, [filteredEnrolled]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center pt-32"><LoadingSpinner /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My Courses | OverraPrep AI" description="Your enrolled courses, organised by level." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role="student" /></div>
      <main className="container mx-auto px-4 pt-6 pb-24 max-w-5xl">
        {/* Hero */}
        <section className="mb-5">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <button
                onClick={() => setLevelSheetOpen(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition mb-2"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span className="text-[12px] font-bold">
                  {scopeLabel || "Set your level"}
                </span>
                <span className="text-[11px] text-amber-700/80">· change</span>
              </button>
              <h1 className="font-display text-2xl md:text-3xl">My Courses</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {enrolled.length} of {MAX_COURSES} courses · grouped by level
              </p>
            </div>
            <Button
              onClick={() => navigate("/courses")}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Add courses
            </Button>
          </div>

          {/* Capacity meter */}
          <div className="mt-4 h-1.5 w-full rounded-full bg-amber-50 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, (enrolled.length / MAX_COURSES) * 100)}%` }}
            />
          </div>
        </section>

        {/* Search */}
        {enrolled.length > 0 && (
          <div className="relative mb-5 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your courses…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Enrolled grouped by level */}
        {enrolled.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-white p-10 text-center">
            <BookOpen className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="font-display font-bold text-[16px]">No courses yet</p>
            <p className="text-[12.5px] text-neutral-500 mt-1 max-w-sm mx-auto">
              Pick from courses curated for {studentLevel ? `${studentLevel} Level` : "your level"} —
              your study materials, quizzes and AI tutor all unlock from here.
            </p>
            <Button
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => navigate("/courses")}
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> Browse courses
            </Button>
          </div>
        ) : (
          grouped.map((g) => (
            <LevelSection
              key={g.level}
              level={g.level}
              count={g.items.length}
              active={g.level === studentLevel}
              defaultOpen
            >
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.items.map((c) => (
                  <CourseCardV2
                    key={c.id}
                    course={c}
                    state="enrolled"
                    studentLevel={studentLevel}
                  />
                ))}
              </div>
            </LevelSection>
          ))
        )}

        {/* Recommended rail */}
        {recommended.length > 0 && enrolled.length < MAX_COURSES && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-[15px] inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Recommended for {studentLevel || "you"}
              </h2>
              <button
                onClick={() => navigate("/courses")}
                className="text-[12px] font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-0.5"
              >
                See all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-2 snap-x">
              {recommended.slice(0, 6).map((c) => (
                <div key={c.id} className="snap-start shrink-0 w-[260px]">
                  <CourseCardV2
                    course={c}
                    state="available"
                    recommended
                    busy={busy === c.id}
                    studentLevel={studentLevel}
                    onAdd={() => enroll(c.id)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <ChangeLevelSheet open={levelSheetOpen} onOpenChange={setLevelSheetOpen} />
    </div>
  );
};

export default MyCourses;
