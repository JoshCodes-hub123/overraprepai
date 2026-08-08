import { FolderOpen } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { Screen, ScreenHeader, EmptyState, ListRow, BrandSkeleton, BrandButton } from "@/components/ui-kit";
import useEnvironment from "@/hooks/useEnvironment";
import { useMaterialCourses } from "@/hooks/useStudyMaterials";

/**
 * Study Materials — one calm entry point to everything admins and tutors have
 * uploaded for the student's own environment. Course/Subject → Topic → Material.
 */
const StudyMaterials = () => {
  const { isJamb, label } = useEnvironment();
  const { data: courses = [], isLoading } = useMaterialCourses();

  return (
    <>
      <SEO title="Study Materials" description="Notes, resources and materials uploaded by your tutors and OverraPrep." noindex url="https://overraprep.com/materials" />
      <Screen>
        <ScreenHeader
          back
          title="Study materials"
          subtitle={`Notes, resources and past questions for ${label}.`}
        />

        {isLoading ? (
          <div className="space-y-2.5">
            <BrandSkeleton h={78} />
            <BrandSkeleton h={78} />
            <BrandSkeleton h={78} />
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title="No materials yet"
            description="When your tutors or OverraPrep upload notes and resources, they'll appear here automatically."
            action={<BrandButton to={isJamb ? "/jamb/subjects" : "/courses"}>{isJamb ? "Browse subjects" : "Browse courses"}</BrandButton>}
          />
        ) : (
          <div className="space-y-2.5">
            {courses.map((c) => (
              <ListRow
                key={c.id}
                to={`/materials/${c.id}`}
                title={c.code}
                meta={`${c.name} · ${c.count} ${c.count === 1 ? "material" : "materials"}`}
                icon={<FolderOpen className="h-5 w-5" />}
              />
            ))}
          </div>
        )}
      </Screen>
    </>
  );
};

export default StudyMaterials;
