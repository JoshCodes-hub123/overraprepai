import { Link } from "react-router-dom";
import { Target, Sparkles } from "lucide-react";

import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton } from "@/components/ui-kit";
import { useWeakAreas } from "@/hooks/useWeakAreas";
import { coachHref } from "@/lib/coachLink";

/**
 * Weak areas built only from the student's real practice history. If there is
 * no history yet we say so plainly instead of inventing mastery numbers.
 */
const WeakAreas = () => {
  const { areas, isLoading } = useWeakAreas();

  return (
    <>
      <SEO title="Weak areas" description="Topics to strengthen, based on your practice." noindex />
      <Screen>
        <ScreenHeader
          back
          chip={
            <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
              Weak areas
            </span>
          }
          title="What to work on"
          subtitle="Based on the topics you've practised."
        />

        {isLoading ? (
          <div className="space-y-2">
            <BrandSkeleton h={72} />
            <BrandSkeleton h={72} />
            <BrandSkeleton h={72} />
          </div>
        ) : areas.length === 0 ? (
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="No weak areas yet"
            description="Keep practicing. Overra will identify the topics you need to work on."
          />
        ) : (
          <ul className="divide-y divide-brand-line rounded-brand border border-brand-line bg-brand-surface">
            {areas.map((a) => (
              <li key={`${a.courseId}-${a.topicId}`} className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {a.courseCode && (
                      <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-env">
                        {a.courseCode}
                      </p>
                    )}
                    <p className="mt-0.5 text-[15.5px] font-semibold leading-snug text-brand-ink">
                      {a.topicName}
                    </p>
                    <p className="mt-0.5 text-[13px] text-brand-ink-soft">{a.status}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  {a.topicId && (
                    <Link
                      to={`/courses/${a.courseId}/topics/${a.topicId}/practice`}
                      className="text-[13.5px] font-semibold text-brand-ink underline underline-offset-4"
                    >
                      Practise this topic
                    </Link>
                  )}
                  <Link
                    to={coachHref({
                      courseId: a.courseId,
                      courseCode: a.courseCode,
                      topicId: a.topicId,
                      topicName: a.topicName,
                    })}
                    className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-env"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden /> Ask Overra
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Screen>
    </>
  );
};

export default WeakAreas;
