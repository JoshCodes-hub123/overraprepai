import { useState, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ListChecks,
  Sparkles,
  ClipboardList,
  Clock,
  FileText,
  Download,
  BookOpen,
  ArrowRight,
  PlayCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  ChevronLeft,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useReadinessAll } from "@/hooks/useIntelligence";
import {
  useCourseTopics,
  useTopicQuestionCounts,
  useLastStudiedTopic,
} from "@/hooks/useCourseLearning";
import { useTrackCourseOpen } from "@/hooks/useRecentlyOpenedCourses";
import { useCourseMaterials } from "@/hooks/useStudyMaterials";
import { nextStepFor } from "@/lib/nextStep";
import { getCuratedCoursePack, isBuiltInPackHidden } from "@/lib/curatedCourseResources";
import { SEO } from "@/components/seo/SEO";
import { EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import CourseHub from "@/pages/courses/CourseHub";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplainConceptSheet } from "@/components/courses/ExplainConceptSheet";
import { InAppDocViewer } from "@/components/viewer/InAppDocViewer";
import { CourseNoteReaderDialog } from "@/components/viewer/CourseNoteReaderDialog";
import { getCoverImage } from "@/lib/courseCovers";
import { Button } from "@/components/ui/button";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";

/**
 * Guided 3-Step Course Workspace (/courses/:courseId)
 * Step 1: Read Notes & Formulas (`materials` tab)
 * Step 2: Topic Drills (`topics` tab)
 * Step 3: Timed CBT Exam (`quizzes` tab)
 * Includes built-in Key Formulas, Summary Notes, Syllabus Topics, and Practice Questions
 * so every course is immediately rich and structured even before admin PDF uploads.
 */
const CourseWorkspace = () => {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const { primaryRole, hasRole } = useAuth();
  useTrackCourseOpen(courseId);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");

  // Default to Step 1 (materials/notes) unless explicitly deep-linked to topics or quizzes
  const [activeTab, setActiveTab] = useState<"materials" | "topics" | "quizzes">(
    initialTabParam === "topics" || initialTabParam === "drills"
      ? "topics"
      : initialTabParam === "quizzes" || initialTabParam === "cbt"
      ? "quizzes"
      : "materials"
  );

  const handleTabChange = (nextTab: "materials" | "topics" | "quizzes") => {
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<{ title: string; notes?: string } | null>(
    null
  );
  const [viewerDoc, setViewerDoc] = useState<{
    id?: string;
    url: string;
    filePath?: string | null;
    title: string;
    fileType?: string;
    description?: string | null;
  } | null>(null);
  const [selectedNote, setSelectedNote] = useState<{
    id?: string;
    title: string;
    courseCode?: string;
    courseName?: string;
    topicName?: string;
    description?: string | null;
    fileUrl?: string;
    filePath?: string | null;
    fileType?: string;
    fileSize?: number;
    ownerName?: string;
    dateStr?: string;
    index?: number;
  } | null>(null);

  // State for interactive built-in quick practice questions in Step 3
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course-workspace", courseId],
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async () => {
      const target = courseId.trim().toLowerCase();
      const targetNoSpace = target.replace(/[\s-_]/g, "");

      const [dbRes, apiRes] = await Promise.all([
        supabase
          .from("courses")
          .select("id, code, name, level, department, university_code")
          .eq("id", courseId)
          .maybeSingle(),
        fetch("/api/courses")
          .then((r) => (r.ok ? r.json() : { courses: [] }))
          .catch(() => ({ courses: [] })),
      ]);

      if (dbRes.data) return dbRes.data;

      const { data: byCode } = await supabase
        .from("courses")
        .select("id, code, name, level, department, university_code")
        .ilike("code", courseId)
        .maybeSingle();
      if (byCode) return byCode;

      const srvCourse = (Array.isArray(apiRes?.courses) ? apiRes.courses : []).find(
        (c: any) => {
          const cid = String(c?.id || "").toLowerCase();
          const ccode = String(c?.code || "").toLowerCase();
          const ccodeNoSpace = ccode.replace(/[\s-_]/g, "");
          return cid === target || ccode === target || ccodeNoSpace === targetNoSpace;
        }
      );
      if (srvCourse) {
        return {
          id: srvCourse.id,
          code: srvCourse.code || "COURSE",
          name: srvCourse.name || srvCourse.title || "Course",
          level: srvCourse.level || "100",
          department: srvCourse.department || "General Studies",
          university_code: srvCourse.university || null,
        };
      }
      return null;
    },
  });

  const { data: topics = [], isLoading: topicsLoading } = useCourseTopics(courseId);
  const { data: counts = {} } = useTopicQuestionCounts(courseId);

  // Quizzes published for this course (merged from Server Store + Supabase)
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["course-quizzes", courseId, course?.id, course?.code],
    enabled: !!courseId,
    staleTime: 30_000,
    queryFn: async () => {
      const mergedMap = new Map<string, any>();
      const courseKeys = Array.from(
        new Set(
          [
            courseId,
            course?.id,
            course?.code,
            course?.code
              ? `course-${course.code.toLowerCase().replace(/\s+/g, "-")}`
              : null,
          ].filter(Boolean)
        )
      ) as string[];

      try {
        const queryCode = course?.code || "";
        const srvRes = await fetch(
          `/api/courses/${encodeURIComponent(course?.id || courseId)}/quizzes?code=${encodeURIComponent(
            queryCode
          )}`
        );
        if (srvRes.ok) {
          const srvJson = await srvRes.json();
          if (Array.isArray(srvJson.quizzes)) {
            for (const q of srvJson.quizzes) {
              mergedMap.set(q.id, {
                id: q.id,
                title: q.title,
                question_count: Array.isArray(q.questions) ? q.questions.length : q.question_count || 0,
                duration_minutes: q.duration_minutes || 25,
                is_simulation: true,
                created_at: q.created_at || new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        // ignore server fetch error
      }

      try {
        const { data } = await supabase
          .from("quizzes")
          .select("id, title, question_count, duration_minutes, is_simulation, created_at")
          .in("course_id", courseKeys)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        if (Array.isArray(data)) {
          for (const row of data) {
            if (!mergedMap.has(row.id)) {
              mergedMap.set(row.id, row);
            }
          }
        }
      } catch {
        // ignore
      }

      return Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const studied = useLastStudiedTopic(courseId);
  const { data: materialData, isLoading: materialsLoading } = useCourseMaterials(courseId);
  const materialGroups = useMemo(() => materialData?.groups ?? [], [materialData?.groups]);
  const uploadedMaterialCount = materialGroups.reduce((n, g) => n + g.items.length, 0);

  // Built-in discipline-specific study resources (Formulas, Summary Notes, Syllabus Topics, Practice Questions)
  const curatedPack = useMemo(() => {
    const rawPack = getCuratedCoursePack(course?.code, course?.name);
    if (isBuiltInPackHidden(courseId)) {
      return {
        ...rawPack,
        formulas: [],
        notes: [],
      };
    }
    return rawPack;
  }, [course?.code, course?.name, courseId]);

  const topicNoteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of materialGroups) {
      if (group.topicId) {
        map[group.topicId] = (map[group.topicId] ?? 0) + group.items.length;
      }
    }
    return map;
  }, [materialGroups]);

  const { data: snapshots = [] } = useCourseSnapshots();
  const { data: readiness = [] } = useReadinessAll();

  const snapshot = snapshots.find((c: any) => c.id === courseId);
  const courseReadiness = readiness.find((r: any) => r.course_id === courseId);
  const weakTopic = courseReadiness?.weak_topics?.[0]?.topic ?? null;
  const readinessScore =
    (courseReadiness as any)?.overall_score ?? courseReadiness?.readiness ?? null;

  const step = useMemo(
    () =>
      nextStepFor({
        studiedTopicName: studied?.topic.name ?? null,
        studiedTopicId: studied?.topic.id ?? null,
        weakTopicName: weakTopic,
        lastOpenedAt: (snapshot as any)?.last_opened_at ?? null,
      }),
    [studied, weakTopic, snapshot]
  );

  if (primaryRole === "admin" || primaryRole === "tutor") return <CourseHub />;

  const identity = [
    course?.department,
    course?.level ? `${String(course.level).replace(/l$/i, "")}L` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const formatFileSize = (bytes?: number): string | null => {
    if (!bytes || bytes <= 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso?: string): string | null => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  const handleExplain = (title: string, notes?: string) => {
    setSelectedConcept({ title, notes });
    setExplainOpen(true);
  };

  const totalNotesCount = uploadedMaterialCount + curatedPack.notes.length;
  const effectiveTopicCount = topics.length > 0 ? topics.length : curatedPack.topics.length;
  const effectiveQuizCount = quizzes.length;

  return (
    <>
      <SEO
        title={course ? `${course.code} — ${course.name}` : "Course Study Workspace"}
        description="Guided 3-Step Course Workspace: 1. Read Notes & Formulas, 2. Practice Topic Drills, 3. Take Timed CBT Exams."
        noindex
      />

      {selectedConcept && (
        <ExplainConceptSheet
          open={explainOpen}
          onOpenChange={setExplainOpen}
          conceptTitle={selectedConcept.title}
          courseCode={course?.code}
          courseTitle={course?.name}
          courseLevel={course?.level}
          universityCode={course?.university_code}
          topicTitle={selectedConcept.title}
          contextNotes={selectedConcept.notes}
          onRequestUploadNotes={() => handleTabChange("materials")}
        />
      )}

      {selectedNote && (
        <CourseNoteReaderDialog
          open={!!selectedNote}
          onOpenChange={(open) => !open && setSelectedNote(null)}
          id={selectedNote.id}
          title={selectedNote.title}
          courseCode={selectedNote.courseCode}
          courseName={selectedNote.courseName}
          topicName={selectedNote.topicName}
          description={selectedNote.description}
          fileUrl={selectedNote.fileUrl}
          filePath={selectedNote.filePath}
          fileType={selectedNote.fileType}
          fileSize={selectedNote.fileSize}
          ownerName={selectedNote.ownerName}
          dateStr={selectedNote.dateStr}
          onExplain={handleExplain}
          index={selectedNote.index}
        />
      )}

      {viewerDoc && (
        <InAppDocViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          id={viewerDoc.id}
          url={viewerDoc.url}
          filePath={viewerDoc.filePath}
          title={viewerDoc.title}
          courseCode={course?.code}
          description={viewerDoc.description}
          fileType={viewerDoc.fileType}
        />
      )}

      <div className="min-h-screen bg-[#FAF8F5] text-[#18181B] pb-28 pt-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-5">
          {courseLoading ? (
            <div className="pt-6 space-y-4">
              <BrandSkeleton h={48} />
              <BrandSkeleton h={160} />
            </div>
          ) : !course ? (
            <div className="pt-8">
              <EmptyState
                title="Course not found"
                description="This course may not exist, or it isn't part of your university curriculum."
                action={<BrandButton to="/courses">Browse all courses</BrandButton>}
              />
            </div>
          ) : (
            <>
              {/* Unified Course Header Card */}
              <header className="rounded-2xl border border-[#E6E0D4] bg-white p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => navigate("/courses")}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#71717A] hover:text-[#18181B] transition cursor-pointer mb-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>All Courses</span>
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-xs font-bold tracking-wider">
                        {course.code}
                      </span>
                      {identity && (
                        <span className="text-xs font-semibold text-[#71717A]">{identity}</span>
                      )}
                      {typeof readinessScore === "number" && readinessScore > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#9A7B1C] font-mono tabular-nums text-xs font-bold">
                          Readiness {Math.round(readinessScore)}%
                        </span>
                      )}
                    </div>

                    <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#18181B] leading-snug pt-0.5">
                      {course.name}
                    </h1>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/practice?course=${courseId}`)}
                    className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Quick CBT</span>
                  </Button>
                </div>

                {/* Guided 3-Step Learning Path Banner */}
                <div className="rounded-xl bg-[#FAF8F5] border border-[#E6E0D4] p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                      Guided 3-Step Learning Path
                    </span>
                    {weakTopic && (
                      <span className="text-[11px] font-medium text-[#71717A] truncate">
                        Focus area: <strong className="text-[#18181B]">{weakTopic}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTabChange("materials")}
                      className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        activeTab === "materials"
                          ? "bg-[#18181B] text-[#FAF8F5] border-[#18181B] shadow-2xs"
                          : "bg-white text-[#18181B] border-[#E6E0D4] hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono tabular-nums text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                          Step 1
                        </span>
                        <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </div>
                      <p className="text-xs font-bold mt-0.5 truncate">Read Notes</p>
                      <p
                        className={`text-[10px] font-mono tabular-nums truncate ${
                          activeTab === "materials" ? "text-[#A1A1AA]" : "text-[#71717A]"
                        }`}
                      >
                        {totalNotesCount} summaries &amp; formulas
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("topics")}
                      className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        activeTab === "topics"
                          ? "bg-[#18181B] text-[#FAF8F5] border-[#18181B] shadow-2xs"
                          : "bg-white text-[#18181B] border-[#E6E0D4] hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono tabular-nums text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                          Step 2
                        </span>
                        <ListChecks className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </div>
                      <p className="text-xs font-bold mt-0.5 truncate">Topic Drills</p>
                      <p
                        className={`text-[10px] font-mono tabular-nums truncate ${
                          activeTab === "topics" ? "text-[#A1A1AA]" : "text-[#71717A]"
                        }`}
                      >
                        {effectiveTopicCount} syllabus modules
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTabChange("quizzes")}
                      className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                        activeTab === "quizzes"
                          ? "bg-[#18181B] text-[#FAF8F5] border-[#18181B] shadow-2xs"
                          : "bg-white text-[#18181B] border-[#E6E0D4] hover:border-[#D4AF37]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono tabular-nums text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                          Step 3
                        </span>
                        <ClipboardList className="w-3.5 h-3.5 text-[#D4AF37]" />
                      </div>
                      <p className="text-xs font-bold mt-0.5 truncate">CBT Exam</p>
                      <p
                        className={`text-[10px] font-mono tabular-nums truncate ${
                          activeTab === "quizzes" ? "text-[#A1A1AA]" : "text-[#71717A]"
                        }`}
                      >
                        {effectiveQuizCount} timed simulations
                      </p>
                    </button>
                  </div>
                </div>
              </header>

              {/* Main 3-Step Tabs Content */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => handleTabChange(v as "materials" | "topics" | "quizzes")}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-3 bg-[#EFECE6] p-1 rounded-xl h-11 border border-[#E6E0D4]">
                  <TabsTrigger
                    value="materials"
                    className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-[#18181B] data-[state=active]:shadow-2xs cursor-pointer"
                  >
                    1. Notes ({totalNotesCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="topics"
                    className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-[#18181B] data-[state=active]:shadow-2xs cursor-pointer"
                  >
                    2. Topic Drills ({effectiveTopicCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="quizzes"
                    className="rounded-lg font-bold text-xs data-[state=active]:bg-white data-[state=active]:text-[#18181B] data-[state=active]:shadow-2xs cursor-pointer"
                  >
                    3. CBT Exam ({effectiveQuizCount})
                  </TabsTrigger>
                </TabsList>

                {/* =========================================================
                    STEP 1: READ NOTES, KEY FORMULAS & SUMMARY HANDOUTS
                   ========================================================= */}
                <TabsContent value="materials" className="mt-5 space-y-5">
                  {curatedPack.formulas.length > 0 && (
                    <section className="rounded-2xl border border-[#E6E0D4] bg-white p-5 shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-[#18181B] text-[#D4AF37] grid place-items-center shrink-0">
                            <Calculator className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                              Step 1A · Instant Reference
                            </span>
                            <h2 className="font-display text-sm sm:text-base font-bold text-[#18181B]">
                              {course.code} Key Formulas &amp; Exam Rules
                            </h2>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleExplain(
                              `${course.code} Key Formulas & Core Principles`,
                              curatedPack.formulas
                                .map((f) => `${f.title}: ${f.expression} (${f.applicationNote})`)
                                .join("\n")
                            )
                          }
                          className="h-8 px-3 text-xs font-bold rounded-xl border-[#D4AF37]/50 text-[#9A7B1C] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-[#B48A1E]" />
                          Explain All
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {curatedPack.formulas.map((f, idx) => (
                          <div
                            key={idx}
                            className="rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] p-3.5 flex flex-col justify-between gap-2"
                          >
                            <div className="space-y-1.5">
                              <p className="text-xs font-bold text-[#18181B]">{f.title}</p>
                              <div className="px-2.5 py-2 rounded-lg bg-[#18181B] text-[#FAF8F5] font-mono text-xs font-semibold overflow-x-auto">
                                {f.expression}
                              </div>
                            </div>
                            <p className="text-[11px] text-[#52525B] leading-relaxed">
                              {f.applicationNote}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {curatedPack.notes.length > 0 && (
                    <section className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                            Step 1B · Built-In Revision Guides
                          </span>
                          <h3 className="text-sm sm:text-base font-bold text-[#18181B]">
                            High-Yield Lecture Summaries
                          </h3>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-[#71717A]">
                          {curatedPack.notes.length} guides included
                        </span>
                      </div>

                    <div className="space-y-3.5">
                      {curatedPack.notes.map((note, nIdx) => (
                        <div
                          key={note.id}
                          className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 shadow-2xs space-y-3 hover:border-[#D4AF37] transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#9A7B1C] text-[11px] font-bold">
                              {note.topicName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-[#71717A]">
                              <Clock className="w-3 h-3 text-[#B48A1E]" />
                              ~{note.readMinutes} min read
                            </span>
                          </div>

                          <div>
                            <h4 className="font-display font-bold text-sm sm:text-base text-[#18181B]">
                              {note.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-[#52525B] mt-1.5 leading-relaxed">
                              {note.summary}
                            </p>
                          </div>

                          {/* Key Takeaways List */}
                          <div className="rounded-xl bg-[#FAF8F5] border border-[#E6E0D4] p-3 space-y-1.5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#18181B]">
                              Key Exam Takeaways
                            </p>
                            <ul className="space-y-1">
                              {note.keyTakeaways.map((item, kIdx) => (
                                <li
                                  key={kIdx}
                                  className="text-xs text-[#3F3F46] flex items-start gap-2 leading-relaxed"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B48A1E] shrink-0 mt-0.5" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Common CBT Trap Callout */}
                          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-[#9A7B1C]">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#B48A1E]" />
                            <div>
                              <strong className="font-bold">Common CBT Trap: </strong>
                              <span>{note.examTrap}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={() =>
                                setSelectedNote({
                                  title: note.title,
                                  courseCode: course.code,
                                  courseName: course.name,
                                  topicName: note.topicName,
                                  description: `${note.summary}\n\nKey Takeaways:\n• ${note.keyTakeaways.join(
                                    "\n• "
                                  )}\n\nExam Trap to Watch: ${note.examTrap}`,
                                  ownerName: "OverraPrep Academic Board",
                                  index: nIdx,
                                })
                              }
                              className="h-8 px-3.5 text-xs font-bold rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Open Full Reader</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleExplain(
                                  note.title,
                                  `${note.summary}\n${note.keyTakeaways.join("\n")}`
                                )
                              }
                              className="h-8 px-3 text-xs font-bold rounded-xl border-[#D4AF37]/50 text-[#9A7B1C] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#B48A1E]" />
                              <span>Ask AI Tutor</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void downloadMaterialExternally({
                                  title: note.title,
                                  courseCode: course.code,
                                  content: `${note.summary}\n\nKey Exam Takeaways:\n• ${note.keyTakeaways.join(
                                    "\n• "
                                  )}\n\nCommon CBT Trap: ${note.examTrap}`,
                                })
                              }
                              className="h-8 px-3 text-xs font-bold rounded-xl border-[#E6E0D4] text-[#18181B] bg-white hover:bg-[#FAF8F5] flex items-center gap-1.5 cursor-pointer ml-auto"
                              title="Download Guide as PDF"
                            >
                              <Download className="w-3.5 h-3.5 text-[#B48A1E]" />
                              <span>Download PDF</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                  )}

                  {/* Lecturer / Admin Uploaded PDF Handouts & Notes */}
                  <section className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                          Step 1 · Course Materials &amp; Notes
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-[#18181B]">
                          Uploaded Course Documents ({uploadedMaterialCount})
                        </h3>
                      </div>
                      {(hasRole("admin") || hasRole("tutor")) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/bulk-upload`)}
                          className="text-xs font-bold rounded-xl border-[#D4AF37] text-[#18181B] bg-white hover:bg-[#FAF8F5]"
                        >
                          Upload Course Material
                        </Button>
                      )}
                    </div>

                    {materialsLoading ? (
                      <div className="space-y-3">
                        <BrandSkeleton h={100} />
                      </div>
                    ) : materialGroups.length === 0 ? (
                      <div className="rounded-2xl border border-[#E6E0D4] bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#18181B]">
                            No study materials or lecture notes uploaded yet
                          </p>
                          <p className="text-xs text-[#71717A]">
                            Once your course lecturer or administrator uploads PDFs or summary notes for {course.code}, they will appear right here.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleTabChange("topics")}
                          className="h-9 px-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs shrink-0 cursor-pointer"
                        >
                          <span>Go to Step 2: Drills</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {materialGroups.map((group) => (
                          <div key={group.topicName} className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[#52525B]">
                                {group.topicName}
                              </h4>
                              <span className="text-[11px] font-mono tabular-nums text-[#71717A]">
                                {group.items.length} file{group.items.length === 1 ? "" : "s"}
                              </span>
                            </div>
                            <div className="space-y-3">
                              {group.items.map((m: any, mIdx: number) => {
                                const sizeStr = formatFileSize(m.file_size);
                                const dateStr = formatDate(m.created_at);
                                const coverImg = getCoverImage(
                                  "note",
                                  m.title,
                                  course?.code,
                                  mIdx
                                );

                                return (
                                  <div
                                    key={m.id}
                                    className="overflow-hidden rounded-2xl border border-[#E6E0D4] bg-white hover:border-[#D4AF37] transition-all shadow-2xs flex flex-col sm:flex-row group"
                                  >
                                    <div
                                      className="relative sm:w-44 h-32 sm:h-auto shrink-0 overflow-hidden bg-[#18181B] cursor-pointer"
                                      onClick={() =>
                                        setSelectedNote({
                                          id: m.id,
                                          title: m.title,
                                          courseCode: course?.code,
                                          courseName: course?.name,
                                          topicName: group.topicName,
                                          description: m.description,
                                          fileUrl: m.file_url,
                                          filePath: m.file_path,
                                          fileType: m.file_type,
                                          fileSize: m.file_size,
                                          ownerName: m.owner_name || "Course Lecturer",
                                          dateStr: dateStr || undefined,
                                          index: mIdx,
                                        })
                                      }
                                    >
                                      <img
                                        src={coverImg}
                                        alt={m.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-75"
                                      />
                                      <div className="absolute inset-0 bg-gradient-to-t from-[#18181B]/90 via-[#18181B]/30 to-transparent" />
                                      <div className="absolute top-2.5 left-2.5">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-[#18181B] flex items-center gap-1">
                                          <FileText className="w-2.5 h-2.5" />
                                          PDF Document
                                        </span>
                                      </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                                      <div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#71717A] mb-1">
                                          {sizeStr && (
                                            <span className="font-mono tabular-nums">{sizeStr}</span>
                                          )}
                                          {dateStr && (
                                            <>
                                              <span>·</span>
                                              <span>{dateStr}</span>
                                            </>
                                          )}
                                          {m.owner_name && (
                                            <>
                                              <span>·</span>
                                              <span className="text-[#9A7B1C] font-semibold">
                                                {m.owner_name}
                                              </span>
                                            </>
                                          )}
                                        </div>

                                        <h5 className="font-bold text-sm sm:text-base text-[#18181B] leading-snug">
                                          {m.title}
                                        </h5>

                                        {m.description && (
                                          <p className="text-xs text-[#52525B] mt-1 line-clamp-2">
                                            {m.description}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EFECE6]">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            setSelectedNote({
                                              id: m.id,
                                              title: m.title,
                                              courseCode: course?.code,
                                              courseName: course?.name,
                                              topicName: group.topicName,
                                              description: m.description,
                                              fileUrl: m.file_url,
                                              filePath: m.file_path,
                                              fileType: m.file_type,
                                              fileSize: m.file_size,
                                              ownerName: m.owner_name || "Course Lecturer",
                                              dateStr: dateStr || undefined,
                                              index: mIdx,
                                            })
                                          }
                                          className="h-8 px-3.5 text-xs font-bold rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] flex items-center gap-1.5 cursor-pointer"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                          <span>Read Document</span>
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleExplain(m.title, m.description)}
                                          className="h-8 px-2.5 text-xs font-bold rounded-xl border-[#D4AF37]/50 text-[#9A7B1C] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer"
                                        >
                                          <Sparkles className="w-3.5 h-3.5 text-[#B48A1E]" />
                                          <span>AI Explain</span>
                                        </Button>

                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            void downloadMaterialExternally({
                                              id: m.id,
                                              title: m.title,
                                              courseCode: course?.code,
                                              fileUrl: m.file_url,
                                              filePath: m.file_path,
                                              fileType: m.file_type,
                                              description: m.description,
                                            })
                                          }
                                          className="h-8 px-3 text-xs font-bold rounded-xl border-[#18181B]/20 text-[#18181B] bg-white hover:bg-[#FAF8F5] flex items-center gap-1.5 cursor-pointer ml-auto shadow-2xs"
                                          title="Download Document to Device"
                                        >
                                          <Download className="w-3.5 h-3.5 text-[#B48A1E]" />
                                          <span>Download</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Step 1 -> Step 2 Progression Banner */}
                  <div className="rounded-2xl bg-[#18181B] text-[#FAF8F5] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                        Finished reviewing Step 1?
                      </span>
                      <p className="text-sm font-bold mt-0.5">
                        Proceed to Step 2: Practice Topic-by-Topic Drills
                      </p>
                    </div>
                    <Button
                      onClick={() => handleTabChange("topics")}
                      className="bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs rounded-xl h-10 px-4 shrink-0 cursor-pointer"
                    >
                      <span>Step 2: Topic Drills</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </TabsContent>

                {/* =========================================================
                    STEP 2: SYLLABUS MODULES & TOPIC DRILLS
                   ========================================================= */}
                <TabsContent value="topics" className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-[#E6E0D4] bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                        Step 2 · Active Recall by Module
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-[#18181B]">
                        {course.code} Syllabus Topic Breakdown
                      </h2>
                      <p className="text-xs text-[#71717A]">
                        Drill individual syllabus units or tap “Explain with AI” for worked examples.
                      </p>
                    </div>
                    {step.topicName && (
                      <span className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D4] text-xs font-semibold text-[#18181B] shrink-0">
                        Recommended: <strong className="text-[#9A7B1C]">{step.topicName}</strong>
                      </span>
                    )}
                  </div>

                  {topicsLoading ? (
                    <div className="space-y-3">
                      <BrandSkeleton h={100} />
                      <BrandSkeleton h={100} />
                    </div>
                  ) : topics.length > 0 ? (
                    <div className="space-y-3">
                      {topics.map((t, idx) => {
                        const questionCount = counts[t.id] ?? 0;
                        const noteCount = topicNoteCounts[t.id] ?? 0;

                        return (
                          <div
                            key={t.id}
                            className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 hover:border-[#D4AF37] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold uppercase">
                                  Module {String(idx + 1).padStart(2, "0")}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums text-[#71717A]">
                                  <BookOpen className="w-3 h-3 text-[#B48A1E]" />
                                  {questionCount > 0 ? `${questionCount} questions` : "Topic drill ready"}
                                </span>
                                {noteCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleTabChange("materials")}
                                    className="text-xs font-semibold text-[#9A7B1C] hover:underline cursor-pointer"
                                  >
                                    · {noteCount} PDF{noteCount === 1 ? "" : "s"}
                                  </button>
                                )}
                              </div>

                              <Link
                                to={`/courses/${courseId}/topics/${t.id}`}
                                className="font-display font-bold text-sm sm:text-base text-[#18181B] hover:text-[#9A7B1C] transition block"
                              >
                                {t.name}
                              </Link>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExplain(t.name)}
                                className="h-9 px-3 text-xs font-bold rounded-xl border-[#D4AF37]/50 text-[#9A7B1C] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-[#B48A1E]" />
                                <span>Explain with AI</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/courses/${courseId}/topics/${t.id}`)}
                                className="h-9 px-3.5 text-xs font-bold rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
                              >
                                <span>Practice Topic</span>
                                <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : curatedPack.topics.length > 0 ? (
                    <div className="space-y-3">
                      {curatedPack.topics.map((t, idx) => (
                        <div
                          key={t.id}
                          className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 hover:border-[#D4AF37] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold uppercase">
                                Module {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-xs font-mono tabular-nums text-[#71717A]">
                                {t.questionCount} target drill items
                              </span>
                            </div>
                            <h4 className="font-display font-bold text-sm sm:text-base text-[#18181B]">
                              {t.name}
                            </h4>
                            <p className="text-xs text-[#52525B]">{t.summary}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExplain(t.name, t.summary)}
                              className="h-9 px-3 text-xs font-bold rounded-xl border-[#D4AF37]/50 text-[#9A7B1C] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 flex items-center gap-1 cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-[#B48A1E]" />
                              <span>Explain with AI</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/practice?course=${courseId}`)}
                              className="h-9 px-3.5 text-xs font-bold rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Practice Drill</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#E6E0D4] bg-white p-6 text-center space-y-2">
                      <p className="text-sm font-bold text-[#18181B]">
                        No syllabus topics added for {course.code} yet
                      </p>
                      <p className="text-xs text-[#71717A]">
                        Syllabus modules and topic drills will appear here as soon as your course administrator adds them.
                      </p>
                    </div>
                  )}

                  {/* Step 2 -> Step 3 Progression Banner */}
                  <div className="rounded-2xl bg-[#18181B] text-[#FAF8F5] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                        Ready for exam simulation?
                      </span>
                      <p className="text-sm font-bold mt-0.5">
                        Proceed to Step 3: Take a Timed CBT Exam for {course.code}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleTabChange("quizzes")}
                      className="bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs rounded-xl h-10 px-4 shrink-0 cursor-pointer"
                    >
                      <span>Step 3: CBT Exam</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </TabsContent>

                {/* =========================================================
                    STEP 3: TIMED CBT EXAMS & INTERACTIVE READINESS CHECK
                   ========================================================= */}
                <TabsContent value="quizzes" className="mt-5 space-y-5">
                  {/* Primary Full Course CBT Simulation Launcher */}
                  <div className="rounded-2xl bg-[#18181B] text-[#FAF8F5] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#27272A]">
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#D4AF37]/20 text-[#D4AF37] font-mono text-[10px] font-bold uppercase tracking-wider">
                        Step 3A · Full Exam Simulator
                      </span>
                      <h2 className="font-display text-lg sm:text-xl font-extrabold">
                        {course.code} Timed CBT Practice Hub
                      </h2>
                      <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-xl">
                        Configure question count, timer duration, and syllabus scope in the CBT Practice Hub.
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate(`/practice?course=${courseId}`)}
                      className="bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-extrabold text-xs sm:text-sm rounded-xl h-11 px-5 shrink-0 flex items-center gap-2 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Launch {course.code} CBT</span>
                    </Button>
                  </div>

                  {/* Published Course CBT Sets */}
                  {quizzesLoading ? (
                    <div className="space-y-3">
                      <BrandSkeleton h={100} />
                    </div>
                  ) : quizzes.length > 0 ? (
                    <section className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#71717A] px-1">
                        Official Published CBT Papers ({quizzes.length})
                      </h3>
                      <div className="space-y-3">
                        {quizzes.map((q: any, qIdx: number) => (
                          <div
                            key={q.id}
                            className="rounded-2xl border border-[#E6E0D4] bg-white p-4 sm:p-5 hover:border-[#D4AF37] transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold uppercase">
                                  CBT Paper {String(qIdx + 1).padStart(2, "0")}
                                </span>
                                <span className="font-mono tabular-nums text-xs font-semibold text-[#52525B]">
                                  {q.question_count} Questions
                                </span>
                                {q.duration_minutes && (
                                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-xs text-[#71717A]">
                                    <Clock className="w-3 h-3 text-[#B48A1E]" />
                                    {q.duration_minutes} mins
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display font-bold text-sm sm:text-base text-[#18181B]">
                                {q.title}
                              </h4>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => navigate(`/quiz/${q.id}/cbt`)}
                              className="bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs h-9 px-4 rounded-xl shrink-0 flex items-center gap-1.5 cursor-pointer"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span>Start Timed CBT</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : (
                    <div className="rounded-2xl border border-[#E6E0D4] bg-white p-6 text-center space-y-2">
                      <p className="text-sm font-bold text-[#18181B]">
                        No CBT exam papers published for {course.code} yet
                      </p>
                      <p className="text-xs text-[#71717A]">
                        Once your course administrator uploads CBT questions for {course.code}, timed exam papers will appear here.
                      </p>
                    </div>
                  )}

                  {curatedPack.questions.length > 0 && (
                    <section className="rounded-2xl border border-[#E6E0D4] bg-white p-5 space-y-4 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EFECE6] pb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C]">
                            Step 3B · Instant Self-Check
                          </span>
                          <h3 className="font-display text-sm sm:text-base font-bold text-[#18181B]">
                            {course.code} High-Yield Practice Check ({curatedPack.questions.length} Questions)
                          </h3>
                          <p className="text-xs text-[#71717A]">
                            Tap any option below for immediate grading and worked explanation.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {curatedPack.questions.map((item, qIdx) => {
                          const chosen = selectedAnswers[item.id];
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold">
                                  Q{qIdx + 1} · {item.topic}
                                </span>
                                {chosen && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedAnswers((prev) => {
                                        const next = { ...prev };
                                        delete next[item.id];
                                        return next;
                                      })
                                    }
                                    className="text-[11px] font-semibold text-[#9A7B1C] hover:underline cursor-pointer"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>

                              <p className="text-xs sm:text-sm font-bold text-[#18181B] leading-relaxed">
                                {item.question}
                              </p>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.options.map((opt) => {
                                  const isSelected = chosen === opt.label;
                                  const showResult = Boolean(chosen);

                                  let btnStyle =
                                    "bg-white border-[#E6E0D4] text-[#18181B] hover:border-[#D4AF37]";
                                  if (showResult) {
                                    if (opt.isCorrect) {
                                      btnStyle =
                                        "bg-emerald-500/15 border-emerald-600 text-emerald-950 font-bold";
                                    } else if (isSelected && !opt.isCorrect) {
                                      btnStyle =
                                        "bg-red-500/15 border-red-500 text-red-950 font-semibold";
                                    } else {
                                      btnStyle = "bg-white/60 border-[#E6E0D4] text-[#71717A]";
                                    }
                                  }

                                  return (
                                    <button
                                      key={opt.label}
                                      type="button"
                                      onClick={() =>
                                        setSelectedAnswers((prev) => ({
                                          ...prev,
                                          [item.id]: opt.label,
                                        }))
                                      }
                                      className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all flex items-center gap-2.5 cursor-pointer ${btnStyle}`}
                                    >
                                      <span className="w-5 h-5 rounded-md bg-[#18181B] text-[#FAF8F5] font-mono text-[11px] font-bold grid place-items-center shrink-0">
                                        {opt.label}
                                      </span>
                                      <span className="flex-1">{opt.text}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {chosen && (
                                <div className="rounded-xl bg-white border border-[#E6E0D4] p-3 text-xs space-y-1">
                                  <p className="font-bold text-[#18181B]">Worked Explanation:</p>
                                  <p className="text-[#52525B] leading-relaxed">{item.explanation}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CourseWorkspace;
