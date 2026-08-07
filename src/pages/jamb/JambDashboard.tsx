import { useMemo } from "react";
import { Sparkles, BookOpenCheck, Timer } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Screen, Section, ListRow, EmptyState, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import ContinueBlock from "@/components/dashboard/mobile/ContinueBlock";
import QuickAccess, { quickAccessItems } from "@/components/dashboard/mobile/QuickAccess";

/**
 * JAMB / UTME home — the same calm structure as the university home, with a
 * completely separate vocabulary: subjects instead of courses, CBT practice
 * instead of campus study. No university content ever appears here.
 */
const JambDashboard = () => {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(" ")[0];
  const p = profile as any;

  const subjects: string[] = useMemo(
    () => (Array.isArray(p?.jamb_subjects) ? p.jamb_subjects.filter(Boolean) : []),
    [p],
  );

  // Rotate the recommended subject daily so practice stays balanced.
  const todaySubject = useMemo(() => {
    if (!subjects.length) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    return subjects[day % subjects.length];
  }, [subjects]);

  const goal = [p?.target_course, p?.target_university].filter(Boolean).join(" · ");

  return (
    <>
      <SEO
        title="JAMB / UTME Dashboard"
        description="Your JAMB preparation hub: CBT simulation, mock exams and daily subject practice."
        url="/jamb/dashboard"
        noindex
      />
      <Screen>
        <BrandTopBar />

        <div className="pb-7 pt-7">
          <h1 className="text-[30px] font-bold leading-[1.1] tracking-tight text-brand-ink">
            {firstName ? `Hello, ${firstName}` : "Welcome back"}
          </h1>
          <p className="mt-2 text-[14px] font-medium tracking-wide text-brand-ink-soft">
            {goal ? `JAMB / UTME · ${goal}` : "JAMB / UTME"}
          </p>
        </div>

        {todaySubject ? (
          <ContinueBlock
            eyebrow="Continue practice"
            title={todaySubject}
            meta="Timed CBT practice, exactly like the real thing"
            cta="Continue"
            to={`/practice?subject=${encodeURIComponent(todaySubject)}`}
          />
        ) : (
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Choose your four subjects"
            description="Tell us what you're writing and your dashboard builds itself around it."
            action={<BrandButton to="/onboarding/jamb">Set up my prep</BrandButton>}
          />
        )}

        <Section title="Today" className="mt-8">
          <ListRow
            to={todaySubject ? `/practice?subject=${encodeURIComponent(todaySubject)}` : "/practice"}
            title={todaySubject ? `Focus on ${todaySubject}` : "Start a CBT practice set"}
            meta="Recommended for you today"
            icon={<Sparkles className="h-5 w-5" />}
          />
        </Section>

        <Section title="Your subjects" to="/onboarding/jamb" linkLabel="Edit">
          {subjects.length === 0 ? (
            <EmptyState title="No subjects yet" description="Pick four UTME subjects to begin." />
          ) : (
            <div className="space-y-2.5">
              {subjects.map((s) => (
                <ListRow
                  key={s}
                  to={`/practice?subject=${encodeURIComponent(s)}`}
                  title={s}
                  meta="Practice questions"
                  icon={<BookOpenCheck className="h-5 w-5" />}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Go to">
          <QuickAccess items={quickAccessItems("CBT Practice", "Real UTME timing and interface")} />
          <div className="mt-2.5">
            <ListRow
              to="/exams"
              title="Mock exams"
              meta="Full four-subject papers"
              icon={<Timer className="h-5 w-5" />}
            />
          </div>
        </Section>
      </Screen>
    </>
  );
};

export default JambDashboard;
