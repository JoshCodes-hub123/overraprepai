import { Link } from "react-router-dom";
import { BookOpen, Sparkles } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandButton, BrandSkeleton } from "@/components/ui-kit";
import { useMyJambSubjects } from "@/hooks/useJambLearning";

/**
 * The student's four UTME subjects. Nothing from the university world ever
 * reaches this list — the rows come from JAMB subject records only.
 */
const JambSubjects = () => {
  const { rows, isLoading } = useMyJambSubjects();

  return (
    <>
      <SEO
        title="Your UTME subjects"
        description="Practise the four subjects you registered for, topic by topic."
        url="/jamb/subjects"
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
          title="Your subjects"
          subtitle="Pick a subject to see its topics."
        />

        {isLoading ? (
          <div className="space-y-3">
            <BrandSkeleton h={72} />
            <BrandSkeleton h={72} />
            <BrandSkeleton h={72} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Choose your four subjects"
            description="Tell us what you're writing and your practice builds itself around it."
            action={<BrandButton to="/onboarding/jamb">Set up my prep</BrandButton>}
          />
        ) : (
          <div className="space-y-2.5">
            {rows.map(({ name, subject }) =>
              subject ? (
                <Link
                  key={name}
                  to={`/jamb/subjects/${subject.id}`}
                  className="flex min-h-[68px] w-full items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5 transition-colors hover:bg-brand-soft"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-env-soft text-env">
                    <BookOpen className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold text-brand-ink">
                      {name}
                    </span>
                    <span className="block truncate text-[13px] text-brand-ink-soft">
                      Topics and timed practice
                    </span>
                  </span>
                </Link>
              ) : (
                <div
                  key={name}
                  className="flex min-h-[68px] w-full items-center gap-3 rounded-brand border border-dashed border-brand-line px-4 py-3.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink-soft">
                    <BookOpen className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold text-brand-ink">
                      {name}
                    </span>
                    <span className="block truncate text-[13px] text-brand-ink-soft">
                      Not available yet
                    </span>
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        <div className="mt-8">
          <BrandButton block variant="secondary" to="/onboarding/jamb">
            Edit my subjects
          </BrandButton>
        </div>
      </Screen>
    </>
  );
};

export default JambSubjects;
