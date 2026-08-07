import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { useStudentScope } from "@/hooks/useStudentScope";
import { INSTITUTIONS, isInstitutionCode } from "@/config/environments";

/**
 * "FUTA · Computer Engineering · 100L" — only the parts that actually exist.
 * Shared by the dashboard and every course screen so the identity line never
 * drifts and never renders an empty placeholder.
 */
export function useAcademicIdentity() {
  const { profile } = useAuth();
  const { institution } = useEnvironment();
  const { level, department } = useStudentScope();

  const parts = useMemo(() => {
    const code =
      institution ??
      (isInstitutionCode((profile as any)?.university) ? (profile as any).university : null);
    const lvl = level ? (/l$/i.test(String(level)) ? String(level) : `${level}L`) : null;
    return [code ? INSTITUTIONS[code].short : null, department, lvl]
      .map((p) => (typeof p === "string" ? p.trim() : p))
      .filter((p): p is string => Boolean(p));
  }, [institution, profile, department, level]);

  return { parts, text: parts.join(" · ") };
}

export default useAcademicIdentity;
