import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandButton, BrandSkeleton, Section } from "@/components/ui-kit";
import { coachHref } from "@/lib/coachLink";
import {
  useJambSubject,
  useSubjectTopics,
  useSubjectQuestionCounts,
} from "@/hooks/useJambLearning";
import { useTopicActivity } from "@/hooks/useCourseLearning";

/** Topics inside one UTME subject, with real question counts and real history. */
const JambSubject = () => {
  const { subjectId = "" } = useParams();
  const { data: subject, isLoading } = useJambSubject(subjectId);
  const { data: topics = [], isLoading: loadingTopics } = useSubjectTopics(subjectId);
  const { data: counts = {} } = useSubjectQuestionCounts(subjectId);
  const { data: activity = [] } = useTopicActivity();

  const seen = new Map(
    activity.map((a) => [(a.topic ?? "").trim().toLowerCase(), a]),
  );

  return (
    <>
      <SEO
        title={subject?.name ? `${subject.name} — UTME practice` : "UTME subject"}
        description="Topics and timed practice for your UTME subject."
        noindex
      />
      <Screen>
        <ScreenHeader
          back
          chip={
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
              JAMB / UTME
            </span>
          }
          title={subject?.name ?? "Subject"}
          subtitle={subject?.description ?? undefined}
        />

        {isLoading || loadingTopics ? (
          <div className="space-y-3">
            <BrandSkeleton h={64} />
            <BrandSkeleton h={64} />
            <BrandSkeleton h={64} />
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            title="No topics yet"
            description="We're preparing topics for this subject."
            action={<BrandButton to="/jamb/subjects">Back to subjects</BrandButton>}
          />
        ) : (
          <Section title="Topics">
            <div className="space-y-2.5">
              {topics.map((t) => {
                const count = counts[t.id] ?? 0;
                const hit = seen.get(t.name.trim().toLowerCase());
                const meta = count > 0
                  ? `${count} question${count === 1 ? "" : "s"}${hit ? " · practised before" : ""}`
                  : "No questions yet";
                return count > 0 ? (
                  <Link
                    key={t.id}
                    to={`/jamb/subjects/${subjectId}/topics/${t.id}/practice`}
                    className="block rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 transition-colors hover:bg-brand-soft"
                  >
                    <p className="text-[15.5px] font-semibold leading-snug text-brand-ink">{t.name}</p>
                    <p className="mt-0.5 text-[13px] text-brand-ink-soft">{meta}</p>
                  </Link>
                ) : (
                  <div
                    key={t.id}
                    className="rounded-brand border border-dashed border-brand-line px-4 py-3.5"
                  >
                    <p className="text-[15.5px] font-semibold leading-snug text-brand-ink">{t.name}</p>
                    <p className="mt-0.5 text-[13px] text-brand-ink-soft">{meta}</p>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        <Link
          to={coachHref({
            courseCode: subject?.name ?? null,
            prompt: subject?.name
              ? `I'm preparing ${subject.name} for UTME. Where should I focus first?`
              : null,
          })}
          className="mt-7 flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-surface text-[15px] font-semibold text-env"
        >
          <Sparkles className="h-4 w-4" aria-hidden /> Ask Overra about {subject?.name ?? "this subject"}
        </Link>
      </Screen>
    </>
  );
};

export default JambSubject;
