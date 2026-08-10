import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Sparkles, ClipboardList, Clock } from "lucide-react";

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
import { nextStepFor, nextStepCta } from "@/lib/nextStep";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, Section, EmptyState, BrandSkeleton } from "@/components/ui-kit";
import NextStepHero from "@/components/dashboard/mobile/NextStepHero";
import CourseHub from "@/pages/courses/CourseHub";

/**
 * The student's course workspace: who am I studying, what's next, what topics
 * exist. Tutors and admins keep the full management hub untouched.
 */
const CourseWorkspace = () => {
  const { courseId = "" } = useParams();
  const { primaryRole } = useAuth();
  useTrackCourseOpen(courseId);

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

  // Every quiz published for this course — students expect the full list here.
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

  // Where the next step actually takes you — a known topic, or the first one.
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

  return (
    <>
      <SEO
        title={course ? `${course.code} — ${course.name}` : "Course"}
        description="Your course workspace: topics, practice and AI help."
        noindex
      />
      <Screen>
        {courseLoading || !course ? (
          <div className="pt-8 space-y-4">
            <BrandSkeleton h={40} />
            <BrandSkeleton h={170} />
          </div>
        ) : (
          <>
            <ScreenHeader
              back
              title={course.code}
              subtitle={course.name}
            />
            {identity && (
              <p className="-mt-3 mb-6 text-[13px] font-semibold tracking-tight text-brand-ink-soft">
                {identity}
              </p>
            )}

            {progress.studied > 0 && (
              <p className="-mt-2 mb-5 text-[13px] leading-relaxed text-brand-ink-soft">
                {progress.attempted > 0 && (
                  <>
                    {progress.attempted} question{progress.attempted === 1 ? "" : "s"} attempted ·{" "}
                    {progress.correct} correct · {progress.incorrect} incorrect
                    <br />
                  </>
                )}
                {progress.studied} topic{progress.studied === 1 ? "" : "s"} practised
                {progress.needsReview > 0 && (
                  <>
                    {" · "}
                    <Link to="/weak-areas" className="font-semibold text-brand-ink underline underline-offset-4">
                      {progress.needsReview} needing work
                    </Link>
                  </>
                )}
              </p>
            )}


            {topicsLoading ? (
              <BrandSkeleton h={170} />
            ) : (
              <NextStepHero
                eyebrow="Your next step"
                title={stepTitle}
                context={
                  step.kind === "resume-topic"
                    ? "Pick up where you stopped."
                    : step.kind === "weak-topic"
                    ? "This is the topic to strengthen next."
                    : undefined
                }
                cta={nextStepCta(step)}
                to={stepTopicId ? `/courses/${courseId}/topics/${stepTopicId}` : `/study-hub/${courseId}`}
              />
            )}

            <Section title="Topics" className="mt-8">
              {topicsLoading ? (
                <div className="space-y-2">
                  <BrandSkeleton h={58} />
                  <BrandSkeleton h={58} />
                  <BrandSkeleton h={58} />
                </div>
              ) : topics.length === 0 ? (
                <EmptyState
                  icon={<ListChecks className="h-5 w-5" />}
                  title="No topics yet"
                  description="We're preparing content for this course. Your study materials are still available."
                />
              ) : (
                <ul className="divide-y divide-brand-line rounded-brand border border-brand-line bg-brand-surface">
                  {topics.map((t, i) => {
                    const n = counts[t.id] ?? 0;
                    return (
                      <li key={t.id}>
                        <Link
                          to={`/courses/${courseId}/topics/${t.id}`}
                          className="flex min-h-[60px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
                        >
                          <span className="w-6 shrink-0 text-[12.5px] font-bold tabular-nums text-brand-ink-soft/70">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold leading-snug text-brand-ink">
                              {t.name}
                            </span>
                            {n > 0 && (
                              <span className="mt-0.5 block text-[12.5px] text-brand-ink-soft">
                                {n} question{n === 1 ? "" : "s"}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title={`Quizzes${quizzes.length ? ` (${quizzes.length})` : ""}`}>
              {quizzesLoading ? (
                <div className="space-y-2">
                  <BrandSkeleton h={58} />
                  <BrandSkeleton h={58} />
                </div>
              ) : quizzes.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="No quizzes yet"
                  description="Tutors publish quizzes for this course regularly. Practise by topic meanwhile."
                />
              ) : (
                <ul className="divide-y divide-brand-line rounded-brand border border-brand-line bg-brand-surface">
                  {quizzes.map((q: any) => (
                    <li key={q.id}>
                      <Link
                        to={`/quiz/${q.id}`}
                        className="flex min-h-[60px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
                          <ClipboardList className="h-4.5 w-4.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold leading-snug text-brand-ink">
                            {q.title}
                          </span>
                          <span className="mt-0.5 flex items-center gap-2 text-[12.5px] text-brand-ink-soft">
                            {q.question_count} question{q.question_count === 1 ? "" : "s"}
                            {q.duration_minutes ? (
                              <>
                                <span aria-hidden>·</span>
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                {q.duration_minutes} min
                              </>
                            ) : null}
                            {q.is_simulation ? <span aria-hidden>· CBT</span> : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>


            <Section
              title={`Documents & materials${materialCount ? ` (${materialCount})` : ""}`}
            >
              {materialsLoading ? (
                <div className="space-y-2">
                  <BrandSkeleton h={58} />
                  <BrandSkeleton h={58} />
                </div>
              ) : materialCount === 0 ? (
                <EmptyState
                  icon={<FileText className="h-5 w-5" />}
                  title="No documents yet"
                  description="Notes, PDFs and past questions uploaded for this course will appear here."
                />
              ) : (
                <div className="space-y-5">
                  {materialGroups.map((g) => (
                    <div key={g.topicId ?? "general"}>
                      <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-wide text-brand-ink-soft">
                        {g.topicName}
                      </p>
                      <ul className="divide-y divide-brand-line rounded-brand border border-brand-line bg-brand-surface">
                        {g.items.map((m) => (
                          <li key={m.id}>
                            <a
                              href={m.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-h-[60px] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-brand-soft"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
                                <FileText className="h-4.5 w-4.5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-semibold leading-snug text-brand-ink">
                                  {m.title}
                                </span>
                                <span className="mt-0.5 block truncate text-[12.5px] text-brand-ink-soft">
                                  {(m.file_type || "file").toUpperCase()}
                                  {m.file_size ? ` · ${Math.max(1, Math.round(m.file_size / 1024))} KB` : ""}
                                  {m.owner_name ? ` · ${m.owner_name}` : ""}
                                </span>
                              </span>
                              <Download className="h-4 w-4 shrink-0 text-brand-ink-soft/70" aria-hidden />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              <Link
                to={`/study-hub/${courseId}`}
                className="mt-4 flex items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-4 transition-colors hover:bg-brand-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-brand-ink">
                    {course.code} study hub
                  </span>
                  <span className="mt-0.5 block text-[13px] text-brand-ink-soft">
                    Notes, summaries, flashcards and AI study packs.
                  </span>
                </span>
              </Link>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
};

export default CourseWorkspace;
