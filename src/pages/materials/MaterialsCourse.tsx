import { useParams } from "react-router-dom";
import { FileText, Download, FolderOpen } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, Section, EmptyState, BrandSkeleton } from "@/components/ui-kit";
import { useCourseMaterials } from "@/hooks/useStudyMaterials";

const prettySize = (bytes?: number) => {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const prettyType = (t?: string) => {
  if (!t) return null;
  const short = t.split("/").pop()?.toUpperCase();
  return short && short.length <= 8 ? short : t.toUpperCase();
};

/** Materials for one course/subject, grouped by real topic. */
const MaterialsCourse = () => {
  const { courseId } = useParams();
  const { data, isLoading } = useCourseMaterials(courseId);
  const groups = data?.groups ?? [];

  return (
    <>
      <SEO title="Course materials" description="Materials uploaded for this course." noindex url="https://overraprep.com/materials" />
      <Screen>
        <ScreenHeader
          back
          title={data?.course?.code ?? "Materials"}
          subtitle={data?.course?.name}
        />

        {isLoading ? (
          <div className="space-y-2.5">
            <BrandSkeleton h={78} />
            <BrandSkeleton h={78} />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title="Nothing uploaded yet"
            description="Materials for this course will show up here as soon as they're uploaded."
          />
        ) : (
          groups.map((g) => (
            <Section key={g.topicId ?? "general"} title={g.topicName}>
              <div className="space-y-2.5">
                {g.items.map((m) => {
                  const bits = [
                    prettyType(m.file_type),
                    prettySize(m.file_size),
                    m.owner_name ? `by ${m.owner_name}` : null,
                    new Date(m.created_at).toLocaleDateString(),
                  ].filter(Boolean);
                  return (
                    <a
                      key={m.id}
                      href={m.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 text-left transition-colors hover:bg-brand-soft"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-brand-sm bg-env-soft text-env">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-brand-ink">{m.title}</span>
                        <span className="mt-0.5 block truncate text-[13px] text-brand-ink-soft">{bits.join(" · ")}</span>
                      </span>
                      <Download className="h-4 w-4 shrink-0 text-brand-ink-soft/60" />
                    </a>
                  );
                })}
              </div>
            </Section>
          ))
        )}
      </Screen>
    </>
  );
};

export default MaterialsCourse;
