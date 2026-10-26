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
  GraduationCap,
  HelpCircle,
  PlayCircle,
  Eye,
  FileCode,
  ExternalLink,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useReadinessAll } from "@/hooks/useIntelligence";
import {
  useCourseTopics,
  useTopicQuestionCounts,
  useLastStudiedTopic,
  useCourseProgress,
} from "@/hooks/useCourseLearning";
import { useTrackCourseOpen } from "@/hooks/useRecentlyOpenedCourses";
import { useCourseMaterials } from "@/hooks/useStudyMaterials";
import { nextStepFor, nextStepCta } from "@/lib/nextStep";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import NextStepHero from "@/components/dashboard/mobile/NextStepHero";
import CourseHub from "@/pages/courses/CourseHub";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExplainConceptSheet } from "@/components/courses/ExplainConceptSheet";
import { InAppDocViewer } from "@/components/viewer/InAppDocViewer";
import { Button } from "@/components/ui/button";

/**
 * Unified Course Workspace (/courses/:courseId)
 * 3 Distinct Tabs:
 *   1. Syllabus & Topics
 *   2. Lecture Materials / Notes
 *   3. Course CBT Questions
 */
const CourseWorkspace = () => {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const { primaryRole } = useAuth();
  useTrackCourseOpen(courseId);

  const [searchParams] = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"topics" | "materials" | "quizzes">(
    initialTabParam === "notes" || initialTabParam === "materials" ? "materials" :
    initialTabParam === "quizzes" || initialTabParam === "cbt" ? "quizzes" : "topics"
  );
  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<{ title: string; notes?: string } | null>(null);
  const [viewerDoc, setViewerDoc] = useState<{ url: string; title: string; fileType?: string } | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course-workspace", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, level, department, university_code")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: topics = [], isLoading: topicsLoading } = useCourseTopics(courseId);
  const { data: counts = {} } = useTopicQuestionCounts(courseId);

  // Quizzes published for this course
  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["course-quizzes", courseId],
    enabled: !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("id, title, question_count, duration_minutes, is_simulation, created_at")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const studied = useLastStudiedTopic(courseId);
  const { data: materialData, isLoading: materialsLoading } = useCourseMaterials(courseId);
  const materialGroups = useMemo(() => materialData?.groups ?? [], [materialData?.groups]);
  const materialCount = materialGroups.reduce((n, g) => n + g.items.length, 0);

  const topicNoteCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const group of materialGroups) {
      if (group.topicId) {
        map[group.topicId] = (map[group.topicId] ?? 0) + group.items.length;
      }
    }
    return map;
  }, [materialGroups]);

  const progress = useCourseProgress(courseId);
  const { data: snapshots = [] } = useCourseSnapshots();
  const { data: readiness = [] } = useReadinessAll();

  const snapshot = snapshots.find((c: any) => c.id === courseId);
  const weakTopic = readiness.find((r: any) => r.course_id === courseId)?.weak_topics?.[0]?.topic ?? null;

  const step = useMemo(
    () =>
      nextStepFor({
        studiedTopicName: studied?.topic.name ?? null,
        studiedTopicId: studied?.topic.id ?? null,
        weakTopicName: weakTopic,
        lastOpenedAt: (snapshot as any)?.last_opened_at ?? null,
      }),
    [studied, weakTopic, snapshot],
  );

  const stepTopicId =
    step.topicId ??
    topics.find((t) => t.name.trim().toLowerCase() === (step.topicName ?? "").trim().toLowerCase())?.id ??
    topics[0]?.id ??
    null;

  const stepTitle =
    step.topicName ?? (topics.length ? "Start with the first topic" : "Explore this course");

  if (primaryRole === "admin" || primaryRole === "tutor") return <CourseHub />;

  const identity = [course?.department, course?.level ? `${String(course.level).replace(/l$/i, "")}L` : null]
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

  return (
    <>
      <SEO
        title={course ? `${course.code} — ${course.name}` : "Course Workspace"}
        description="Your unified course workspace: topics syllabus, lecture notes, and CBT practice."
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
          onRequestUploadNotes={() => setActiveTab("materials")}
        />
      )}

      {viewerDoc && (
        <InAppDocViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          url={viewerDoc.url}
          title={viewerDoc.title}
          fileType={viewerDoc.fileType}
        />
      )}

      <Screen className="max-w-3xl mx-auto px-4 py-6">
        {courseLoading ? (
          <div className="pt-6 space-y-4">
            <BrandSkeleton h={38} />
            <BrandSkeleton h={150} />
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
            <ScreenHeader
              back
              title={course.code}
              subtitle={course.name}
            />

            {identity && (
              <p className="-mt-3 mb-5 text-xs font-semibold tracking-tight text-neutral-500">
                {identity}
              </p>
            )}

            {/* Next Step Primary Card */}
            {topicsLoading ? (
              <BrandSkeleton h={150} />
            ) : (
              <NextStepHero
                eyebrow="Next Best Action"
                title={stepTitle}
                context={
                  step.kind === "resume-topic"
                    ? "Pick up right where you left off."
                    : step.kind === "weak-topic"
                    ? "Strengthen this weak topic to boost your CBT score."
                    : undefined
                }
                cta={nextStepCta(step)}
                to={stepTopicId ? `/courses/${courseId}/topics/${stepTopicId}` : `/practice?course=${courseId}`}
              />
            )}

            {/* 3 Distinct Tabs */}
            <div className="mt-8">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="w-full grid grid-cols-3 bg-neutral-100 p-1 rounded-2xl h-11 border border-neutral-200">
                  <TabsTrigger
                    value="topics"
                    className="rounded-xl font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-xs"
                  >
                    1. Topics ({topics.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="rounded-xl font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-xs"
                  >
                    2. Notes ({materialCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="quizzes"
                    className="rounded-xl font-semibold text-xs data-[state=active]:bg-white data-[state=active]:text-neutral-950 data-[state=active]:shadow-xs"
                  >
                    3. CBT Drills ({quizzes.length})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: Syllabus & Topics */}
                <TabsContent value="topics" className="mt-5 space-y-3">
                  {topicsLoading ? (
                    <div className="space-y-2.5">
                      <BrandSkeleton h={56} />
                      <BrandSkeleton h={56} />
                      <BrandSkeleton h={56} />
                    </div>
                  ) : topics.length === 0 ? (
                    <EmptyState
                      icon={<ListChecks className="h-5 w-5" />}
                      title="No topics listed yet"
                      description="Lecture topics for this semester are currently being compiled."
                    />
                  ) : (
                    <div className="space-y-2">
                      {topics.map((t, idx) => {
                        const questionCount = counts[t.id] ?? 0;
                        const noteCount = topicNoteCounts[t.id] ?? 0;
                        return (
                          <div
                            key={t.id}
                            className="p-4 rounded-2xl border border-neutral-200 bg-white hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 text-xs font-bold text-neutral-400 pt-0.5">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <Link
                                  to={`/courses/${courseId}/topics/${t.id}`}
                                  className="font-semibold text-sm sm:text-base text-neutral-900 hover:text-amber-800 transition block"
                                >
                                  {t.name}
                                </Link>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs text-neutral-500">
                                    {questionCount} practice question{questionCount === 1 ? "" : "s"}
                                  </span>
                                  {noteCount > 0 && (
                                    <>
                                      <span className="text-xs text-neutral-300">·</span>
                                      <button
                                        type="button"
                                        onClick={() => setActiveTab("materials")}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-md transition"
                                      >
                                        <FileText className="w-3 h-3 text-amber-700" />
                                        <span>{noteCount} Note{noteCount === 1 ? "" : "s"} (PDF)</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExplain(t.name)}
                                className="h-8 px-2.5 text-xs font-semibold rounded-xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                <span>Explain with AI</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/courses/${courseId}/topics/${t.id}`)}
                                className="h-8 px-3 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white flex items-center gap-1"
                              >
                                <span>Study</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: Lecture Materials / Notes */}
                <TabsContent value="materials" className="mt-5 space-y-4">
                  {/* Notes Header Callout */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-neutral-900">
                          Course Lecture Notes & PDF Documents
                        </h3>
                        <p className="text-xs text-neutral-600">
                          {materialCount === 0
                            ? "Course lecture notes and slides are being uploaded by your lecturers and tutors."
                            : `${materialCount} official lecture note${materialCount === 1 ? "" : "s"} and reading document${materialCount === 1 ? "" : "s"} ready for reading.`}
                        </p>
                      </div>
                    </div>
                    {(primaryRole === "admin" || primaryRole === "tutor") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/content?tab=notes&courseId=${courseId}`)}
                        className="text-xs font-semibold rounded-xl border-amber-300 text-amber-900 bg-white hover:bg-amber-50 shrink-0 self-start sm:self-auto"
                      >
                        Upload New Note
                      </Button>
                    )}
                  </div>

                  {materialsLoading ? (
                    <div className="space-y-2.5">
                      <BrandSkeleton h={70} />
                      <BrandSkeleton h={70} />
                    </div>
                  ) : materialGroups.length === 0 ? (
                    <EmptyState
                      icon={<FileText className="h-5 w-5" />}
                      title="No lecture notes uploaded yet"
                      description="Your course lecture notes, slides, and handouts uploaded by administrators will appear here."
                    />
                  ) : (
                    <div className="space-y-5">
                      {materialGroups.map((group) => (
                        <div key={group.topicName} className="space-y-2.5">
                          <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                              {group.topicName}
                            </h4>
                            <span className="text-[11px] font-medium text-neutral-500">
                              {group.items.length} file{group.items.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="space-y-2.5">
                            {group.items.map((m: any) => {
                              const isPdf =
                                m.file_type?.toLowerCase().includes("pdf") ||
                                m.file_url?.toLowerCase().endsWith(".pdf");
                              const sizeStr = formatFileSize(m.file_size);
                              const dateStr = formatDate(m.created_at);

                              return (
                                <div
                                  key={m.id}
                                  className="p-4 rounded-2xl border border-neutral-200 bg-white hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                                >
                                  <div className="flex items-start gap-3.5 min-w-0">
                                    <div
                                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        isPdf
                                          ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                          : "bg-amber-500/15 text-amber-800"
                                      }`}
                                    >
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                        {isPdf && (
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                            PDF
                                          </span>
                                        )}
                                        {sizeStr && (
                                          <span className="text-[11px] font-medium text-neutral-500">
                                            {sizeStr}
                                          </span>
                                        )}
                                        {dateStr && (
                                          <>
                                            <span className="text-neutral-300">·</span>
                                            <span className="text-[11px] text-neutral-500">
                                              {dateStr}
                                            </span>
                                          </>
                                        )}
                                        {m.owner_name && (
                                          <>
                                            <span className="text-neutral-300">·</span>
                                            <span className="text-[11px] text-amber-800 font-medium">
                                              {m.owner_name}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                      <h5 className="font-semibold text-sm sm:text-base text-neutral-900 leading-snug">
                                        {m.title}
                                      </h5>
                                      {m.description && (
                                        <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                                          {m.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setViewerDoc({
                                          url: m.file_url,
                                          title: m.title,
                                          fileType: m.file_type || (isPdf ? "application/pdf" : undefined),
                                        })
                                      }
                                      className="h-8 px-3 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 flex items-center gap-1.5 shadow-2xs"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Read Note</span>
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleExplain(m.title, m.description)}
                                      className="h-8 px-2.5 text-xs font-semibold rounded-xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                                    >
                                      <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                      <span className="hidden sm:inline">AI Explain</span>
                                    </Button>

                                    {m.file_url && (
                                      <a
                                        href={m.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition"
                                        title="Download Document"
                                      >
                                        <Download className="w-4 h-4" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB 3: Course CBT Questions */}
                <TabsContent value="quizzes" className="mt-5 space-y-3">
                  {quizzesLoading ? (
                    <div className="space-y-2.5">
                      <BrandSkeleton h={68} />
                      <BrandSkeleton h={68} />
                    </div>
                  ) : quizzes.length === 0 ? (
                    <EmptyState
                      icon={<ClipboardList className="h-5 w-5" />}
                      title="No CBT sets available yet"
                      description="Practice by topic syllabus above while mock CBT tests are being prepared."
                    />
                  ) : (
                    <div className="space-y-2.5">
                      {quizzes.map((q: any) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-2xl border border-neutral-200 bg-white hover:border-amber-400 transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                              <ClipboardList className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-neutral-900 truncate">
                                {q.title}
                              </h4>
                              <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                                <span>{q.question_count} Questions</span>
                                {q.duration_minutes && (
                                  <>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {q.duration_minutes} Mins
                                    </span>
                                  </>
                                )}
                                {q.is_simulation && (
                                  <>
                                    <span>·</span>
                                    <span className="text-amber-800 font-semibold">CBT Mode</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => navigate(`/quiz/${q.id}/cbt`)}
                            className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs h-9 px-4 rounded-xl shrink-0 flex items-center gap-1.5 shadow-2xs"
                          >
                            <PlayCircle className="w-4 h-4" />
                            <span>Start CBT</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </Screen>
    </>
  );
};

export default CourseWorkspace;
