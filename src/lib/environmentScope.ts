import { EnvironmentType, InstitutionCode } from "@/config/environments";

export interface EnvironmentScope {
  environment_type: EnvironmentType;
  university: InstitutionCode | null;
}

/**
 * Apply the admin's selected academic environment to a query on a table that
 * has its own `environment_type` / `university` columns (e.g. `courses`).
 */
export function scopeCourseQuery<T>(query: T, scope?: EnvironmentScope | null): T {
  if (!scope) return query;
  let q: any = (query as any).eq("environment_type", scope.environment_type);
  if (scope.environment_type === "university" && scope.university) {
    q = q.eq("university", scope.university);
  }
  return q as T;
}

/**
 * Apply the scope through an embedded `courses!inner(...)` relation
 * (e.g. when listing questions).
 */
export function scopeEmbeddedCourseQuery<T>(
  query: T,
  scope?: EnvironmentScope | null,
  relation = "courses"
): T {
  if (!scope) return query;
  let q: any = (query as any).eq(`${relation}.environment_type`, scope.environment_type);
  if (scope.environment_type === "university" && scope.university) {
    q = q.eq(`${relation}.university`, scope.university);
  }
  return q as T;
}

/** Client-side row filter for data that only carries profile-style fields. */
export function matchesScope(
  row: { university?: string | null; academic_path?: string | null; environment_type?: string | null },
  scope?: EnvironmentScope | null
): boolean {
  if (!scope) return true;
  const env = row.environment_type ?? row.academic_path ?? "university";
  if (scope.environment_type === "jamb") return env === "jamb";
  if (env === "jamb") return false;
  return !scope.university || row.university === scope.university;
}
