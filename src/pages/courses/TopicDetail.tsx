import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseTopics, useTopicQuestionCounts, useTopicActivity } from "@/hooks/useCourseLearning";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, Section, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import { coachHref } from "@/lib/coachLink";

/** One topic: what you'll learn, what you can practise, and where to get help. */
const TopicDetail = () => {
  const { courseId = "", topicId = "" } = useParams();
  const { user } = useAuth();

  const { data: course } = useQuery({
    queryKey: ["course-workspace", user?.id, courseId],
    enabled: !!user && !!courseId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, code, name, level, department, university_code")
        .eq("id", courseId)
        .maybeSingle();
      return data;
    },
  });

  const { data: topics = [], isLoading } = useCourseTopics(courseId);
  const { data: counts = {} } = useTopicQuestionCounts(courseId);
  const { data: activity = [] } = useTopicActivity();

  const topic = topics.find((t) => t.id === topicId) ?? null;
  const questionCount = counts[topicId] ?? 0;
  const prior = topic
    ? activity.find((a) => (a.topic ?? "").trim().toLowerCase() === topic.name.trim().toLowerCase())
    : null;

  const { data: materials = [] } = useQuery({
    queryKey: ["topic-materials", user?.id, topicId],
    enabled: !!user && !!topicId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lecture_notes")
        .select("id, title, file_url")
        .eq("topic_id", topicId)
        .eq("is_published", true)
        .limit(10);
      return data ?? [];
    },
  });

  const askHref = topic
    ? coachHref({
        courseId,
        courseCode: course?.code ?? null,
        topicId,
        topicName: topic.name,
      })
    : "/coach/chat";

  return (
    <>
      <SEO title={topic ? `${topic.name}` : "Topic"} description="Study this topic and practise it." noindex />
      <Screen>
        {isLoading ? (
          <div className="pt-8 space-y-4">
            <BrandSkeleton h={40} />
            <BrandSkeleton h={120} />
          </div>
        ) : !topic ? (
          <div className="pt-8">
            <EmptyState
              title="Topic not found"
              description="This topic may have been moved or is not available in your environment."
              action={<BrandButton to={`/courses/${courseId}`}>Back to course</BrandButton>}
            />
          </div>
        ) : (
          <>
            <ScreenHeader
              back
              chip={
                course && (
                  <Link
                    to={`/courses/${courseId}`}
                    className="text-[12px] font-bold uppercase tracking-[0.16em] text-env"
                  >
                    {course.code}
                  </Link>
                )
              }
              title={topic.name}
            />

            {topic.description && (
              <Section title="What you'll learn">
                <p className="text-[15px] leading-relaxed text-brand-ink-soft">{topic.description}</p>
              </Section>
            )}

            <Section title="Practice this topic">
              {questionCount > 0 ? (
                <div className="rounded-brand-lg border border-brand-line bg-brand-surface p-5">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-brand-ink">
                    <Target className="h-4.5 w-4.5 text-env" aria-hidden />
                    {Math.min(questionCount, 20)} question
                    {Math.min(questionCount, 20) === 1 ? "" : "s"}
                  </p>
                  {prior && (
                    <p className="mt-1.5 text-[13px] text-brand-ink-soft">
                      You've practised this before — last score {Math.round(prior.mastery_score)}%.
                    </p>
                  )}
                  <BrandButton
                    block
                    className="mt-4"
                    to={`/courses/${courseId}/topics/${topicId}/practice`}
                  >
                    {prior ? "Practise again" : "Start practice"}
                  </BrandButton>
                </div>
              ) : (
                <EmptyState
                  title="No practice available yet"
                  description="We're preparing questions for this topic."
                />
              )}
            </Section>

            {materials.length > 0 && (
              <Section title="Study material">
                <ul className="divide-y divide-brand-line rounded-brand border border-brand-line bg-brand-surface">
                  {materials.map((m: any) => (
                    <li key={m.id}>
                      <a
                        href={m.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-[56px] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-brand-soft"
                      >
                        <FileText className="h-4.5 w-4.5 shrink-0 text-brand-ink-soft" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-brand-ink">
                          {m.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Ask Overra">
              <Link
                to={askHref}
                className="flex items-center gap-3 rounded-brand-lg border border-brand-line bg-brand-surface p-4 transition-colors hover:bg-brand-soft"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-[15px] font-semibold text-brand-ink">
                  Ask Overra about {topic.name}
                </span>
              </Link>
            </Section>
          </>
        )}
      </Screen>
    </>
  );
};

export default TopicDetail;
