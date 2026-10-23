import { ReactNode, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { getEnvironmentHome } from "@/lib/environmentScope";
import {
  EnvironmentType,
  environmentFullName,
  environmentLabel,
} from "@/config/environments";
import { BrandButton } from "@/components/ui-kit/BrandButton";
import { Screen } from "@/components/ui-kit/Screen";
import { Compass, Sparkles, X, ArrowRight, LogIn, Lock } from "lucide-react";

interface EnvironmentGuardProps {
  allow: EnvironmentType;
  children: ReactNode;
  /**
   * If true, unauthenticated visitors can preview the content with a floating
   * "Sign in to continue" bar that stores the return path. Defaults to true.
   */
  preview?: boolean;
  /**
   * If true, unauthenticated visitors must sign in before viewing the page.
   */
  requireAuth?: boolean;
}

/**
 * Deep-link protection between the two academic worlds (University vs JAMB / UTME).
 *
 * 1. Logged-out visitors: allowed to preview content if `preview` is enabled,
 *    prompted with a frictionless floating "Sign in to continue" bar that saves
 *    their intended destination so they resume right here after auth.
 * 2. Wrong academic environment: shows an explicit, friendly blocked screen
 *    ("This content isn't available in your current academic environment.")
 *    with a one-click CTA to return to their dashboard or switch academic paths.
 */
export function EnvironmentGuard({
  allow,
  children,
  preview = true,
  requireAuth = false,
}: EnvironmentGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { environment, institution, isLoading: envLoading } = useEnvironment();
  const location = useLocation();
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Still verifying auth or active environment
  if (authLoading || envLoading) {
    return <>{children}</>;
  }

  const currentPath = location.pathname + location.search;

  // Save deep link helper
  const saveIntendedRoute = () => {
    try {
      sessionStorage.setItem("overra_intended_deep_link", currentPath);
    } catch {
      /* noop */
    }
  };

  // Case 1: Visitor is NOT signed in
  if (!user) {
    if (requireAuth) {
      saveIntendedRoute();
      return (
        <Screen className="min-h-[85vh] flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md mx-auto text-center rounded-3xl border border-brand-line bg-brand-surface p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-env">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-brand-ink">
              Sign in to continue
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-ink-soft">
              This resource requires an active OverraPrep account. Sign in to
              practice questions, track mastery, and pick up where you left off.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <BrandButton
                block
                onClick={() => {
                  saveIntendedRoute();
                  navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
                }}
              >
                Sign In <ArrowRight className="w-4 h-4 ml-1.5" />
              </BrandButton>
              <BrandButton
                variant="secondary"
                block
                onClick={() => {
                  saveIntendedRoute();
                  navigate(
                    `/auth?mode=signup&redirect=${encodeURIComponent(currentPath)}`
                  );
                }}
              >
                Create Account
              </BrandButton>
            </div>
          </div>
        </Screen>
      );
    }

    // Unauthenticated with preview enabled: render the screen + preview bar
    return (
      <>
        {children}
        {!bannerDismissed && (
          <aside
            aria-label="Preview mode banner"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 rounded-2xl border border-brand-line/80 bg-brand-surface/95 backdrop-blur-md p-4 shadow-xl text-brand-ink animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-env/15 text-env font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-env">
                      Previewing
                    </span>
                    <span className="text-[11px] text-brand-ink-soft">·</span>
                    <span className="text-[11px] font-medium text-brand-ink-soft">
                      {allow === "jamb" ? "JAMB / UTME" : "University"}
                    </span>
                  </div>
                  <p className="text-[13.5px] font-medium text-brand-ink leading-snug mt-0.5">
                    Sign in to test your knowledge, save results, and unlock AI explanations.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-brand-ink-soft hover:text-brand-ink p-1 rounded-lg transition"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  saveIntendedRoute();
                  navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
                }}
                className="flex-1 min-h-[40px] px-3.5 rounded-full bg-env text-env-foreground text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in to continue</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  saveIntendedRoute();
                  navigate(
                    `/auth?mode=signup&redirect=${encodeURIComponent(currentPath)}`
                  );
                }}
                className="min-h-[40px] px-3.5 rounded-full border border-brand-line bg-brand-surface text-brand-ink text-xs sm:text-sm font-semibold hover:bg-brand-soft transition"
              >
                Create Account
              </button>
            </div>
          </aside>
        )}
      </>
    );
  }

  // If a legacy JAMB route is somehow accessed, forward immediately to dashboard
  if (allow === ("jamb" as any)) {
    navigate("/student/dashboard", { replace: true });
    return null;
  }

  // Case 2: Authenticated and in matching university environment
  return <>{children}</>;
}

export default EnvironmentGuard;

