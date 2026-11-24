import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FolderOpen, FileText, ArrowRight } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import useEnvironment from "@/hooks/useEnvironment";
import { useMaterialCourses } from "@/hooks/useStudyMaterials";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import type { AcademicSemester } from "@/lib/cleanSlateManager";

/**
 * Study Materials — unified view of all 1st & 2nd Semester uploaded documents
 * across Server Store, study_materials, and lecture_notes.
 */
const StudyMaterials = () => {
  const { label } = useEnvironment();
  const { data: courses = [], isLoading } = useMaterialCourses();
  const [semesterFilter, setSemesterFilter] = useState<"all" | AcademicSemester>("all");

  const counts = useMemo(() => {
    let first = 0;
    let second = 0;
    for (const c of courses) {
      if (c.semester === "1st") first += 1;
      else second += 1;
    }
    return { all: courses.length, first, second };
  }, [courses]);

  const filtered = useMemo(() => {
    if (semesterFilter === "all") return courses;
    return courses.filter((c) => c.semester === semesterFilter);
  }, [courses, semesterFilter]);

  return (
    <>
      <SEO
        title="Study Materials"
        description="Notes, resources and materials uploaded by your tutors and OverraPrep."
        noindex
        url="https://overraprep.com/materials"
      />
      <Screen className="lg:max-w-5xl">
        <ScreenHeader
          back
          title="Study materials"
          subtitle={`1st & 2nd Semester notes, handouts and resources for ${label}.`}
        />

        {/* Semester Segmented Filter */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border border-brand-line bg-brand-soft p-1">
            {(["all", "1st", "2nd"] as const).map((sem) => {
              const active = semesterFilter === sem;
              const count =
                sem === "all" ? counts.all : sem === "1st" ? counts.first : counts.second;
              const tabLabel =
                sem === "all"
                  ? "All Semesters"
                  : sem === "1st"
                  ? "1st Semester"
                  : "2nd Semester";
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSemesterFilter(sem)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-[#18181B] text-[#FAF8F5] shadow-2xs"
                      : "text-brand-ink-soft hover:text-brand-ink"
                  }`}
                >
                  <span>{tabLabel}</span>
                  <span
                    className={`font-mono text-[10px] tabular-nums px-1.5 py-0.2 rounded ${
                      active
                        ? "bg-[#D4AF37] text-[#18181B]"
                        : "bg-white/80 dark:bg-card text-brand-ink-soft"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <BrandSkeleton h={210} />
            <BrandSkeleton h={210} />
            <BrandSkeleton h={210} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title={
              semesterFilter === "all"
                ? "No materials yet"
                : `No ${semesterFilter === "1st" ? "1st" : "2nd"} semester materials yet`
            }
            description="When your tutors or OverraPrep upload notes and resources, they'll appear here automatically."
            action={<BrandButton to="/courses">Browse courses</BrandButton>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const cover = getAutomaticCourseImage({
                id: c.id,
                code: c.code,
                name: c.name,
                department: c.department,
              });
              return (
                <Link
                  key={c.id}
                  to={`/courses/${c.id}?tab=materials`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37] shadow-2xs hover:shadow-md"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-[#18181B]">
                    <img
                      src={cover.imageUrl}
                      alt={`${c.code} — ${cover.displayTitle}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
                    <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                      <span className="rounded-lg bg-[#18181B]/90 px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#F5D77F] border border-[#D4AF37]/40 backdrop-blur-md">
                        {c.code}
                      </span>
                      <span className="rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] font-bold text-white border border-white/15 backdrop-blur-md">
                        {c.semester === "1st" ? "1st Sem" : "2nd Sem"}
                      </span>
                    </div>
                    <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[11px] font-bold text-[#F5D77F]">
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        {c.count} {c.count === 1 ? "Document" : "Documents"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <h3 className="line-clamp-2 font-display text-[15px] font-extrabold leading-snug text-[#18181B] dark:text-foreground group-hover:text-[#996515] dark:group-hover:text-amber-400 transition-colors">
                        {cover.displayTitle || c.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#71717A] dark:text-muted-foreground truncate">
                        {cover.displayDepartment}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#EFECE6] dark:border-border/60 pt-2.5 text-xs font-bold text-[#996515] dark:text-amber-400">
                      <span>Open Handouts</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Screen>
    </>
  );
};

export default StudyMaterials;

