import { useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
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
import {
  BookOpen, FileText, Layers, ClipboardList, Image as ImageIcon, Sparkles,
  Download, ExternalLink, Settings, MessageSquare, Headphones, Lock,
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

const VALID_TABS = ["documents", "flashcards", "quizzes", "audio", "ai", "images", "discuss"] as const;
type TabValue = typeof VALID_TABS[number];

const CourseHub = () => {
  const { courseId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, primaryRole } = useAuth();
  const { level: studentLevel } = useStudentScope();
  const { courseIds } = useMyCourses();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const requestedTab = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = requestedTab && (VALID_TABS as readonly string[]).includes(requestedTab)
    ? requestedTab
    : "documents";
  useTrackCourseOpen(courseId);

  const { data: course } = useQuery({
    queryKey: ["course", user?.id, courseId],
    enabled: !!courseId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description, created_by")
        .eq("id", courseId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

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
            id: t.id, full_name: t.full_name,
            avatar_url: t.avatar_url || t.profile_image_url,
            organisation_name: t.organisation_name,
            organisation_logo_url: t.organisation_logo_url,
          } : null;
        })() : null,
      }));
    },
  });

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

  const canManage = useMemo(
    () => !!user && (primaryRole === "admin" || primaryRole === "tutor"),
    [user, primaryRole, course],
  );

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav role={navRole} />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground">Loading course…</p>
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
            title={`${course.code} is a ${course.level} course`}
            description={`You're currently set to ${studentLevel}. Update your level if you've progressed, or browse courses curated for you.`}
            action={
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/profile/edit">Update level</Link>
                </Button>
                <Button asChild>
                  <Link to="/my-courses">See my level</Link>
                </Button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course.code} — ${course.name}`} description={`All documents, quizzes, flashcards, images and AI study packs for ${course.code}.`} />
      <DashboardNav role={navRole} />
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        <DashboardBreadcrumb role={navRole} />

        <header className="relative mt-2 mb-6 rounded-2xl border border-amber-200/60 overflow-hidden bg-gradient-to-br from-amber-50/70 via-white to-white p-5 md:p-6">
          <div aria-hidden className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-start gap-4 md:gap-5">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center shadow-md shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className="bg-amber-500 text-white hover:bg-amber-500 border-0 font-bold tracking-wider">{course.code}</Badge>
                {course.level && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    {course.level}
                  </span>
                )}
                {course.department && (
                  <span className="text-[11px] text-muted-foreground">· {course.department}</span>
                )}
                {enrolled && (
                  <Badge className="bg-emerald-500 text-white hover:bg-emerald-500 border-0 text-[10px]">
                    Enrolled
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-xl md:text-2xl font-bold mt-2 leading-tight">{course.name}</h1>
              {course.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3 max-w-2xl">{course.description}</p>
              )}
            </div>
            {canManage && (
              <Button asChild size="sm" variant="outline" className="shrink-0 self-start">
                <Link to={`/tutor/courses/${course.id}/manage`}><Settings className="w-3.5 h-3.5 mr-1.5" /> Manage</Link>
              </Button>
            )}
          </div>
        </header>

        <CourseProgressCard
          courseId={course.id}
          courseCode={course.code}
          totalDocs={documents.length}
          totalQuizzes={quizzes.length}
          totalFlashcards={flashDecks.length}
        />

        <CourseTopicsStrip courseId={course.id} value={topicFilter} onChange={setTopicFilter} />

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const next = new URLSearchParams(searchParams);
            next.set("tab", v);
            setSearchParams(next, { replace: true });
          }}
          className="w-full"
        >
          <div className="sticky top-[56px] z-10 -mx-4 px-4 py-2 bg-background/85 backdrop-blur-md border-b border-border/60 mb-4">
            <TabsList className="w-full overflow-x-auto justify-start gap-1 h-auto p-1 bg-muted/50 rounded-full">
              <TabsTrigger value="documents" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <FileText className="w-3.5 h-3.5" /> Materials
                {documents.length > 0 && <span className="text-[10px] opacity-70">{documents.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <Layers className="w-3.5 h-3.5" /> Flashcards
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <ClipboardList className="w-3.5 h-3.5" /> Quizzes
                {quizzes.length > 0 && <span className="text-[10px] opacity-70">{quizzes.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <Headphones className="w-3.5 h-3.5" /> Audio
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <Sparkles className="w-3.5 h-3.5" /> AI Packs
              </TabsTrigger>
              <TabsTrigger value="images" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <ImageIcon className="w-3.5 h-3.5" /> Visuals
              </TabsTrigger>
              <TabsTrigger value="discuss" className="gap-1.5 rounded-full data-[state=active]:bg-foreground data-[state=active]:text-background">
                <MessageSquare className="w-3.5 h-3.5" /> Discussion
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="documents" className="mt-2">
            {documents.length === 0 ? (
              <EmptyState icon={<FileText className="w-6 h-6" />} title="No materials yet" description="Once your tutor uploads notes or PDFs, you'll find them here." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {documents.map((d: any) => (
                  <Card key={d.id} className="p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-1">{d.title}</h3>
                      {d.description && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{d.description}</p>}
                      <div className="mt-2 flex gap-1.5 flex-wrap">
                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3 h-3 mr-1" /> Open</a>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <a href={d.file_url} download><Download className="w-3 h-3 mr-1" /> Save</a>
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
          </TabsContent>

          <TabsContent value="flashcards" className="mt-2">
            <FlashcardProgressStrip courseId={course.id} />
            {flashDecks.length === 0 ? (
              <EmptyState icon={<Layers className="w-6 h-6" />} title="No flashcards yet" description="Tutors can publish decks from the Manage page." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {flashDecks.map((c: any) => (
                  <Card key={c.id} className="p-3">
                    <p className="text-sm font-semibold line-clamp-2">{c.front}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{c.back}</p>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quizzes" className="mt-2">
            {quizzes.length === 0 ? (
              <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="No quizzes yet" description="Active quizzes for this course will appear here." />
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

          <TabsContent value="images" className="mt-2">
            {images.length === 0 ? (
              <EmptyState icon={<ImageIcon className="w-6 h-6" />} title="No visuals yet" description="Diagrams, charts and figures from your tutor land here." />
            ) : (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img: any) => (
                  <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer" className="group block">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img src={img.url} alt={img.caption || "Course image"} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    {img.caption && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{img.caption}</p>}
                  </a>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="mt-2">
            <CourseAIPanel courseId={course.id} courseCode={course.code} topicId={topicFilter} />
          </TabsContent>

          <TabsContent value="audio" className="mt-2">
            <CourseAudioPanel courseId={course.id} courseCode={course.code} topicId={topicFilter} />
          </TabsContent>

          <TabsContent value="discuss" className="mt-2">
            <CourseChat courseId={course.id} courseCode={course.code} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CourseHub;