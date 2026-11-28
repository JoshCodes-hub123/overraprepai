import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LayoutGrid, List } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { useReadinessAll, useTodayMission, useWeeklyReport } from "@/hooks/useIntelligence";
import { useOpportunities } from "@/hooks/useOpportunities";
import { usePosts } from "@/hooks/usePosts";
import { useRecommendedTutors } from "@/hooks/useRecommendedTutors";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { resolveCourseSemester, type AcademicSemester } from "@/lib/cleanSlateManager";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import {
  isUuid,
  courseCodeToDeterministicUuid,
  normalizeCourseCode,
} from "@/lib/courseIdentity";

import { Screen, Section } from "@/components/ui-kit";
import { BrandTopBar } from "@/components/dashboard/mobile/BrandTopBar";
import { DashboardOfflineBanner } from "@/components/dashboard/DashboardOfflineBanner";
import { DashboardSearch } from "@/components/dashboard/mobile/DashboardSearch";
import { DailyCheckIn } from "@/components/student/dashboard/DailyCheckIn";
import { NextStepHero } from "@/components/dashboard/mobile/NextStepHero";
import { QuickAccess, quickAccessItems } from "@/components/dashboard/mobile/QuickAccess";
import {
  CourseCoverCard,
  CourseCoverCardSkeleton,
} from "@/components/dashboard/CourseCoverCard";
import {
  CourseRow,
  CourseRowSkeleton,
  EmptyCourses,
} from "@/components/dashboard/mobile/CourseRow";
import {
  StudySpotlightStrip,
  type SpotlightItem,
} from "@/components/dashboard/StudySpotlightStrip";
import { ProgressCards } from "@/components/dashboard/mobile/ProgressCards";
import { MissionBlock, type Mission } from "@/components/dashboard/mobile/MissionBlock";
import { WeeklyPulse } from "@/components/dashboard/mobile/WeeklyPulse";
import { AskOverraBlock } from "@/components/dashboard/mobile/AskOverraBlock";
import { OpportunityStrip } from "@/components/dashboard/mobile/OpportunityStrip";
import { TopArticlesStrip } from "@/components/dashboard/mobile/TopArticlesStrip";
import { TutorStrip } from "@/components/dashboard/mobile/TutorStrip";

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

interface ServerMaterialMeta {
  id: string;
  course_id: string;
  title?: string;
  course_code?: string | null;
  file_type?: string | null;
}

interface ServerQuizMeta {
  id: string;
  course_id: string;
  title?: string;
  course_code?: string | null;
  question_count?: number;
  questions?: unknown[];
}

export default function StudentDashboard() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { institution } = useEnvironment();
  const { level: studentLevel, department: studentDept } = useStudentScope();
  const { preferences } = useDashboardPreferences();

  const [semesterFilter, setSemesterFilter] = useState<"all" | AcademicSemester>("all");
  const [courseViewMode, setCourseViewMode] = useState<"grid" | "list">("grid");

  const { data: courses = [], isLoading: coursesLoading, refetch: refetchCourses } =
    useCourseSnapshots();
  const { data: readiness = [] } = useReadinessAll();
  const { data: mission } = useTodayMission();
  const { data: weekly } = useWeeklyReport();
  const { data: opportunities = [] } = useOpportunities({ limit: 8 });
  const { data: articles = [] } = usePosts({ type: "article", limit: 8 });
  const { data: tutors = [] } = useRecommendedTutors(8);

  // Sync live uploaded materials & published CBT quizzes for per-course counts and spotlight covers
  const { data: liveMaterials = [] } = useQuery({
    queryKey: ["dashboard-materials-meta", courses.length],
    staleTime: 15_000,
    queryFn: async (): Promise<ServerMaterialMeta[]> => {
      const [apiRes, dbRes, notesRes] = await Promise.all([
        fetch("/api/materials")
          .then((r) => (r.ok ? r.json() : { materials: [] }))
          .catch(() => ({ materials: [] })),
        supabase
          .from("study_materials")
          .select("id, course_id, title, file_type")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("lecture_notes")
          .select("id, course_id, title, file_type")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      const byId = new Map<string, ServerMaterialMeta>();
      for (const m of Array.isArray(apiRes?.materials) ? apiRes.materials : []) {
        if (m?.id && m?.course_id) {
          byId.set(m.id, {
            id: m.id,
            course_id: m.course_id,
            title: m.title,
            course_code: m.course_code ?? null,
            file_type: m.file_type ?? "pdf",
          });
        }
      }
      for (const row of [...((dbRes.data ?? []) as any[]), ...((notesRes.data ?? []) as any[])]) {
        if (row?.id && row?.course_id && !byId.has(row.id)) {
          byId.set(row.id, {
            id: row.id,
            course_id: row.course_id,
            title: row.title,
            file_type: row.file_type ?? "pdf",
          });
        }
      }
      return Array.from(byId.values());
    },
  });

  const { data: liveQuizzes = [] } = useQuery({
    queryKey: ["dashboard-quizzes-meta", courses.length],
    staleTime: 15_000,
    queryFn: async (): Promise<ServerQuizMeta[]> => {
      const [apiRes, dbRes] = await Promise.all([
        fetch("/api/quizzes")
          .then((r) => (r.ok ? r.json() : { quizzes: [] }))
          .catch(() => ({ quizzes: [] })),
        supabase
          .from("quizzes")
          .select("id, course_id, title, question_count")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(150),
      ]);
      const byId = new Map<string, ServerQuizMeta>();
      for (const q of Array.isArray(apiRes?.quizzes) ? apiRes.quizzes : []) {
        if (q?.id && q?.course_id) {
          byId.set(q.id, {
            id: q.id,
            course_id: q.course_id,
            title: q.title,
            course_code: q.course_code ?? null,
            question_count:
              q.question_count ?? (Array.isArray(q.questions) ? q.questions.length : 0),
          });
        }
      }
      for (const row of (dbRes.data ?? []) as any[]) {
        if (row?.id && row?.course_id && !byId.has(row.id)) {
          byId.set(row.id, {
            id: row.id,
            course_id: row.course_id,
            title: row.title,
            question_count: row.question_count ?? 0,
          });
        }
      }
      return Array.from(byId.values());
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
      const studentId = user?.id;
      if (!studentId || courses.length === 0) return {};

      const courseIds = courses.map((c) => c.id);
      const validCourseUuids = Array.from(
        new Set(
          courses
            .flatMap((c) => [
              isUuid(c.id) ? c.id : null,
              courseCodeToDeterministicUuid(c.code),
            ])
            .filter(Boolean) as string[]
        )
      );
      if (validCourseUuids.length === 0) return {};

      const uuidToCardId = new Map<string, string>();
      for (const c of courses) {
        uuidToCardId.set(c.id, c.id);
        const det = courseCodeToDeterministicUuid(c.code);
        if (det) uuidToCardId.set(det, c.id);
      }

      const [{ data: topics }, { data: progress }] = await Promise.all([
        supabase.from("topics").select("id, course_id").in("course_id", validCourseUuids),
        (supabase as any)
          .from("user_topic_progress")
          .select("course_id, topic_id, is_completed, mastery_score")
          .eq("user_id", studentId)
          .in("course_id", validCourseUuids),
      ]);

      const map: Record<string, { completed: number; total: number; percent: number }> = {};
      for (const cid of courseIds) map[cid] = { completed: 0, total: 0, percent: 0 };
      for (const t of topics ?? []) {
        const cardId = t.course_id ? uuidToCardId.get(t.course_id) : undefined;
        if (cardId && map[cardId]) map[cardId].total += 1;
      }
      for (const p of progress ?? []) {
        const cardId = p.course_id ? uuidToCardId.get(p.course_id) : undefined;
        if (cardId && map[cardId] && (p.is_completed || (p.mastery_score ?? 0) >= 60)) {
          map[cardId].completed += 1;
        }
      }
      for (const cid of courseIds) {
        const entry = map[cid];
        if (entry.total > 0) {
          entry.percent = Math.min(100, Math.round((entry.completed / entry.total) * 100));
        }
      }
      return map;
    },
  });

  const courseById = useMemo(() => {
    const map = new Map<string, (typeof courses)[number]>();
    for (const c of courses) {
      map.set(c.id, c);
      const det = courseCodeToDeterministicUuid(c.code);
      if (det && !map.has(det)) map.set(det, c);
      const norm = normalizeCourseCode(c.code);
      if (norm && !map.has(norm)) map.set(norm, c);
    }
    return map;
  }, [courses]);

  const contentCountsByCourse = useMemo(() => {
    const map: Record<
      string,
      { materialsCount: number; quizzesCount: number; questionsCount: number }
    > = {};
    for (const c of courses) {
      map[c.id] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
    }
    const resolveTargetCardId = (rawCourseId?: string | null, rawCode?: string | null) => {
      if (rawCourseId && map[rawCourseId]) return rawCourseId;
      const byDet = rawCourseId ? courseById.get(rawCourseId) : undefined;
      if (byDet) return byDet.id;
      const norm = normalizeCourseCode(rawCode);
      const byCode = norm ? courseById.get(norm) : undefined;
      if (byCode) return byCode.id;
      return rawCourseId || null;
    };

    for (const m of liveMaterials) {
      const targetId = resolveTargetCardId(m.course_id, m.course_code);
      if (!targetId) continue;
      if (!map[targetId]) {
        map[targetId] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
      }
      map[targetId].materialsCount += 1;
    }
    for (const q of liveQuizzes) {
      const targetId = resolveTargetCardId(q.course_id, q.course_code);
      if (!targetId) continue;
      if (!map[targetId]) {
        map[targetId] = { materialsCount: 0, quizzesCount: 0, questionsCount: 0 };
      }
      map[targetId].quizzesCount += 1;
      map[targetId].questionsCount += q.question_count ?? 0;
    }
    return map;
  }, [courses, courseById, liveMaterials, liveQuizzes]);

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

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (semesterFilter === "all") return true;
      const sem =
        c.semester ||
        resolveCourseSemester({
          code: c.code,
          description: c.description,
          semester: c.semester,
        });
      return sem === semesterFilter;
    });
  }, [courses, semesterFilter]);

  const readinessByCourse = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of readiness) {
      if (r.course_id && typeof r.readiness === "number") {
        map[r.course_id] = Math.round(r.readiness);
      }
    }
    return map;
  }, [readiness]);

  const primaryCourse = useMemo(() => {
    const pool = filteredCourses.length > 0 ? filteredCourses : courses;
    if (pool.length === 0) return null;
    const sorted = [...pool].sort((a, b) => {
      const aCounts = contentCountsByCourse[a.id] || { materialsCount: 0, quizzesCount: 0 };
      const bCounts = contentCountsByCourse[b.id] || { materialsCount: 0, quizzesCount: 0 };
      return (
        bCounts.materialsCount * 2 +
        bCounts.quizzesCount * 3 -
        (aCounts.materialsCount * 2 + aCounts.quizzesCount * 3)
      );
    });
    return sorted[0];
  }, [filteredCourses, courses, contentCountsByCourse]);

  const nextHero = useMemo(() => {
    if (primaryCourse) {
      const counts = contentCountsByCourse[primaryCourse.id] || {
        materialsCount: 0,
        quizzesCount: 0,
        questionsCount: 0,
      };
      const sem =
        primaryCourse.semester ||
        resolveCourseSemester({
          code: primaryCourse.code,
          description: primaryCourse.description,
          semester: primaryCourse.semester,
        });
      const cover = getAutomaticCourseImage({
        id: primaryCourse.id,
        code: primaryCourse.code,
        name: primaryCourse.name,
        department: primaryCourse.department,
      });
      return {
        eyebrow: "Your next step",
        kicker: `${primaryCourse.code} · ${sem === "1st" ? "1st Sem" : "2nd Sem"}`,
        title: cover.displayTitle || primaryCourse.name,
        context:
          counts.materialsCount > 0 || counts.quizzesCount > 0
            ? `${counts.materialsCount} uploaded handout${counts.materialsCount === 1 ? "" : "s"} & ${counts.quizzesCount} CBT paper${counts.quizzesCount === 1 ? "" : "s"} ready for practice.`
            : "Open this course to read summary notes, study key formulas, and take timed CBT drills.",
        cta: counts.quizzesCount > 0 ? "Open Notes & Materials" : "Open Course Materials",
        to: `/courses/${primaryCourse.id}?tab=materials`,
        coverImage: cover.imageUrl,
        fallbackImage: cover.fallbackUrl,
        secondaryCta: {
          label: counts.quizzesCount > 0 ? `Start CBT (${counts.quizzesCount})` : "Practice CBT",
          to: `/courses/${primaryCourse.id}?tab=quizzes`,
        },
      };
    }
    return {
      eyebrow: "Your next step",
      kicker: "Academic Hub",
      title: "Select your semester courses to begin",
      context:
        "Add your 1st & 2nd Semester courses to unlock uploaded lecture notes and timed CBT exams.",
      cta: "Browse Courses",
      to: "/courses",
      coverImage: "/images/courses/general.jpg",
      fallbackImage: "/images/courses/humanities.jpg",
      secondaryCta: {
        label: "Practice CBT Hub",
        to: "/practice",
      },
    };
  }, [primaryCourse, contentCountsByCourse]);

  // Build photographic spotlight items from freshly uploaded CBT quizzes & lecture handouts
  const spotlightItems = useMemo<SpotlightItem[]>(() => {
    const items: SpotlightItem[] = [];
    const enrolledIds = new Set(courses.map((c) => c.id));

    const prioritizedQuizzes = [...liveQuizzes].sort((a, b) => {
      const aMine = enrolledIds.has(a.course_id) ? 1 : 0;
      const bMine = enrolledIds.has(b.course_id) ? 1 : 0;
      return bMine - aMine;
    });

    const prioritizedMaterials = [...liveMaterials].sort((a, b) => {
      const aMine = enrolledIds.has(a.course_id) ? 1 : 0;
      const bMine = enrolledIds.has(b.course_id) ? 1 : 0;
      return bMine - aMine;
    });

    for (const q of prioritizedQuizzes.slice(0, 4)) {
      if (!q.title) continue;
      const matchedCourse = courseById.get(q.course_id);
      items.push({
        id: q.id,
        kind: "quiz",
        title: q.title,
        courseId: q.course_id,
        courseCode: q.course_code || matchedCourse?.code || null,
        metaLabel:
          q.question_count && q.question_count > 0
            ? `${q.question_count} Questions · Timed CBT`
            : "Timed CBT Practice",
        to: `/quiz/${q.id}/cbt`,
      });
    }

    for (const m of prioritizedMaterials.slice(0, 4)) {
      if (!m.title) continue;
      const matchedCourse =
        courseById.get(m.course_id) ||
        (m.course_code ? courseById.get(normalizeCourseCode(m.course_code)) : undefined);
      const ext = (m.file_type || "PDF").toUpperCase();
      items.push({
        id: m.id,
        kind: "material",
        title: m.title,
        courseId: matchedCourse?.id || m.course_id,
        courseCode: m.course_code || matchedCourse?.code || null,
        metaLabel: `${ext} Study Material`,
        to: `/courses/${matchedCourse?.id || m.course_id}?tab=materials`,
      });
    }

    return items.slice(0, 8);
  }, [courses, liveQuizzes, liveMaterials, courseById]);

  const missionTasks: Mission[] = useMemo(() => {
    if (mission?.tasks?.length) {
      return mission.tasks.slice(0, 3).map((t) => ({
        label: t.label,
        done: t.done,
        link: t.link,
        courseId: primaryCourse?.id,
      }));
    }
    return [
      {
        label: primaryCourse
          ? `Read uploaded notes in ${primaryCourse.code}`
          : "Open your course study materials",
        done: false,
        link: "materials",
        courseId: primaryCourse?.id,
      },
      {
        label: "Complete 1 timed CBT practice session",
        done: false,
        link: "practice",
        courseId: primaryCourse?.id,
      },
      {
        label: "Review weak topics in Exam Readiness",
        done: false,
        link: "readiness",
        courseId: primaryCourse?.id,
      },
    ];
  }, [mission, primaryCourse]);

  const firstName = useMemo(() => {
    const raw = profile?.full_name || user?.email?.split("@")[0] || "Student";
    return raw.trim().split(/\s+/)[0];
  }, [profile?.full_name, user?.email]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchCourses(),
      queryClient.invalidateQueries({ queryKey: ["dashboard-materials-meta"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-quizzes-meta"] }),
    ]);
  };

  const quickItems = useMemo(
    () => quickAccessItems("Practice CBT", "Timed exam simulation"),
    []
  );

  return (
    <>
      <SEO
        title="Student Dashboard — OverraPrep AI"
        description="Your OverraPrep AI study home: courses, lecture materials, daily practice, and CBT exam simulation."
        noindex
      />

      <Screen className="lg:max-w-7xl">
        {/* Top Bar (Formal App Header with Drawer, Wallet, Notifications, Profile Menu) */}
        <BrandTopBar className="mb-3" />

        {/* Offline Rescue Banner */}
        <DashboardOfflineBanner
          onReattempt={handleRefresh}
          primaryCourseId={primaryCourse?.id}
          primaryCourseCode={primaryCourse?.code}
        />

        {/* Calm Academic Greeting — Unboxed editorial context metadata */}
        <section className="mb-5 pb-4 border-b border-border/70">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                {timeGreeting()}
              </p>
              <h1 className="font-display text-2xl sm:text-[30px] font-extrabold tracking-tight text-foreground mt-0.5 leading-tight">
                Welcome back, {firstName}
              </h1>
            </div>

            <Link
              to="/settings/academic"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1 min-h-[36px] self-start sm:self-auto"
            >
              <GraduationCap className="h-4 w-4 text-primary shrink-0" />
              <span className="font-bold text-foreground">{institution || "University"}</span>
              {studentLevel && (
                <>
                  <span aria-hidden="true" className="opacity-40">
                    ·
                  </span>
                  <span className="font-mono font-bold tabular-nums text-foreground">
                    {studentLevel}L
                  </span>
                </>
              )}
              {studentDept && (
                <span className="truncate max-w-[180px] sm:max-w-[220px]">
                  · {studentDept}
                </span>
              )}
            </Link>
          </div>
        </section>

        {/* Adaptive 12-Column Workspace: Single-Column Thumb Flow (<lg) -> 8+4 Editorial Workspace (lg+) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* PRIMARY STUDY COLUMN (8 cols on desktop) */}
          <div className="lg:col-span-8 min-w-0 space-y-6">
            {/* Universal Dashboard Search (⌘K) */}
            <DashboardSearch />

            {/* Cinematic Photographic Next Step Hero */}
            <NextStepHero
              eyebrow={nextHero.eyebrow}
              kicker={nextHero.kicker}
              title={nextHero.title}
              context={nextHero.context}
              cta={nextHero.cta}
              to={nextHero.to}
              coverImage={nextHero.coverImage}
              fallbackImage={nextHero.fallbackImage}
              secondaryCta={nextHero.secondaryCta}
            />

            {/* 4-Destination Quick Access Grid */}
            <QuickAccess items={quickItems} />

            {/* Your Courses — Cover Cards / Compact List + Horizontal-Safe Semester Switcher */}
            <Section title="Your courses" to="/courses" linkLabel="See all">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                {/* Semester Segmented Filter (horizontal scroll-safe on 375px phones) */}
                <div className="max-w-full overflow-x-auto no-scrollbar">
                  <div className="inline-flex rounded-xl border border-border bg-secondary/70 p-1">
                    {(["all", "1st", "2nd"] as const).map((sem) => {
                      const active = semesterFilter === sem;
                      const count =
                        sem === "all"
                          ? semesterCounts.all
                          : sem === "1st"
                          ? semesterCounts.first
                          : semesterCounts.second;
                      const label =
                        sem === "all"
                          ? "All Semesters"
                          : sem === "1st"
                          ? "1st Semester"
                          : "2nd Semester";
                      return (
                        <button
                          key={sem}
                          type="button"
                          onClick={() => setSemesterFilter(sem)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                            active
                              ? "bg-foreground text-background shadow-2xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`font-mono text-[10px] tabular-nums px-1.5 py-0.5 rounded ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cover Cards / Compact List Switcher */}
                <div
                  className="inline-flex items-center self-start sm:self-auto rounded-xl border border-border bg-secondary/70 p-1"
                  role="group"
                  aria-label="Course layout view"
                >
                  <button
                    type="button"
                    onClick={() => setCourseViewMode("grid")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                      courseViewMode === "grid"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={courseViewMode === "grid"}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                    <span>Covers</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseViewMode("list")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                      courseViewMode === "list"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    aria-pressed={courseViewMode === "list"}
                  >
                    <List className="h-3.5 w-3.5" aria-hidden />
                    <span>List</span>
                  </button>
                </div>
              </div>

              {coursesLoading ? (
                courseViewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CourseCoverCardSkeleton />
                    <CourseCoverCardSkeleton />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CourseRowSkeleton />
                    <CourseRowSkeleton />
                    <CourseRowSkeleton />
                  </div>
                )
              ) : filteredCourses.length === 0 ? (
                <EmptyCourses />
              ) : courseViewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredCourses.slice(0, 8).map((c) => {
                    const topicStats = courseTopicProgress[c.id];
                    const counts = contentCountsByCourse[c.id] || {
                      materialsCount: 0,
                      quizzesCount: 0,
                      questionsCount: 0,
                    };
                    return (
                      <CourseCoverCard
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
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCourses.slice(0, 9).map((c) => {
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
                </div>
              )}
            </Section>

            {/* Photographic Spotlight: Latest Handouts & CBT Exams */}
            {spotlightItems.length > 0 && (
              <Section title="Latest CBT exams & handouts" to="/practice" linkLabel="Practice hub">
                <StudySpotlightStrip items={spotlightItems} />
              </Section>
            )}

            {/* Opportunities Strip */}
            {opportunities.length > 0 && (
              <Section title="Opportunities for you" to="/opportunities">
                <OpportunityStrip items={opportunities} />
              </Section>
            )}

            {/* Top Articles Strip */}
            {articles.length > 0 && (
              <Section title="Top articles today" to="/posts">
                <TopArticlesStrip items={articles} />
              </Section>
            )}

            {/* Tutors Strip */}
            {tutors.length > 0 && (
              <Section title="Tutors for your courses" to="/tutors">
                <TutorStrip items={tutors} />
              </Section>
            )}
          </div>

          {/* RIGHT UTILITY RAIL (4 cols sticky on desktop; stacked cleanly below courses on mobile/tablet) */}
          <aside className="lg:col-span-4 min-w-0 space-y-6 lg:sticky lg:top-6">
            {/* Daily Check-in Streak Bonus */}
            {preferences.showDailyCheckIn && <DailyCheckIn variant="card" />}

            {/* Progress Overview */}
            <Section title="Today's progress">
              <ProgressCards />
            </Section>

            {/* Daily Mission & Weekly Pulse */}
            {preferences.showPracticeTarget && (
              <Section title="Daily mission & pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <MissionBlock
                    title="Today's Mission"
                    subtitle="Complete 3 quick actions to keep your streak"
                    missions={missionTasks}
                    completed={missionTasks.filter((m) => m.done).length}
                    total={missionTasks.length}
                    currentCourseId={primaryCourse?.id}
                  />
                  <WeeklyPulse
                    quizzesCompleted={weekly?.quizzes_completed ?? 0}
                    accuracy={weekly?.accuracy_pct ?? 0}
                  />
                </div>
              </Section>
            )}

            {/* Signature AI Entry Point */}
            <AskOverraBlock />
          </aside>
        </div>
      </Screen>
    </>
  );
}

