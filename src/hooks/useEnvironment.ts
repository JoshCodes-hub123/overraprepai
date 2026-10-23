import { useAuth } from "@/hooks/useAuth";
import {
  EnvironmentType,
  InstitutionCode,
  environmentLabel,
  environmentFullName,
  isInstitutionCode,
} from "@/config/environments";

/**
 * The signed-in student's academic environment (University campus).
 */
export function useEnvironment() {
  const { profile, isLoading } = useAuth();
  const p = profile as any;

  const environment: EnvironmentType = "university";

  const institution = isInstitutionCode(p?.university)
    ? (p.university as InstitutionCode)
    : null;

  return {
    isLoading,
    environment,
    institution,
    isJamb: false,
    isUniversity: true,
    /** True once the student has picked their university. */
    isConfigured: !!p?.university,
    label: environmentLabel("university", institution),
    fullName: environmentFullName("university", institution),
  };
}

export default useEnvironment;
