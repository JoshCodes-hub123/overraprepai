import { useMemo } from "react";
import { Sparkles, Timer } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { Screen, Section, ListRow, EmptyState, BrandButton } from "@/components/ui-kit";
import BrandTopBar from "@/components/dashboard/mobile/BrandTopBar";
import NextStepHero from "@/components/dashboard/mobile/NextStepHero";
import MissionBlock from "@/components/dashboard/mobile/MissionBlock";
import CourseRow from "@/components/dashboard/mobile/CourseRow";
import AskOverraBlock from "@/components/dashboard/mobile/AskOverraBlock";
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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

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

  const identityParts = ["JAMB / UTME", p?.target_course, p?.target_university].filter(
    (x): x is string => Boolean(x),
  );

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

        <div className="pb-6 pt-6">
          <h1 className="text-[27px] font-bold leading-[1.15] tracking-tight text-brand-ink">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-semibold tracking-tight text-brand-ink-soft">
            {identityParts.map((part, i) => (
              <span key={part} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="h-1 w-1 rounded-full bg-env" />}
                <span>{part}</span>
              </span>
            ))}
          </p>
        </div>

        {todaySubject ? (
          <NextStepHero
            eyebrow="Your next step"
            kicker="Today's subject"
            title={todaySubject}
            context="Timed CBT practice, exactly like the real thing."
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

        <Section title="Today's mission" className="mt-8">
          <MissionBlock
            title={todaySubject ? `Complete one ${todaySubject} practice set` : "Start a CBT practice set"}
            meta="A short, focused session is enough for today."
            cta="Start practice"
            to={todaySubject ? `/practice?subject=${encodeURIComponent(todaySubject)}` : "/practice"}
          />
        </Section>

        {subjects.length > 0 && (
          <Section title="Your subjects" to="/onboarding/jamb" linkLabel="Edit">
            <div className="space-y-2.5">
              {subjects.map((s) => (
                <CourseRow
                  key={s}
                  to={`/practice?subject=${encodeURIComponent(s)}`}
                  code={s}
                  name="UTME subject"
                  action={s === todaySubject ? "Today's focus · practice now" : "Ready to practice"}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="Ask Overra AI">
          <AskOverraBlock />
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
