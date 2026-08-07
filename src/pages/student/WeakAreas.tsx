import { Link } from "react-router-dom";
import { Target, Sparkles, BookOpen, Play } from "lucide-react";

import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton } from "@/components/ui-kit";
import { useWeakAreas } from "@/hooks/useWeakAreas";
import { coachHref } from "@/lib/coachLink";
import { lastPracticed } from "@/lib/lastPracticed";

/**
 * Weak areas built only from the student's real practice history. Every number
 * here is counted from recorded answers — nothing is estimated.
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
          subtitle="Based only on the questions you've answered."
        />

        {isLoading ? (
          <div className="space-y-3">
            <BrandSkeleton h={148} />
            <BrandSkeleton h={148} />
            <BrandSkeleton h={148} />
          </div>
        ) : areas.length === 0 ? (
          <EmptyState
            icon={<Target className="h-5 w-5" />}
            title="Nothing to work on yet"
            description="Once you practise and miss a few questions, the topics you need to strengthen will show up here."
          />
        ) : (
          <ul className="space-y-3">
            {areas.map((a) => {
              const when = lastPracticed(a.lastSeen);
              return (
                <li
                  key={`${a.courseId}-${a.topicId}`}
                  className="rounded-brand-lg border border-brand-line bg-brand-surface p-5"
                >
                  {a.courseCode && (
                    <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-env">
                      {a.courseCode}
                    </p>
                  )}
                  <h2 className="mt-1 text-[17px] font-semibold leading-snug text-brand-ink">
                    {a.topicName}
                  </h2>

                  <p className="mt-2 text-[14px] leading-relaxed text-brand-ink-soft">
                    {a.incorrect} mistake{a.incorrect === 1 ? "" : "s"} from {a.attempted} question
                    {a.attempted === 1 ? "" : "s"}
                    {a.accuracy !== null && <> · {a.accuracy}% accuracy</>}
                  </p>
                  {a.lowData && (
                    <p className="mt-1 text-[13px] text-brand-ink-soft">
                      Not enough practice yet to judge accuracy.
                    </p>
                  )}
                  {when && (
                    <p className="mt-1 text-[13px] text-brand-ink-soft">Last practised: {when}</p>
                  )}

                  <div className="mt-4 rounded-brand border border-brand-line bg-brand-soft/60 px-4 py-3">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-brand-ink-soft">
                      Next step
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-brand-ink">
                      {a.recommendation}
                    </p>
                  </div>

                  <div className="mt-4 space-y-2">
                    {a.topicId && (
                      <>
                        <Link
                          to={`/courses/${a.courseId}/topics/${a.topicId}`}
                          className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-brand-line bg-brand-surface text-[15px] font-semibold text-brand-ink"
                        >
                          <BookOpen className="h-4 w-4" aria-hidden /> Review topic
                        </Link>
                        <Link
                          to={`/courses/${a.courseId}/topics/${a.topicId}/practice`}
                          className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-brand-ink text-[15px] font-semibold text-brand-surface"
                        >
                          <Play className="h-4 w-4" aria-hidden /> Practise
                        </Link>
                      </>
                    )}
                    <Link
                      to={coachHref({
                        courseId: a.courseId,
                        courseCode: a.courseCode,
                        topicId: a.topicId,
                        topicName: a.topicName,
                      })}
                      className="flex min-h-[52px] items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-env"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Ask Overra
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Screen>
    </>
  );
};

export default WeakAreas;
