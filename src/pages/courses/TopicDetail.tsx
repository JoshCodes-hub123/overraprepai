import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, Target, Eye, Download, BookOpen } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCourseTopics, useTopicQuestionCounts, useTopicActivity } from "@/hooks/useCourseLearning";
import { useCourseMaterials, StudyMaterial } from "@/hooks/useStudyMaterials";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, Section, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import { InAppDocViewer } from "@/components/viewer/InAppDocViewer";
import { coachHref } from "@/lib/coachLink";

/** One topic: what you'll learn, what you can practise, and where to get help. */
const TopicDetail = () => {
  const { courseId = "", topicId = "" } = useParams();
  const { user } = useAuth();
  const [viewerDoc, setViewerDoc] = useState<{ url: string; title: string; fileType?: string } | null>(null);

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

  const { data: materialsData } = useCourseMaterials(courseId);

  const totalCourseNotes = useMemo(() => {
    if (!materialsData?.groups) return 0;
    return materialsData.groups.reduce((acc, g) => acc + g.items.length, 0);
  }, [materialsData]);

  const materials = useMemo<StudyMaterial[]>(() => {
    if (!materialsData?.groups) return [];
    const matched: StudyMaterial[] = [];
    for (const g of materialsData.groups) {
      if (
        g.topicId === topicId ||
        (topic && g.topicName.trim().toLowerCase() === topic.name.trim().toLowerCase())
      ) {
        matched.push(...g.items);
      }
    }
    return matched;
  }, [materialsData, topicId, topic]);

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

            {materials.length > 0 ? (
              <Section title="Study Material & Notes">
                <div className="space-y-2.5">
                  {materials.map((m: any) => {
                    const isPdf =
                      m.file_type?.toLowerCase().includes("pdf") ||
                      m.file_url?.toLowerCase().endsWith(".pdf");

                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl border border-neutral-200 bg-white hover:border-amber-400 transition flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPdf
                                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                                : "bg-amber-500/15 text-amber-800"
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {isPdf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                                  PDF
                                </span>
                              )}
                              <h5 className="font-semibold text-sm text-neutral-900 truncate">
                                {m.title}
                              </h5>
                            </div>
                            {m.description && (
                              <p className="text-xs text-neutral-500 truncate">{m.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setViewerDoc({
                                url: m.file_url,
                                title: m.title,
                                fileType: m.file_type || (isPdf ? "application/pdf" : undefined),
                              })
                            }
                            className="h-8 px-3 text-xs font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 flex items-center gap-1.5 shadow-2xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Read</span>
                          </button>
                          {m.file_url && (
                            <a
                              href={m.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="p-2 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            ) : totalCourseNotes > 0 ? (
              <Section title="Study Material & Notes">
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-amber-800 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">
                        {totalCourseNotes} lecture note{totalCourseNotes === 1 ? "" : "s"} uploaded for this course
                      </p>
                      <p className="text-[11px] text-neutral-600">
                        Syllabi and general reading materials are under the course notes tab.
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/courses/${courseId}?tab=notes`}
                    className="text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl shrink-0 transition"
                  >
                    View Notes
                  </Link>
                </div>
              </Section>
            ) : null}

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

      {viewerDoc && (
        <InAppDocViewer
          open={!!viewerDoc}
          onOpenChange={(open) => !open && setViewerDoc(null)}
          url={viewerDoc.url}
          title={viewerDoc.title}
          fileType={viewerDoc.fileType}
        />
      )}
    </>
  );
};

export default TopicDetail;
