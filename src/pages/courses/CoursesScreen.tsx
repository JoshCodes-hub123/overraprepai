import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Search, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyCourses } from "@/hooks/useMyCourses";
import { useCourseSnapshots } from "@/hooks/useCourseSnapshots";
import { useReadinessAll } from "@/hooks/useIntelligence";
import { useAcademicIdentity } from "@/hooks/useAcademicIdentity";
import { nextStepFor } from "@/lib/nextStep";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, Section, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import CourseRow from "@/components/dashboard/mobile/CourseRow";
import CourseDirectory from "@/pages/courses/CourseDirectory";

/**
 * The student's Courses screen: their own academic courses first, one search
 * field, nothing else. Search is scoped by RLS to the student's own
 * university environment, so FUTA never sees OAU, UI, FUTEsIyin or JAMB.
 */
const CoursesScreen = () => {
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();
  const { parts } = useAcademicIdentity();
  const { courseIds, refresh } = useMyCourses();
  const { data: enrolled = [], isLoading } = useCourseSnapshots();
  const { data: readiness = [] } = useReadinessAll();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const weakByCourse = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of readiness) {
      const topic = r.weak_topics?.[0]?.topic;
      if (r.course_id && topic) map[r.course_id] = topic;
    }
    return map;
  }, [readiness]);

  const term = q.trim().toLowerCase();

  const mine = useMemo(() => {
    if (!term) return enrolled;
    return enrolled.filter((c: any) =>
      `${c.code} ${c.name}`.toLowerCase().includes(term),
    );
  }, [enrolled, term]);

  // Only searched — we never dump the whole catalogue on this screen.
  const { data: catalogue = [] } = useQuery({
    queryKey: ["course-search-scoped", term],
    enabled: term.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, level")
        .eq("is_active", true)
        .or(`code.ilike.%${term}%,name.ilike.%${term}%`)
        .order("code")
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const addable = useMemo(
    () => catalogue.filter((c: any) => !courseIds.includes(c.id)),
    [catalogue, courseIds],
  );

  const enroll = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { error } = await (supabase as any)
      .from("student_courses")
      .insert({ student_id: user.id, course_id: id });
    setBusy(null);
    if (error) return toast.error("Could not add that course");
    toast.success("Course added");
    refresh();
    qc.invalidateQueries({ queryKey: ["course-snapshots"] });
  };

  // Tutors and admins keep the full catalogue/management view untouched.
  if (primaryRole === "admin" || primaryRole === "tutor") return <CourseDirectory />;

  return (
    <>
      <SEO title="Courses" description="Your academic courses on OverraPrep AI." noindex />
      <Screen>
        <ScreenHeader
          title="Courses"
          subtitle={parts.length ? parts.join(" · ") : undefined}
        />

        <div className="relative mb-6">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink-soft/70"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses…"
            aria-label="Search courses"
            className="h-12 w-full rounded-full border border-brand-line bg-brand-surface pl-11 pr-4 text-[15px] text-brand-ink placeholder:text-brand-ink-soft/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-env"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2.5">
            <BrandSkeleton h={82} />
            <BrandSkeleton h={82} />
            <BrandSkeleton h={82} />
          </div>
        ) : mine.length > 0 ? (
          <div className="space-y-2.5">
            {mine.map((c: any) => {
              const step = nextStepFor({
                weakTopicName: weakByCourse[c.id] ?? null,
                lastOpenedAt: c.last_opened_at,
              });
              return (
                <CourseRow
                  key={c.id}
                  id={c.id}
                  code={c.code}
                  name={c.name}
                  department={c.department}
                  level={c.level}
                  unreadUpdates={c.unread_updates ?? 0}
                  actionLabel={step.label}
                />
              );
            })}
          </div>
        ) : term ? (
          <p className="py-2 text-[13.5px] text-brand-ink-soft">
            None of your courses match “{q.trim()}”.
          </p>
        ) : (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No courses yet"
            description="Choose the courses you're currently studying to personalise your dashboard."
            action={<BrandButton onClick={() => navigate("/courses/browse")}>Choose courses</BrandButton>}
          />
        )}

        {addable.length > 0 && (
          <Section title="Add to your courses" className="mt-8">
            <div className="space-y-2.5">
              {addable.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-brand border border-brand-line bg-brand-surface px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold tracking-tight text-brand-ink">
                      {c.code}
                    </p>
                    <p className="mt-0.5 truncate text-[13.5px] text-brand-ink-soft">{c.name}</p>
                  </div>
                  <BrandButton
                    size="md"
                    variant="secondary"
                    loading={busy === c.id}
                    onClick={() => enroll(c.id)}
                    className="h-10 shrink-0 px-4 text-[14px]"
                  >
                    <Plus className="h-4 w-4" aria-hidden /> Add
                  </BrandButton>
                </div>
              ))}
            </div>
          </Section>
        )}

        {mine.length > 0 && !term && (
          <div className="mt-8">
            <BrandButton variant="secondary" block to="/courses/browse">
              Browse all courses
            </BrandButton>
          </div>
        )}
      </Screen>
    </>
  );
};

export default CoursesScreen;
