import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

/**
 * Forces logged-in students without an academic_path to complete onboarding.
 * Tutors and admins are exempt (they manage content, not consume by path).
 */
export const AcademicPathGate = ({ children }: { children: ReactNode }) => {
  const { user, profile, primaryRole, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingSpinner />;

  // Not logged in — let downstream routes decide
  if (!user) return <>{children}</>;

  // Onboarding gates disabled — every signed-in user goes straight to their
  // dashboard. Profile fields (university, faculty, level, academic path) can
  // be filled later from the profile/settings screens.
  return <>{children}</>;
};

export default AcademicPathGate;
