import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Flame,
  ArrowRight,
  Target,
  BookOpen,
  Sparkles,
  FileText,
  Brain,
  Trophy,
  CheckCircle2,
  GraduationCap,
  Award,
  TrendingUp,
  Play,
  CalendarRange,
  Search,
  X,
  Clock,
  ExternalLink,
  FolderOpen,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { useReadinessAll } from "@/hooks/useIntelligence";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useProfileStats } from "@/hooks/useProfileStats";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import {
  resolveCourseSemester,
  type AcademicSemester,
} from "@/lib/cleanSlateManager";

import {
  CourseRow,
  CourseRowSkeleton,
  EmptyCourses,
} from "@/components/dashboard/mobile/CourseRow";

interface ServerMaterialItem {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  semester?: "1st" | "2nd";
  title: string;
  description?: string | null;
  material_type?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  content_markdown?: string | null;
  created_at?: string;
}

interface ServerQuizItem {
  id: string;
  course_id: string;
  course_code?: string;
  course_name?: string;
  semester?: "1st" | "2nd";
  title: string;
  description?: string;
  duration_minutes?: number;
  passing_score?: number;
  question_count?: number;
  questions?: unknown[];
  created_at?: string;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Student Dashboard — Precision Academic Ledger
 * Warm Alabaster (#FAF8F5) canvas, Crisp Paper (#FFFFFF) cards,
 * Deep Charcoal (#18181B) authority surfaces, and Academic Gold (#D4AF37) accents.
 * Structured around 1st Semester (Harmattan) & 2nd Semester (Rain) courses,
 * live uploaded handouts/PDFs, and published bulk CBT exams.
 */
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { institution } = useEnvironment();
  const { level: scopeLevel, department: scopeDept } = useStudentScope();
  const { data: profileStats } = useProfileStats(user?.id);

  const [semesterFilter, setSemesterFilter] = useState<"all" | AcademicSemester>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCourses, setShowAllCourses] = useState(false);

  const { data: courses = [], isLoading: coursesLoading } = useCourseSnapshots();
  const { data: readiness = [], isLoading: readinessLoading } = useReadinessAll();

  // Fetch live uploaded materials from /api/materials + Supabase study_materials
  const { data: liveMaterials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ["student-dashboard-materials", courses.length],
    staleTime: 10_000,
    queryFn: async (): Promise<ServerMaterialItem[]> => {
      const [apiRes, dbRes] = await Promise.all([
        fetch("/api/materials")
          .then((r) => (r.ok ? r.json() : { materials: [] }))
          .catch(() => ({ materials: [] })),
        supabase
          .from("study_materials")
          .select("id, course_id, title, description, material_type, file_url, file_name, file_size, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      const byId = new Map<string, ServerMaterialItem>();
      const serverList: ServerMaterialItem[] = Array.isArray(apiRes?.materials)
        ? apiRes.materials
        : [];

      for (const item of serverList) {
        if (!item || !item.id) continue;
        byId.set(item.id, item);
      }

      for (const row of (dbRes.data ?? []) as any[]) {
        if (!row || !row.id || byId.has(row.id)) continue;
        byId.set(row.id, {
          id: row.id,
          course_id: row.course_id,
          title: row.title || "Course Handout",
          description: row.description,
          material_type: row.material_type || "pdf",
          file_url: row.file_url,
          file_name: row.file_name,
          file_size: row.file_size,
          created_at: row.created_at,
        });
      }

      return Array.from(byId.values()).sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || ""))
      );
    },
  });

  // Fetch live published bulk CBT quizzes from /api/quizzes + Supabase quizzes
  const { data: liveQuizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["student-dashboard-quizzes", courses.length],
    staleTime: 10_000,
    queryFn: async (): Promise<ServerQuizItem[]> => {
      const [apiRes, dbRes] = await Promise.all([
        fetch("/api/quizzes")
          .then((r) => (r.ok ? r.json() : { quizzes: [] }))
          .catch(() => ({ quizzes: [] })),
        supabase
          .from("quizzes")
          .select("id, course_id, title, description, duration_minutes, passing_score, created_at")
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const byId = new Map<string, ServerQuizItem>();
      const serverList: ServerQuizItem[] = Array.isArray(apiRes?.quizzes)
        ? apiRes.quizzes
        : [];

      for (const q of serverList) {
        if (!q || !q.id) continue;
        byId.set(q.id, {
          ...q,
          question_count:
            q.question_count ?? (Array.isArray(q.questions) ? q.questions.length : 0),
        });
      }

      for (const row of (dbRes.data ?? []) as any[]) {
        if (!row || !row.id || byId.has(row.id)) continue;
        byId.set(row.id, {
          id: row.id,
          course_id: row.course_id,
          title: row.title || "CBT Practice Paper",
          description: row.description || "",
          duration_minutes: row.duration_minutes || 30,
          passing_score: row.passing_score || 50,
          question_count: 25,
          created_at: row.created_at,
        });
      }

      return Array.from(byId.values()).sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || ""))
      );
    },
  });

  // Fetch topic progress per course
  const courseIdsKey = useMemo(
    () => courses.map((c) => c.id).sort().join(","),
    [courses]
  );

  const { data: courseTopicProgress = {} } = useQuery({
    queryKey: ["dashboard-course-topic-progress", user?.id, courseIdsKey],
    enabled: !!user && courses.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const courseIds = courses.map((c) => c.id);
      const [{ data: topics }, { data: progress }] = await Promise.all([
        supabase
          .from("topics")
          .select("id, course_id")
          .in("course_id", courseIds),
        supabase
          .from("user_topic_progress")
          .select("course_id, topic_id, is_completed, mastery_score")
          .eq("user_id", user!.id)
          .in("course_id", courseIds),
      ]);

      const map: Record<
        string,
        { completed: number; total: number; percent: number }
      > = {};

      for (const cid of courseIds) {
        map[cid] = { completed: 0, total: 0, percent: 0 };
      }

      for (const t of topics ?? []) {
        if (t.course_id && map[t.course_id]) {
          map[t.course_id].total += 1;
        }
      }

      for (const p of progress ?? []) {
        if (
          p.course_id &&
          map[p.course_id] &&
          (p.is_completed || (p.mastery_score ?? 0) >= 60)
        ) {
          map[p.course_id].completed += 1;
        }
      }

      for (const cid of courseIds) {
        const entry = map[cid];
        if (entry.total > 0) {
          entry.percent = Math.min(
            100,
            Math.round((entry.completed / entry.total) * 100)
          );
        }
      }

      return map;
    },
  });

  // Lookup map of course metadata by ID
  const courseMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        code: string;
        name: string;
        department: string | null;
        level: string | null;
        semester: AcademicSemester;
      }
    >();
    for (const c of courses) {
      map.set(c.id, {
        id: c.id,
        code: c.code,
        name: c.name,
        department: c.department,
        level: c.level,
        semester:
          c.semester ||
          resolveCourseSemester({
            code: c.code,
            description: c.description,
            semester: c.semester,
          }),
      });
    }
    return map;
  }, [courses]);

  // Aggregate material & quiz counts per course
  const contentCountsByCourse = useMemo(() => {
    const map: Record<
      string,
      { materialsCount: number; quizzesCount: number; questionsCount: number }
    > = {};

    for (const c of courses) {
      map[c.id] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
    }

    for (const m of liveMaterials) {
      if (!m.course_id) continue;
      if (!map[m.course_id]) {
        map[m.course_id] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
      }
      map[m.course_id].materialsCount += 1;
    }

    for (const q of liveQuizzes) {
      if (!q.course_id) continue;
      if (!map[q.course_id]) {
        map[q.course_id] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
      }
      map[q.course_id].quizzesCount += 1;
      map[q.course_id].questionsCount +=
        q.question_count ?? (Array.isArray(q.questions) ? q.questions.length : 0);
    }

    return map;
  }, [courses, liveMaterials, liveQuizzes]);

  // Semester course counts
  const semesterCounts = useMemo(() => {
    let first = 0;
    let second = 0;
    for (const c of courses) {
      const sem =
        c.semester ||
        resolveCourseSemester({
          code: c.code,
          description: c.description,
          semester: c.semester,
        });
      if (sem === "1st") first += 1;
      else second += 1;
    }
    return { all: courses.length, first, second };
  }, [courses]);

  // Filtered courses based on selected semester and search query
  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      const sem =
        c.semester ||
        resolveCourseSemester({
          code: c.code,
          description: c.description,
          semester: c.semester,
        });
      if (semesterFilter !== "all" && sem !== semesterFilter) {
        return false;
      }
      if (q) {
        const hay = `${c.code} ${c.name} ${c.department || ""} ${c.level || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [courses, semesterFilter, searchQuery]);

  // Filtered materials for selected semester
  const filteredMaterials = useMemo(() => {
    return liveMaterials.filter((m) => {
      const linkedCourse = courseMap.get(m.course_id);
      const sem: AcademicSemester =
        m.semester ||
        linkedCourse?.semester ||
        resolveCourseSemester({
          code: m.course_code || linkedCourse?.code,
          semester: m.semester,
        });
      if (semesterFilter !== "all" && sem !== semesterFilter) return false;
      return true;
    });
  }, [liveMaterials, courseMap, semesterFilter]);

  // Filtered CBT quizzes for selected semester
  const filteredQuizzes = useMemo(() => {
    return liveQuizzes.filter((q) => {
      const linkedCourse = courseMap.get(q.course_id);
      const sem: AcademicSemester =
        q.semester ||
        linkedCourse?.semester ||
        resolveCourseSemester({
          code: q.course_code || linkedCourse?.code,
          semester: q.semester,
        });
      if (semesterFilter !== "all" && sem !== semesterFilter) return false;
      return true;
    });
  }, [liveQuizzes, courseMap, semesterFilter]);

  const totalFilteredQuestions = useMemo(
    () =>
      filteredQuizzes.reduce(
        (acc, q) =>
          acc +
          (q.question_count ??
            (Array.isArray(q.questions) ? q.questions.length : 0)),
        0
      ),
    [filteredQuizzes]
  );

  const firstName = useMemo(() => {
    const raw =
      profile?.full_name ||
      user?.email?.split("@")[0] ||
      "Scholar";
    return raw.trim().split(/\s+/)[0];
  }, [profile?.full_name, user?.email]);

  const readinessByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of readiness) {
      if (r.course_id && typeof r.readiness === "number") {
        map[r.course_id] = Math.round(r.readiness);
      }
    }
    return map;
  }, [readiness]);

  const overallReadiness = useMemo(() => {
    if (readiness.length > 0) {
      const avg =
        readiness.reduce((a, b) => a + (b.readiness || 0), 0) /
        readiness.length;
      return Math.round(avg);
    }
    return null;
  }, [readiness]);

  // Primary focus course in the active semester view (prioritize courses with uploaded materials/quizzes)
  const focusCourse = useMemo(() => {
    const pool = filteredCourses.length > 0 ? filteredCourses : courses;
    if (pool.length === 0) return null;

    // Sort by courses that have newly uploaded materials or CBT quizzes first
    const sorted = [...pool].sort((a, b) => {
      const aCounts = contentCountsByCourse[a.id] || {
        materialsCount: 0,
        quizzesCount: 0,
      };
      const bCounts = contentCountsByCourse[b.id] || {
        materialsCount: 0,
        quizzesCount: 0,
      };
      const aScore = aCounts.materialsCount * 2 + aCounts.quizzesCount * 3;
      const bScore = bCounts.materialsCount * 2 + bCounts.quizzesCount * 3;
      return bScore - aScore;
    });

    const top = sorted[0];
    const visual = getAutomaticCourseImage({
      id: top.id,
      code: top.code,
      name: top.name,
      department: top.department,
    });
    const counts = contentCountsByCourse[top.id] || {
      materialsCount: 0,
      quizzesCount: 0,
      questionsCount: 0,
    };
    const sem =
      top.semester ||
      resolveCourseSemester({
        code: top.code,
        description: top.description,
        semester: top.semester,
      });

    return {
      ...top,
      semester: sem,
      visual,
      counts,
    };
  }, [filteredCourses, courses, contentCountsByCourse]);

  // Preload hero image
  useEffect(() => {
    if (!focusCourse?.visual?.imageUrl) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = focusCourse.visual.imageUrl;
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(link);
      } catch {
        // ignore
      }
    };
  }, [focusCourse?.visual?.imageUrl]);

  const displayedCourses = useMemo(
    () => (showAllCourses ? filteredCourses : filteredCourses.slice(0, 6)),
    [filteredCourses, showAllCourses]
  );

  const isLoading = coursesLoading || readinessLoading;
  const streakCount =
    profileStats?.current_streak ?? (profile as any)?.streak_count ?? 0;
  const studentLevel = scopeLevel || (profile as any)?.level || "100";
  const studentDepartment =
    scopeDept || (profile as any)?.department || "General Studies";

  const overallTopicStats = useMemo(() => {
    let completed = 0;
    let total = 0;
    Object.values(courseTopicProgress).forEach((v) => {
      completed += v.completed;
      total += v.total;
    });
    const percent =
      total > 0
        ? Math.round((completed / total) * 100)
        : overallReadiness ?? 0;
    return { completed, total, percent };
  }, [courseTopicProgress, overallReadiness]);

  const dailyMission = useMemo(() => {
    if (focusCourse) {
      return {
        title: `Study ${focusCourse.code} — ${focusCourse.name}`,
        subtitle:
          focusCourse.counts.quizzesCount > 0
            ? `Review uploaded handouts and complete 1 timed CBT paper (${focusCourse.counts.questionsCount} past questions ready).`
            : "Read the uploaded course handouts & lecture notes to build exam mastery.",
        xpReward: 50,
        completed: false,
        ctaLabel:
          focusCourse.counts.quizzesCount > 0
            ? "Start CBT Paper"
            : "Read Course Notes",
        ctaPath:
          focusCourse.counts.quizzesCount > 0
            ? `/courses/${focusCourse.id}?tab=quizzes`
            : `/courses/${focusCourse.id}?tab=materials`,
      };
    }
    return {
      title: "Explore Your 1st & 2nd Semester Curriculum",
      subtitle:
        "Open a semester course to read lecture handouts and practice timed CBT exams.",
      xpReward: 50,
      completed: false,
      ctaLabel: "Open Courses",
      ctaPath: "/courses",
    };
  }, [focusCourse]);

  return (
    <>
      <SEO
        title="Student Study Dashboard"
        description="Your 1st & 2nd Semester academic workspace — read course handouts, practice topic drills, and take timed CBT exams."
        noindex
      />

      <div className="min-h-screen w-full bg-[#FAF8F5] dark:bg-background text-[#18181B] dark:text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:px-8 space-y-5">
          {/* 1. TOP ACADEMIC IDENTITY & SEMESTER SESSION BAR */}
          <header className="rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#18181B] text-[#D4AF37] text-[11px] font-bold tracking-tight">
                    <GraduationCap className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>{institution || "University Portal"}</span>
                  </span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#FAF8F5] border border-[#E6E0D4] text-[#18181B]">
                    {String(studentLevel).replace(/[^0-9]/g, "") || "100"}L
                  </span>
                  <span className="text-xs font-semibold text-[#71717A] truncate">
                    {studentDepartment}
                  </span>
                </div>

                <h1 className="mt-2 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-[#18181B] dark:text-foreground">
                  Welcome back, {firstName}
                </h1>
                <p className="text-xs text-[#52525B] mt-0.5">
                  Select your active semester below to access your uploaded course handouts, summary notes, and timed CBT exams.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                <div
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E6E0D4] dark:border-border bg-[#FAF8F5] dark:bg-card px-3 text-xs font-bold text-[#18181B] dark:text-foreground"
                  title={`${streakCount} day study streak`}
                >
                  <Flame
                    className={`h-4 w-4 ${
                      streakCount > 0
                        ? "text-[#D4AF37] fill-[#D4AF37]"
                        : "text-muted-foreground"
                    }`}
                  />
                  <span className="font-mono tabular-nums">{streakCount}d</span>
                  <span className="text-[11px] font-medium text-[#71717A] hidden sm:inline">
                    streak
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] px-3.5 text-xs font-bold text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Course Catalogue</span>
                </button>
              </div>
            </div>

            {/* Prominent 1st Semester & 2nd Semester Session Switcher */}
            <div className="pt-3.5 border-t border-[#EFECE6] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-[#9A7B1C] shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#52525B]">
                  Academic Session View:
                </span>
              </div>

              <div className="grid grid-cols-3 sm:inline-flex p-1 rounded-xl bg-[#FAF8F5] border border-[#E6E0D4] gap-1">
                <button
                  type="button"
                  onClick={() => setSemesterFilter("all")}
                  className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    semesterFilter === "all"
                      ? "bg-[#18181B] text-[#FAF8F5] shadow-2xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  <span>All Semesters</span>
                  <span
                    className={`font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                      semesterFilter === "all"
                        ? "bg-[#D4AF37] text-[#18181B]"
                        : "bg-[#EFECE6] text-[#52525B]"
                    }`}
                  >
                    {semesterCounts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSemesterFilter("1st")}
                  className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    semesterFilter === "1st"
                      ? "bg-[#18181B] text-[#D4AF37] shadow-2xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  <span>1st Semester</span>
                  <span className="hidden lg:inline text-[10px] font-normal opacity-80">
                    (Harmattan)
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                      semesterFilter === "1st"
                        ? "bg-[#D4AF37] text-[#18181B]"
                        : "bg-[#EFECE6] text-[#52525B]"
                    }`}
                  >
                    {semesterCounts.first}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSemesterFilter("2nd")}
                  className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    semesterFilter === "2nd"
                      ? "bg-[#18181B] text-[#D4AF37] shadow-2xs"
                      : "text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  <span>2nd Semester</span>
                  <span className="hidden lg:inline text-[10px] font-normal opacity-80">
                    (Rain)
                  </span>
                  <span
                    className={`font-mono tabular-nums text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                      semesterFilter === "2nd"
                        ? "bg-[#D4AF37] text-[#18181B]"
                        : "bg-[#EFECE6] text-[#52525B]"
                    }`}
                  >
                    {semesterCounts.second}
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* 2. 4-COLUMN ACADEMIC LEDGER STRIP */}
          <section
            aria-label="Academic Session Metrics"
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            <div
              onClick={() => navigate("/courses")}
              className="rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-2xs hover:border-[#D4AF37] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  {semesterFilter === "all"
                    ? "Session Courses"
                    : `${semesterFilter} Sem Courses`}
                </span>
                <BookOpen className="w-4 h-4 text-[#9A7B1C]" />
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[#18181B]">
                {filteredCourses.length}
              </p>
              <p className="mt-1 text-[11px] text-[#71717A] font-medium">
                <span className="font-mono font-bold text-[#18181B]">
                  {semesterCounts.first}
                </span>{" "}
                1st Sem ·{" "}
                <span className="font-mono font-bold text-[#18181B]">
                  {semesterCounts.second}
                </span>{" "}
                2nd Sem
              </p>
            </div>

            <div
              onClick={() => navigate("/study-hub")}
              className="rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-2xs hover:border-[#D4AF37] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  Handouts &amp; Notes
                </span>
                <FileText className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[#18181B]">
                {filteredMaterials.length}
              </p>
              <p className="mt-1 text-[11px] text-[#71717A] font-medium">
                Uploaded PDFs, docs &amp; lecture notes
              </p>
            </div>

            <div
              onClick={() =>
                focusCourse
                  ? navigate(`/courses/${focusCourse.id}?tab=quizzes`)
                  : navigate("/quiz")
              }
              className="rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-2xs hover:border-[#D4AF37] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  Published CBT Papers
                </span>
                <Target className="w-4 h-4 text-[#9A7B1C]" />
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[#18181B]">
                {filteredQuizzes.length}
              </p>
              <p className="mt-1 text-[11px] text-[#71717A] font-medium">
                <span className="font-mono font-bold text-[#18181B]">
                  {totalFilteredQuestions}
                </span>{" "}
                past questions ready
              </p>
            </div>

            <div
              onClick={() => navigate("/exam-readiness")}
              className="rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-2xs hover:border-[#D4AF37] transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                  Exam Readiness
                </span>
                <TrendingUp className="w-4 h-4 text-[#9A7B1C]" />
              </div>
              <p className="mt-2 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums text-[#18181B]">
                {overallTopicStats.percent}%
              </p>
              <p className="mt-1 text-[11px] text-[#71717A] font-medium">
                {overallTopicStats.total > 0
                  ? `${overallTopicStats.completed}/${overallTopicStats.total} topics mastered`
                  : "Complete CBT drills to raise score"}
              </p>
            </div>
          </section>

          {/* 3. HERO SEMESTER FOCUS BANNER */}
          <section aria-label="Primary Semester Course Focus">
            {isLoading ? (
              <div className="h-56 w-full rounded-3xl border border-[#E6E0D4] bg-white p-6 animate-pulse flex flex-col justify-between">
                <div className="h-4 w-36 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-7 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-11 w-48 rounded-xl bg-muted" />
              </div>
            ) : focusCourse ? (
              <div className="relative overflow-hidden rounded-3xl border border-[#18181B] bg-[#18181B] text-white shadow-md">
                <img
                  src={focusCourse.visual.imageUrl}
                  alt={focusCourse.name}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== focusCourse.visual.fallbackUrl) {
                      target.src = focusCourse.visual.fallbackUrl;
                    }
                  }}
                  className="
                    pointer-events-none select-none
                    absolute inset-y-0 right-0 h-full w-full sm:w-3/5
                    object-cover object-center
                    opacity-30 sm:opacity-45
                    [mask-image:linear-gradient(to_left,black_30%,transparent_95%)]
                  "
                  loading="eager"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#18181B] via-[#18181B]/95 to-[#18181B]/45"
                  aria-hidden
                />

                <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-between gap-5 max-w-2xl">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4AF37] px-2.5 py-1 text-[11px] font-extrabold text-[#18181B]">
                        <CalendarRange className="h-3 w-3" />
                        <span>
                          {focusCourse.semester === "1st"
                            ? "1st Semester (Harmattan)"
                            : "2nd Semester (Rain)"}
                        </span>
                      </span>

                      <span className="font-mono text-xs font-extrabold text-[#F5D77F] bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
                        {focusCourse.code}
                      </span>

                      {focusCourse.counts.materialsCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-lg">
                          <FileText className="w-3 h-3" />
                          <span>
                            {focusCourse.counts.materialsCount}{" "}
                            {focusCourse.counts.materialsCount === 1
                              ? "Handout"
                              : "Handouts"}
                          </span>
                        </span>
                      )}

                      {focusCourse.counts.quizzesCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#F5D77F] bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-2.5 py-1 rounded-lg">
                          <Target className="w-3 h-3 text-[#D4AF37]" />
                          <span>
                            {focusCourse.counts.quizzesCount} CBT{" "}
                            {focusCourse.counts.quizzesCount === 1
                              ? "Paper"
                              : "Papers"}
                          </span>
                        </span>
                      )}
                    </div>

                    <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-white leading-snug">
                      {focusCourse.name}
                    </h2>

                    <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-xl">
                      Start with <strong className="text-[#F5D77F]">Step 1: Handouts &amp; Summary Notes</strong> to study the uploaded course documents, then test your speed in <strong className="text-[#F5D77F]">Step 3: Timed CBT Exam Simulation</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/courses/${focusCourse.id}?tab=materials`)
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#e0bd42] px-5 text-xs sm:text-sm font-extrabold text-[#18181B] shadow-sm transition-all cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>1. Read Handouts &amp; Notes</span>
                      {focusCourse.counts.materialsCount > 0 && (
                        <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#18181B] text-[#D4AF37]">
                          {focusCourse.counts.materialsCount}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/courses/${focusCourse.id}?tab=quizzes`)
                      }
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 px-4 text-xs sm:text-sm font-bold text-white transition-colors cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current text-[#D4AF37]" />
                      <span>2. Start Timed CBT Exam</span>
                      {focusCourse.counts.quizzesCount > 0 && (
                        <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-[#D4AF37] text-[#18181B] font-extrabold">
                          {focusCourse.counts.quizzesCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#E6E0D4] bg-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
                <div className="space-y-1.5 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#FAF8F5] border border-[#E6E0D4] px-2.5 py-1 text-[11px] font-bold text-[#9A7B1C]">
                    <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>Academic Session Ready</span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#18181B]">
                    Your semester workspace is ready for courses &amp; materials
                  </h2>
                  <p className="text-xs sm:text-sm text-[#52525B] leading-relaxed">
                    As soon as 1st and 2nd Semester courses, lecture handouts, or bulk CBT past questions are uploaded, they will appear right here automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/courses")}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#18181B] px-5 text-xs sm:text-sm font-extrabold text-[#F5D77F] shrink-0 cursor-pointer"
                >
                  <span>Browse Curriculum</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* 4. SEMESTER COURSES & LIVE PROGRESS LEDGER */}
          <section aria-label="Semester Courses" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base sm:text-lg font-extrabold text-[#18181B] dark:text-foreground flex items-center gap-2">
                  <span>
                    {semesterFilter === "all"
                      ? "1st & 2nd Semester Courses"
                      : semesterFilter === "1st"
                      ? "1st Semester (Harmattan) Courses"
                      : "2nd Semester (Rain) Courses"}
                  </span>
                  <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-[#18181B] text-[#D4AF37]">
                    {filteredCourses.length}
                  </span>
                </h2>
                <p className="text-xs text-[#71717A]">
                  Tap <strong className="text-[#18181B]">Notes</strong> for uploaded PDFs &amp; lecture handouts or <strong className="text-[#18181B]">CBT</strong> for timed past-question exams.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Inline Quick Search */}
                <div className="relative w-full sm:w-60">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#71717A]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter course code or title..."
                    className="h-9 w-full rounded-xl border border-[#E6E0D4] bg-white pl-8 pr-7 text-xs text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#D4AF37]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#18181B] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/courses")}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-[#E6E0D4] bg-white hover:border-[#D4AF37] text-xs font-bold text-[#18181B] shrink-0 cursor-pointer"
                >
                  <span>Full Hub</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#9A7B1C]" />
                </button>
              </div>
            </div>

            {coursesLoading ? (
              <div className="space-y-2.5">
                <CourseRowSkeleton />
                <CourseRowSkeleton />
                <CourseRowSkeleton />
              </div>
            ) : filteredCourses.length === 0 ? (
              <EmptyCourses />
            ) : (
              <div className="space-y-2.5">
                {displayedCourses.map((c) => {
                  const topicStats = courseTopicProgress[c.id];
                  const counts = contentCountsByCourse[c.id] || {
                    materialsCount: 0,
                    quizzesCount: 0,
                    questionsCount: 0,
                  };
                  return (
                    <CourseRow
                      key={c.id}
                      id={c.id}
                      code={c.code}
                      name={c.name}
                      department={c.department}
                      level={c.level}
                      description={c.description}
                      semester={c.semester}
                      unreadUpdates={c.unread_updates}
                      readinessScore={readinessByCourse[c.id] ?? null}
                      progressPercent={
                        topicStats && topicStats.total > 0
                          ? topicStats.percent
                          : readinessByCourse[c.id] ?? 0
                      }
                      completedTopics={topicStats?.completed ?? 0}
                      totalTopics={topicStats?.total ?? 0}
                      materialsCount={counts.materialsCount}
                      quizzesCount={counts.quizzesCount}
                      questionsCount={counts.questionsCount}
                    />
                  );
                })}

                {filteredCourses.length > 6 && (
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllCourses((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E6E0D4] bg-white hover:border-[#D4AF37] text-xs font-bold text-[#18181B] shadow-2xs cursor-pointer"
                    >
                      <span>
                        {showAllCourses
                          ? "Show Top 6 Courses"
                          : `Show All ${filteredCourses.length} Semester Courses`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#9A7B1C]" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 5. NEWLY UPLOADED HANDOUTS & PUBLISHED BULK CBT EXAMS */}
          <section
            aria-label="Uploaded Handouts and Published CBT Exams"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Panel A: Newly Uploaded Handouts & Lecture PDFs */}
            <div className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-[#EFECE6] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#18181B] text-[#D4AF37] grid place-items-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                        Uploaded Handouts &amp; Lecture PDFs
                      </h3>
                      <p className="text-[11px] text-[#71717A]">
                        Direct access to course documents, slides &amp; notes
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D4] text-[#18181B]">
                    {filteredMaterials.length}
                  </span>
                </div>

                {materialsLoading ? (
                  <div className="space-y-2">
                    <div className="h-14 rounded-xl bg-[#FAF8F5] animate-pulse" />
                    <div className="h-14 rounded-xl bg-[#FAF8F5] animate-pulse" />
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E6E0D4] bg-[#FAF8F5] p-6 text-center space-y-1.5">
                    <FolderOpen className="w-6 h-6 text-[#9A7B1C] mx-auto" />
                    <p className="text-xs font-bold text-[#18181B]">
                      No handouts uploaded for this semester view yet
                    </p>
                    <p className="text-[11px] text-[#71717A]">
                      Uploaded PDFs, Word handouts, and summary notes will appear here for 1-click reading.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMaterials.slice(0, 5).map((item) => {
                      const linkedCourse = courseMap.get(item.course_id);
                      const courseCode =
                        item.course_code || linkedCourse?.code || "COURSE";
                      const sem =
                        item.semester ||
                        linkedCourse?.semester ||
                        resolveCourseSemester({ code: courseCode });
                      const sizeLabel = formatBytes(item.file_size);

                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            navigate(`/courses/${item.course_id}?tab=materials`)
                          }
                          className="group flex items-center justify-between gap-3 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:bg-white hover:border-[#D4AF37] p-3 transition-all cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#18181B] text-[#D4AF37]">
                                {courseCode}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E6E0D4] text-[#52525B]">
                                {sem === "1st" ? "1st Sem" : "2nd Sem"}
                              </span>
                              <span className="font-mono text-[10px] uppercase text-[#9A7B1C] font-bold">
                                {item.material_type || "PDF"}
                              </span>
                              {sizeLabel && (
                                <span className="font-mono text-[10px] text-[#71717A]">
                                  · {sizeLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-[#18181B] truncate mt-1 group-hover:text-[#9A7B1C]">
                              {item.title}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.file_url && (
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-[#E6E0D4] bg-white hover:border-[#D4AF37] text-[11px] font-bold text-[#18181B]"
                                title="Open raw document in new tab"
                              >
                                <ExternalLink className="w-3 h-3 text-[#9A7B1C]" />
                                <span className="hidden sm:inline">PDF</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/courses/${item.course_id}?tab=materials`
                                );
                              }}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#18181B] text-[#F5D77F] text-[11px] font-bold cursor-pointer"
                            >
                              <span>Study</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate("/study-hub")}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
              >
                <span>Open Full Study Materials Library</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9A7B1C]" />
              </button>
            </div>

            {/* Panel B: Newly Published Bulk CBT Exams */}
            <div className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-[#EFECE6] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-[#18181B] grid place-items-center shrink-0">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                        Published CBT Exams &amp; Past Papers
                      </h3>
                      <p className="text-[11px] text-[#71717A]">
                        Timed computer-based practice sets with instant grading
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D4] text-[#18181B]">
                    {filteredQuizzes.length}
                  </span>
                </div>

                {quizzesLoading ? (
                  <div className="space-y-2">
                    <div className="h-14 rounded-xl bg-[#FAF8F5] animate-pulse" />
                    <div className="h-14 rounded-xl bg-[#FAF8F5] animate-pulse" />
                  </div>
                ) : filteredQuizzes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E6E0D4] bg-[#FAF8F5] p-6 text-center space-y-1.5">
                    <Target className="w-6 h-6 text-[#9A7B1C] mx-auto" />
                    <p className="text-xs font-bold text-[#18181B]">
                      No CBT papers published for this semester view yet
                    </p>
                    <p className="text-[11px] text-[#71717A]">
                      Bulk past-question sets and AI-generated CBT exams will appear here for 1-click simulation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredQuizzes.slice(0, 5).map((quiz) => {
                      const linkedCourse = courseMap.get(quiz.course_id);
                      const courseCode =
                        quiz.course_code || linkedCourse?.code || "COURSE";
                      const sem =
                        quiz.semester ||
                        linkedCourse?.semester ||
                        resolveCourseSemester({ code: courseCode });
                      const qCount =
                        quiz.question_count ??
                        (Array.isArray(quiz.questions)
                          ? quiz.questions.length
                          : 0);

                      return (
                        <div
                          key={quiz.id}
                          onClick={() =>
                            navigate(
                              `/quiz/cbt/${quiz.course_id}?quizId=${quiz.id}`
                            )
                          }
                          className="group flex items-center justify-between gap-3 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:bg-white hover:border-[#D4AF37] p-3 transition-all cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[#18181B] text-[#D4AF37]">
                                {courseCode}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#E6E0D4] text-[#52525B]">
                                {sem === "1st" ? "1st Sem" : "2nd Sem"}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-[#9A7B1C]">
                                {qCount} Questions
                              </span>
                              <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-[#71717A]">
                                <Clock className="w-2.5 h-2.5" />
                                {quiz.duration_minutes || 30}m
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-[#18181B] truncate mt-1 group-hover:text-[#9A7B1C]">
                              {quiz.title}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/quiz/cbt/${quiz.course_id}?quizId=${quiz.id}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#18181B] hover:bg-[#27272A] text-[#F5D77F] text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current text-[#D4AF37]" />
                            <span>Start CBT</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  focusCourse
                    ? navigate(`/courses/${focusCourse.id}?tab=quizzes`)
                    : navigate("/quiz")
                }
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
              >
                <span>View All CBT Practice Papers</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#9A7B1C]" />
              </button>
            </div>
          </section>

          {/* 6. 3-STEP STUDY HUB QUICK ACCESS */}
          <section aria-label="Study Hub & Practice Tools" className="space-y-2.5">
            <div>
              <h2 className="font-display text-base font-extrabold text-[#18181B] dark:text-foreground">
                3-Step Semester Mastery Tools
              </h2>
              <p className="text-xs text-[#71717A]">
                Everything you need to study handouts, generate flashcards, and ace your university CBT exams
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  focusCourse
                    ? navigate(`/courses/${focusCourse.id}?tab=materials`)
                    : navigate("/study-hub")
                }
                className="group flex items-start gap-3.5 rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-4 text-left transition-all hover:border-[#D4AF37] shadow-2xs cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#18181B] text-[#D4AF37]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#9A7B1C]">
                      Step 1 · Read
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#71717A] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="font-display text-sm font-extrabold text-[#18181B] dark:text-foreground mt-0.5">
                    Summary Notes &amp; PDFs
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">
                    Read uploaded course handouts, lecture notes, and key formula sheets.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate("/flashcards")}
                className="group flex items-start gap-3.5 rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-4 text-left transition-all hover:border-[#D4AF37] shadow-2xs cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF0D6] text-[#9A7B1C]">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#9A7B1C]">
                      Step 2 · Recall
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#71717A] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="font-display text-sm font-extrabold text-[#18181B] dark:text-foreground mt-0.5">
                    Flashcards &amp; Topic Drills
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">
                    Memorize definitions, theorems, and course concepts with active recall.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  focusCourse
                    ? navigate(`/courses/${focusCourse.id}?tab=quizzes`)
                    : navigate("/quiz")
                }
                className="group flex items-start gap-3.5 rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-4 text-left transition-all hover:border-[#D4AF37] shadow-2xs cursor-pointer"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D4AF37] text-[#18181B]">
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-extrabold uppercase tracking-wider text-[#9A7B1C]">
                      Step 3 · Test
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#71717A] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="font-display text-sm font-extrabold text-[#18181B] dark:text-foreground mt-0.5">
                    Timed CBT Simulator
                  </p>
                  <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">
                    Practice real exam timing with instant explanations and score breakdown.
                  </p>
                </div>
              </button>
            </div>
          </section>

          {/* 7. DAILY ACADEMIC MISSION & LEADERBOARD */}
          <section aria-label="Daily Mission" className="pt-1">
            <div className="rounded-2xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#18181B] text-[#D4AF37]">
                  {dailyMission.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Award className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#9A7B1C]">
                      Today&apos;s Study Goal
                    </span>
                    <span className="inline-flex items-center rounded-md bg-[#FAF0D6] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#9A7B1C]">
                      +{dailyMission.xpReward} XP
                    </span>
                  </div>
                  <p className="mt-0.5 font-display text-sm font-extrabold text-[#18181B] dark:text-foreground truncate">
                    {dailyMission.title}
                  </p>
                  <p className="text-xs text-[#71717A] truncate">
                    {dailyMission.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => navigate("/leaderboard")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] px-3 text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
                >
                  <Trophy className="h-3.5 w-3.5 text-[#D4AF37]" />
                  <span>Leaderboard</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(dailyMission.ctaPath)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#18181B] px-4 text-xs font-bold text-[#F5D77F] hover:bg-[#27272A] transition-colors cursor-pointer"
                >
                  <span>{dailyMission.ctaLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
