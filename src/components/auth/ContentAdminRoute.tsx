import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContentAdminRouteProps {
  children: ReactNode;
}

/**
 * Access Control Gate for Content & Course Management:
 * Restricts access to user_profiles.role IN ('admin', 'content_creator').
 * Unauthorized users are redirected to /student/dashboard with an informative toast.
 */
export const ContentAdminRoute = ({ children }: ContentAdminRouteProps) => {
  const { user, isLoading: authLoading, hasRole, roles } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkContentRole() {
      if (authLoading) return;

      if (!user) {
        if (isMounted) {
          setIsAuthorized(false);
          setCheckingRole(false);
        }
        return;
      }

      // Check client-side cached roles first
      const hasDirectAdmin = hasRole("admin") || roles.includes("admin");
      const hasDirectCreator = hasRole("content_creator") || roles.includes("content_creator");

      if (hasDirectAdmin || hasDirectCreator) {
        if (isMounted) {
          setIsAuthorized(true);
          setCheckingRole(false);
        }
        return;
      }

      // Check database explicitly for admin or content_creator in user_roles or profiles
      try {
        const { data: userRoleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        const fetchedRoles = (userRoleRows || []).map((r: any) => r.role);
        const hasDbRole = fetchedRoles.includes("admin") || fetchedRoles.includes("content_creator");

        if (hasDbRole) {
          if (isMounted) {
            setIsAuthorized(true);
            setCheckingRole(false);
          }
          return;
        }

        // Also check user_metadata or profiles for fallback / demo access
        const metaRole = (user.user_metadata as any)?.role;
        const appMetadataRole = (user.app_metadata as any)?.role;
        if (metaRole === "admin" || metaRole === "content_creator" || appMetadataRole === "admin" || appMetadataRole === "content_creator") {
          if (isMounted) {
            setIsAuthorized(true);
            setCheckingRole(false);
          }
          return;
        }

        if (isMounted) {
          setIsAuthorized(false);
          setCheckingRole(false);
        }
      } catch (err) {
        console.error("Failed to verify content creator permissions:", err);
        // If error querying user_roles, check if user is admin
        if (isMounted) {
          setIsAuthorized(hasDirectAdmin || hasDirectCreator);
          setCheckingRole(false);
        }
      }
    }

    checkContentRole();

    return () => {
      isMounted = false;
    };
  }, [user, authLoading, hasRole, roles]);

  useEffect(() => {
    if (!checkingRole && !authLoading && user && !isAuthorized) {
      toast({
        variant: "destructive",
        title: "Access Restricted",
        description: "Content Management is restricted to Administrators and Content Creators. Redirecting to Student Dashboard.",
      });
    }
  }, [checkingRole, authLoading, user, isAuthorized, toast]);

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-neutral-400">
            Verifying operator credentials…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?redirect=${redirect}`} replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ContentAdminRoute;
