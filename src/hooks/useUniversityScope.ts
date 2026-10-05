import { useAuth } from "@/hooks/useAuth";
import { InstitutionCode, isInstitutionCode } from "@/config/environments";

/** Read the current user's university scope without guessing a campus. */
export function useUniversityScope() {
  const { profile } = useAuth();
  const university = isInstitutionCode((profile as any)?.university)
    ? ((profile as any).university as InstitutionCode)
    : null;
  const faculty = (profile as any)?.faculty as string | null | undefined;
  const department = (profile as any)?.department as string | null | undefined;
  const level = (profile as any)?.level as string | null | undefined;
  return { university, faculty, department, level };
}