import { EnvironmentType, InstitutionCode } from "@/config/environments";

export interface EnvironmentScope {
  environment_type: EnvironmentType;
  university: InstitutionCode | null;
}

/**
 * Apply the admin's selected university campus to a query.
 */
export function scopeCourseQuery<T>(query: T, scope?: EnvironmentScope | null): T {
  if (!scope) return query;
  let q: any = (query as any).eq("environment_type", "university");
  if (scope.university) {
    q = q.eq("university", scope.university);
  }
  return q as T;
}

/**
 * Apply the scope through an embedded relation (e.g. when listing questions).
 */
export function scopeEmbeddedCourseQuery<T>(
  query: T,
  scope?: EnvironmentScope | null,
  relation = "courses"
): T {
  if (!scope) return query;
  let q: any = (query as any).eq(`${relation}.environment_type`, "university");
  if (scope.university) {
    q = q.eq(`${relation}.university`, scope.university);
  }
  return q as T;
}

/** Client-side row filter for data that carries university fields. */
export function matchesScope(
  row: { university?: string | null },
  scope?: EnvironmentScope | null
): boolean {
  if (!scope || !scope.university) return true;
  return row.university === scope.university;
}

/** Checks whether a path belongs to the app. */
export function isPathInEnvironment(pathname: string, env?: string): boolean {
  return true;
}

/** Default dashboard route. */
export function getEnvironmentHome(env?: string): string {
  return "/student/dashboard";
}

/** Returns a valid resume route for returning users. */
export function getValidResumeRoute(userId: string | undefined | null, env?: string): string {
  const home = "/student/dashboard";
  if (!userId) return home;
  try {
    const saved = localStorage.getItem(`overra_last_route:${userId}`);
    if (saved && !saved.includes("/jamb") && !saved.includes("/school")) {
      return saved;
    }
    if (saved) {
      localStorage.removeItem(`overra_last_route:${userId}`);
    }
  } catch {
    /* noop */
  }
  return home;
}
