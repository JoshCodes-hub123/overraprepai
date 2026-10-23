import { useMemo, useState } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentScope } from "@/hooks/useStudentScope";
import { useMyCourses } from "@/hooks/useMyCourses";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  FileText,
  Layers,
  ClipboardList,
  Image as ImageIcon,
  Sparkles,
  Download,
  ExternalLink,
  Settings,
  MessageSquare,
  Headphones,
  Lock,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Play,
  Share2,
  Search,
} from "lucide-react";
import CourseProgressCard from "@/components/courses/CourseProgressCard";
import CourseOfflineButton from "@/components/courses/CourseOfflineButton";
import CourseTopicsStrip from "@/components/courses/CourseTopicsStrip";
import CourseAIPanel from "@/components/courses/CourseAIPanel";
import CourseAudioPanel from "@/components/courses/CourseAudioPanel";
import FlashcardProgressStrip from "@/components/courses/FlashcardProgressStrip";
import { CourseChat } from "@/components/course/CourseChat";
import { useTrackCourseOpen } from "@/hooks/useRecentlyOpenedCourses";
import { EmptyState } from "@/components/shell/EmptyState";
import { QuizCard } from "@/components/quiz/QuizCard";
import { MathMarkdown } from "@/components/quiz/MathMarkdown";
import { getOrCreateCourseSyllabus, SyllabusTopic } from "@/data/accreditedSyllabi";
import { ExplainConceptSheet } from "@/components/courses/ExplainConceptSheet";
import { LectureNoteReaderModal } from "@/components/courses/LectureNoteReaderModal";

const VALID_TABS = ["syllabus", "documents", "quizzes", "flashcards", "ai", "images", "discuss"] as const;
type TabValue = typeof VALID_TABS[number];

const CourseHub = () => {
  const { courseId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { level: studentLevel } = useStudentScope();
  const { courseIds } = useMyCourses();

  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  // Grounded AI Explainer state
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [explainerConcept, setExplainerConcept] = useState("");
  const [explainerTopic, setExplainerTopic] = useState("");
  const [explainerNotes, setExplainerNotes] = useState("");

  // In-App Note Reader state
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerTitle, setReaderTitle] = useState("");
  const [readerContent, setReaderContent] = useState("");

  // Custom concept search in AI tab
  const [customConceptQuery, setCustomConceptQuery] = useState("");

  const requestedTab = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = requestedTab && (VALID_TABS as readonly string[]).includes(requestedTab)
    ? requestedTab
    : "syllabus";

  useTrackCourseOpen(courseId);

  // Fetch course info
  const { data: course } = useQuery({
    queryKey: ["course", user?.id, courseId],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description, created_by, university")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch DB topics for this course
  const { data: dbTopics = [] } = useQuery({
    queryKey: ["course-db-topics", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name, description, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      return data ?? [];
    },
  });

  // Fetch uploaded lecture notes
  const { data: documents = [] } = useQuery({
    queryKey: ["course-docs", user?.id, courseId, topicFilter],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      let q = supabase
        .from("lecture_notes")
        .select("id, title, description, file_url, file_type, created_at, view_count, download_count, topic_id")
        .eq("course_id", courseId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Fetch course quizzes
  const { data: quizzes = [] } = useQuery({
    queryKey: ["course-quizzes", user?.id, courseId, topicFilter],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      let q = supabase
        .from("quizzes")
        .select("id, title, description, duration_minutes, question_count, is_premium, token_cost, topic_id, tutor_id, created_at")
        .eq("course_id", courseId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      const rows = data ?? [];
      const tutorIds = [...new Set(rows.map((r: any) => r.tutor_id).filter(Boolean))] as string[];
      const tutorMap = new Map<string, any>();
      if (tutorIds.length) {
        const { data: tutors } = await (supabase as any)
          .from("profiles")
          .select("id, full_name, avatar_url, profile_image_url, organisation_name, organisation_logo_url")
          .in("id", tutorIds);
        (tutors ?? []).forEach((t: any) => tutorMap.set(t.id, t));
      }
      return rows.map((r: any) => ({
        ...r,
        tutor: r.tutor_id ? (() => {
          const t = tutorMap.get(r.tutor_id);
          return t ? {
            id: t.id,
            full_name: t.full_name,
            avatar_url: t.avatar_url || t.profile_image_url,
            organisation_name: t.organisation_name,
            organisation_logo_url: t.organisation_logo_url,
          } : null;
        })() : null,
      }));
    },
  });

  // Fetch flashcards
  const { data: flashDecks = [] } = useQuery({
    queryKey: ["course-flashcards", user?.id, courseId, topicFilter],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      let q = supabase
        .from("flashcards")
        .select("id, front, back, subject, topic, created_at, topic_id")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (topicFilter) q = q.eq("topic_id", topicFilter);
      const { data } = await q;
      return data ?? [];
    },
  });

  // Fetch images
  const { data: images = [] } = useQuery({
    queryKey: ["course-images", user?.id, courseId],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("course_images")
        .select("id, storage_path, url, caption, created_at")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      return Promise.all((data ?? []).map(async (image) => {
        const marker = "/storage/v1/object/public/course-images/";
        const markerIndex = image.url.indexOf(marker);
        let path = image.storage_path;
        if (!path && markerIndex >= 0) {
          try {
            path = decodeURIComponent(image.url.slice(markerIndex + marker.length).split("?")[0]);
          } catch {
            return image;
          }
        }
        if (!path) return image;
        const { data: signed, error } = await supabase.storage
          .from("course-images")
          .createSignedUrl(path, 60 * 60);
        if (error) throw error;
        return { ...image, url: signed.signedUrl };
      }));
    },
  });

  // Accredited syllabus data (curriculum topics, KaTeX formulas, lecture notes)
  const accreditedSyllabus = useMemo(() => {
    if (!course) return null;
    return getOrCreateCourseSyllabus(course.code, course.name, course.level);
  }, [course]);

  // Combined syllabus topics
  const combinedTopics = useMemo<SyllabusTopic[]>(() => {
    if (!accreditedSyllabus) return [];
    if (!dbTopics.length) return accreditedSyllabus.topics;

    // Map DB topics and supplement with accredited data
    return dbTopics.map((dt: any, idx: number) => {
      const match = accreditedSyllabus.topics[idx] || accreditedSyllabus.topics[0];
      return {
        id: dt.id,
        orderIndex: dt.order_index || idx + 1,
        title: dt.name || match.title,
        description: dt.description || match.description,
        keyFormulas: match.keyFormulas || [],
        examTraps: match.examTraps || "Review standard examination boundary constraints and units.",
        masteryPercentage: match.masteryPercentage || 75,
        lectureNote: match.lectureNote || `### ${dt.name}\n\nComprehensive accredited syllabus notes for ${course?.code || "this course"}.`,
      };
    });
  }, [accreditedSyllabus, dbTopics, course]);

  const canManage = useMemo(
    () => !!user && (primaryRole === "admin" || primaryRole === "tutor"),
    [user, primaryRole],
  );

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav role={navRole} />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-600">Loading course curriculum…</p>
        </div>
      </div>
    );
  }

  const enrolled = courseIds.includes(course.id);
  const isStudent = primaryRole !== "admin" && primaryRole !== "tutor";
  const levelMismatch =
    isStudent && !enrolled && !!studentLevel && !!course.level && course.level !== studentLevel;

  if (levelMismatch) {
    return (
      <div className="min-h-screen bg-background">
        <SEO title={`${course.code} — locked`} />
        <DashboardNav role={navRole} />
        <div className="max-w-3xl mx-auto px-4 py-10">
          <DashboardBreadcrumb role={navRole} />
          <EmptyState
            icon={<Lock className="w-6 h-6" />}
            title={`${course.code} is a ${course.level} Level Course`}
            description={`You're currently set to ${studentLevel}. Update your level if you've progressed, or browse courses curated for you.`}
            action={
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/profile/edit">Update Level</Link>
                </Button>
                <Button asChild>
                  <Link to="/courses">Browse My Level</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const openExplainerForTopic = (t: SyllabusTopic) => {
    setExplainerConcept(t.title);
    setExplainerTopic(t.title);
    setExplainerNotes(t.lectureNote || t.description);
    setExplainerOpen(true);
  };

  const openReaderForTopic = (t: SyllabusTopic) => {
    setReaderTitle(t.title);
    setReaderContent(t.lectureNote || `### ${t.title}\n\n${t.description}`);
    setReaderOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-24">
      <SEO
        title={`${course.code}: ${course.name} — OverraPrep`}
        description={`Syllabus breakdown, lecture notes with KaTeX equations, CBT simulation questions, and grounded AI explainer for ${course.code}.`}
      />
      <DashboardNav role={navRole} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <DashboardBreadcrumb role={navRole} />

        {/* Header Hero Banner */}
        <header className="relative mt-2 mb-6 rounded-3xl border border-amber-200/80 overflow-hidden bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-5 sm:p-7 shadow-xs">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white grid place-items-center shadow-md shrink-0">
                <BookOpen className="w-7 h-7" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-0 font-extrabold tracking-wider text-xs">
                    {course.code}
                  </Badge>
                  {accreditedSyllabus && (
                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900 font-bold text-[11px]">
                      {accreditedSyllabus.creditUnits} Units
                    </Badge>
                  )}
                  {course.level && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      {course.level} Level
                    </span>
                  )}
                  {accreditedSyllabus && (
                    <span className="text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                      {accreditedSyllabus.semester}
                    </span>
                  )}
                  {enrolled && (
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 border-0 text-[10px] font-bold">
                      Enrolled
                    </Badge>
                  )}
                </div>

                <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-extrabold mt-2 text-neutral-900 leading-tight">
                  {course.name}
                </h1>

                {course.description && (
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2 line-clamp-2 max-w-2xl leading-relaxed">
                    {course.description}
                  </p>
                )}
              </div>
            </div>

            {/* Launch CBT & Quick CTA */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
              <Button
                asChild
                className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-sm rounded-xl h-10 px-4 shadow-sm"
              >
                <Link to={`/practice?course=${course.id}`}>
                  <Play className="w-4 h-4 mr-1.5 fill-current" />
                  Launch CBT Simulation
                </Link>
              </Button>

              {canManage && (
                <Button asChild size="sm" variant="outline" className="h-10 rounded-xl border-neutral-300 text-xs">
                  <Link to={`/tutor/courses/${course.id}/manage`}>
                    <Settings className="w-3.5 h-3.5 mr-1.5" /> Manage
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Progress Card */}
        <CourseProgressCard
          courseId={course.id}
          courseCode={course.code}
          totalDocs={documents.length + combinedTopics.length}
          totalQuizzes={quizzes.length}
          totalFlashcards={flashDecks.length}
        />

        {/* Topic Filter Chips */}
        <CourseTopicsStrip courseId={course.id} value={topicFilter} onChange={setTopicFilter} />

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", v);
            setSearchParams(next, { replace: true });
          }}
          className="w-full"
        >
          <div className="sticky top-[56px] z-10 -mx-4 px-4 py-2 bg-neutral-50/90 backdrop-blur-md border-b border-neutral-200/80 mb-5">
            <TabsList className="w-full overflow-x-auto justify-start gap-1 h-auto p-1 bg-white border border-neutral-200 rounded-2xl shadow-xs">
              <TabsTrigger
                value="syllabus"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <BookOpen className="w-3.5 h-3.5" /> Syllabus
                {combinedTopics.length > 0 && (
                  <span className="text-[10px] opacity-75">{combinedTopics.length}</span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="documents"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <FileText className="w-3.5 h-3.5" /> Notes & PDFs
                {documents.length > 0 && (
                  <span className="text-[10px] opacity-75">{documents.length}</span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="quizzes"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <ClipboardList className="w-3.5 h-3.5" /> CBT Quizzes
                {quizzes.length > 0 && (
                  <span className="text-[10px] opacity-75">{quizzes.length}</span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="flashcards"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <Layers className="w-3.5 h-3.5" /> Flashcards
              </TabsTrigger>

              <TabsTrigger
                value="ai"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Explainer
              </TabsTrigger>

              <TabsTrigger
                value="images"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <ImageIcon className="w-3.5 h-3.5" /> Visuals
              </TabsTrigger>

              <TabsTrigger
                value="discuss"
                className="gap-1.5 rounded-xl text-xs font-bold data-[state=active]:bg-neutral-900 data-[state=active]:text-white transition"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Discussion
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TAB 1: SYLLABUS & TOPICS CHECKLIST */}
          <TabsContent value="syllabus" className="space-y-4">
            {/* Syllabus Overview Card */}
            {accreditedSyllabus && (
              <div className="rounded-2xl border border-amber-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                      NUC Benchmark Course Outline
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-700 mt-1 leading-relaxed">
                      {accreditedSyllabus.overview}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-bold shrink-0 rounded-xl"
                    onClick={() => {
                      setExplainerConcept(course.code);
                      setExplainerTopic("Full Course Scope");
                      setExplainerNotes(accreditedSyllabus.overview);
                      setExplainerOpen(true);
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    AI Overview
                  </Button>
                </div>
              </div>
            )}

            {/* Topics List */}
            <div className="space-y-3">
              {combinedTopics.map((topic, index) => (
                <Card
                  key={topic.id}
                  className="p-4 sm:p-5 rounded-2xl border border-neutral-200 hover:border-amber-300 bg-white shadow-xs transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      {/* Topic Number & Title */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-800 font-extrabold text-xs grid place-items-center">
                          {topic.orderIndex || index + 1}
                        </span>
                        <h4 className="font-display font-bold text-base text-neutral-900">
                          {topic.title}
                        </h4>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Verified Syllabus
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs sm:text-[13px] text-neutral-600 leading-relaxed">
                        {topic.description}
                      </p>

                      {/* KaTeX Key Formulas Preview */}
                      {topic.keyFormulas && topic.keyFormulas.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-neutral-500">Key Formulas:</span>
                          {topic.keyFormulas.map((f, fIdx) => (
                            <span
                              key={fIdx}
                              className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800"
                            >
                              <MathMarkdown content={`$${f}$`} />
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Exam Traps Warning Box */}
                      {topic.examTraps && (
                        <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-900 mr-1">CBT Trap:</span>
                            <span>{topic.examTraps}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-row md:flex-col items-center gap-2 shrink-0 pt-1">
                      <Button
                        size="sm"
                        onClick={() => openExplainerForTopic(topic)}
                        className="flex-1 md:flex-initial h-8.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Explain Concept
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReaderForTopic(topic)}
                        className="flex-1 md:flex-initial h-8.5 px-3 border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-semibold text-xs rounded-xl"
                      >
                        <BookOpen className="w-3.5 h-3.5 mr-1 text-neutral-500" />
                        Read Notes
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="flex-1 md:flex-initial h-8.5 px-2.5 text-neutral-600 hover:text-amber-800 text-xs font-medium"
                      >
                        <Link to={`/practice?course=${course.id}`}>
                          <ClipboardList className="w-3.5 h-3.5 mr-1 text-amber-600" />
                          Drill Past Qs
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TAB 2: DOCUMENTS & LECTURE NOTES */}
          <TabsContent value="documents" className="space-y-4">
            {/* Syllabus Notes Section */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-100 text-amber-800">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <h3 className="font-display font-bold text-sm text-neutral-900">
                    Curriculum Notes Reader (KaTeX Formatted)
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 font-medium">In-App Reading</span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {combinedTopics.map((t, idx) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-neutral-100 hover:border-amber-200 bg-neutral-50/60 hover:bg-amber-50/20 transition flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {idx + 1}. {t.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                        {t.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs font-semibold px-2.5 rounded-lg border-neutral-200 text-amber-900 hover:bg-amber-100/50"
                      onClick={() => openReaderForTopic(t)}
                    >
                      Read Note
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tutor Uploads Section */}
            <div className="pt-2">
              <h3 className="font-display font-bold text-sm text-neutral-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500" />
                Department Materials & Files ({documents.length})
              </h3>

              {documents.length === 0 ? (
                <EmptyState
                  icon={<FileText className="w-6 h-6" />}
                  title="No Custom PDF Uploads Yet"
                  description="Your departmental course rep or tutor hasn't attached extra PDF handouts yet. You can use the verified curriculum notes above in the meantime."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {documents.map((d: any) => (
                    <Card key={d.id} className="p-3.5 flex items-start gap-3 rounded-2xl border-neutral-200">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-1">{d.title}</h3>
                        {d.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {d.description}
                          </p>
                        )}
                        <div className="mt-2.5 flex gap-1.5 flex-wrap">
                          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg">
                            <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> Open
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs rounded-lg">
                            <a href={d.file_url} download>
                              <Download className="w-3 h-3 mr-1" /> Save
                            </a>
                          </Button>
                          <CourseOfflineButton
                            materialId={d.id}
                            title={d.title}
                            url={d.file_url}
                            courseId={course.id}
                            courseCode={course.code}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: QUIZZES & CBT SIMULATION */}
          <TabsContent value="quizzes" className="space-y-4">
            {/* CBT Exam Suite Launch Card */}
            <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-500 to-amber-600 p-5 sm:p-7 text-white shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <span className="text-[11px] uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                    CBT Examination Suite
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold">
                    Simulate {course.code} University CBT Exam
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                    Practice with authentic past examination questions, timed countdown timer, instant KaTeX solutions, and score diagnostics.
                  </p>
                </div>

                <Button
                  asChild
                  className="bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-xs sm:text-sm h-11 px-6 rounded-2xl shrink-0 self-start sm:self-center shadow-lg"
                >
                  <Link to={`/practice?course=${course.id}`}>
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Start Exam Simulation
                  </Link>
                </Button>
              </div>
            </div>

            {/* Quizzes list */}
            {quizzes.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title="Standard CBT Practice Available Above"
                description="Use the simulation launcher above to practice verified university past questions for this course."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {quizzes.map((q: any) => (
                  <QuizCard
                    key={q.id}
                    quiz={{ ...q, course_code: course.code }}
                    variant="full"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 4: FLASHCARDS */}
          <TabsContent value="flashcards" className="space-y-4">
            <FlashcardProgressStrip courseId={course.id} />
            {flashDecks.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-6 h-6" />}
                title="No Flashcards Yet"
                description="Tutors or students can generate flashcards from syllabus notes in the AI Explainer tab."
              />
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {flashDecks.map((c: any) => (
                  <Card key={c.id} className="p-4 rounded-2xl border-neutral-200">
                    <p className="text-sm font-bold text-neutral-900 line-clamp-2">{c.front}</p>
                    <p className="text-xs text-neutral-600 mt-2 line-clamp-3 leading-relaxed">{c.back}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 5: GROUNDED AI EXPLAINER */}
          <TabsContent value="ai" className="space-y-5">
            {/* Interactive Concept Search Card */}
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-xl bg-amber-500 text-white">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="font-display font-extrabold text-base text-neutral-900">
                  Grounded AI Concept Explainer
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl leading-relaxed">
                Powered by Gemini with strict anti-hallucination guardrails and KaTeX math formatting. Enter any formula, definition, or concept from {course.code} to get a 4-part breakdown (Analogy, Core Formula, Exam Traps, and Comprehension Check).
              </p>

              {/* Concept input */}
              <div className="mt-4 flex flex-col sm:flex-row gap-2 max-w-xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <Input
                    placeholder={`e.g. ${combinedTopics[0]?.title || "Concept to explain..."}`}
                    value={customConceptQuery}
                    onChange={(e) => setCustomConceptQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && customConceptQuery.trim()) {
                        setExplainerConcept(customConceptQuery.trim());
                        setExplainerTopic(customConceptQuery.trim());
                        setExplainerNotes(`Concept query for ${course.code}`);
                        setExplainerOpen(true);
                      }
                    }}
                    className="pl-9 h-10 rounded-xl bg-white border-neutral-300 text-xs sm:text-sm"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (customConceptQuery.trim()) {
                      setExplainerConcept(customConceptQuery.trim());
                      setExplainerTopic(customConceptQuery.trim());
                      setExplainerNotes(`Concept query for ${course.code}`);
                      setExplainerOpen(true);
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl h-10 px-4 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Explain Now
                </Button>
              </div>

              {/* Suggested topics from syllabus */}
              <div className="mt-4 pt-4 border-t border-amber-200/50">
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  High-Yield Syllabus Topics:
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {combinedTopics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openExplainerForTopic(t)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 hover:bg-amber-100/60 text-xs font-semibold transition"
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Document-based AI Generation Panel */}
            <CourseAIPanel courseId={course.id} courseCode={course.code} topicId={topicFilter} />
          </TabsContent>

          {/* TAB 6: IMAGES & VISUALS */}
          <TabsContent value="images" className="space-y-4">
            {images.length === 0 ? (
              <EmptyState
                icon={<ImageIcon className="w-6 h-6" />}
                title="No Visuals Yet"
                description="Diagrams, circuit schematics, and reaction mechanisms uploaded by tutors land here."
              />
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img: any) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <div className="aspect-square rounded-2xl overflow-hidden border border-neutral-200 bg-muted">
                      <img
                        src={img.url}
                        alt={img.caption || "Course image"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </div>
                    {img.caption && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{img.caption}</p>
                    )}
                  </a>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 7: DISCUSSION */}
          <TabsContent value="discuss" className="space-y-4">
            <CourseChat courseId={course.id} courseCode={course.code} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Grounded AI Explainer Modal */}
      <ExplainConceptSheet
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        conceptTitle={explainerConcept}
        courseCode={course.code}
        courseTitle={course.name}
        courseLevel={course.level || studentLevel || "100"}
        universityName={course.university || "Nigerian University"}
        topicTitle={explainerTopic}
        contextNotes={explainerNotes}
      />

      {/* In-App Lecture Notes Reader Modal */}
      <LectureNoteReaderModal
        open={readerOpen}
        onOpenChange={setReaderOpen}
        title={readerTitle}
        courseCode={course.code}
        courseTitle={course.name}
        content={readerContent}
        onOpenExplainer={() => {
          setExplainerConcept(readerTitle);
          setExplainerTopic(readerTitle);
          setExplainerNotes(readerContent);
          setExplainerOpen(true);
        }}
        onLaunchPractice={() => {
          setReaderOpen(false);
          navigate(`/practice?course=${course.id}`);
        }}
      />
    </div>
  );
};

export default CourseHub;