import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
  PlayCircle
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

  const [activeTab, setActiveTab] = useState<"topics" | "materials" | "quizzes">("topics");
  const [explainOpen, setExplainOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<{ title: string; notes?: string } | null>(null);

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
  const materialGroups = materialData?.groups ?? [];
  const materialCount = materialGroups.reduce((n, g) => n + g.items.length, 0);
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
                                <span className="text-xs text-neutral-500 mt-0.5 block">
                                  {questionCount} practice question{questionCount === 1 ? "" : "s"}
                                </span>
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
                  {materialsLoading ? (
                    <div className="space-y-2.5">
                      <BrandSkeleton h={70} />
                      <BrandSkeleton h={70} />
                    </div>
                  ) : materialGroups.length === 0 ? (
                    <EmptyState
                      icon={<FileText className="h-5 w-5" />}
                      title="No lecture notes uploaded yet"
                      description="Your course lecture notes, slides, and handouts will appear here."
                    />
                  ) : (
                    <div className="space-y-4">
                      {materialGroups.map((group) => (
                        <div key={group.topicName} className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 px-1">
                            {group.topicName}
                          </h4>
                          <div className="space-y-2">
                            {group.items.map((m: any) => (
                              <div
                                key={m.id}
                                className="p-4 rounded-2xl border border-neutral-200 bg-white hover:border-neutral-300 transition flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-800 shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-semibold text-sm text-neutral-900 truncate">
                                      {m.title}
                                    </h5>
                                    {m.description && (
                                      <p className="text-xs text-neutral-500 truncate mt-0.5">
                                        {m.description}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleExplain(m.title, m.description)}
                                    className="h-8 px-2.5 text-xs font-semibold rounded-xl border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                                    <span className="hidden sm:inline">Explain Note</span>
                                  </Button>
                                  {m.file_url && (
                                    <a
                                      href={m.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition"
                                      title="Download / View"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
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
