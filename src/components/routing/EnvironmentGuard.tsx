import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import type { EnvironmentType } from "@/config/environments";

/**
 * Deep-link protection between the two academic worlds.
 *
 * A JAMB student who lands on a university route (or the reverse — usually via
 * an old bookmark or a shared link) is bounced to their own home instead of
 * seeing content that does not belong to them. Content itself is already
 * protected by RLS; this simply keeps navigation honest and avoids empty
 * screens.
 */
export function EnvironmentGuard({
  allow,
  children,
}: {
  allow: EnvironmentType;
  children: ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { environment, isLoading } = useEnvironment();
  const location = useLocation();

  // Signed-out visitors are handled by the normal auth guards / public preview.
  if (authLoading || isLoading || !user) return <>{children}</>;

  if (environment !== allow) {
    const home = environment === "jamb" ? "/jamb/dashboard" : "/dashboard";
    if (location.pathname !== home) return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

export default EnvironmentGuard;
