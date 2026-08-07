import { useAuth } from "@/hooks/useAuth";
import {
  EnvironmentType,
  InstitutionCode,
  environmentLabel,
  environmentFullName,
  isInstitutionCode,
} from "@/config/environments";

/**
 * The signed-in student's academic environment.
 *
 * `isJamb`  → JAMB / UTME preparation platform (no university content at all)
 * `isUniversity` + `institution` → a single, isolated campus environment
 */
export function useEnvironment() {
  const { profile, isLoading } = useAuth();
  const p = profile as any;

  const environment = ((p?.environment_type as EnvironmentType) ||
    (p?.academic_path === "jamb" ? "jamb" : "university")) as EnvironmentType;

  const institution =
    environment === "university" && isInstitutionCode(p?.university)
      ? (p.university as InstitutionCode)
      : null;

  return {
    isLoading,
    environment,
    institution,
    isJamb: environment === "jamb",
    isUniversity: environment === "university",
    /** True once the student has fully picked their environment. */
    isConfigured: environment === "jamb" || !!institution,
    label: environmentLabel(environment, institution),
    fullName: environmentFullName(environment, institution),
  };
}

export default useEnvironment;
