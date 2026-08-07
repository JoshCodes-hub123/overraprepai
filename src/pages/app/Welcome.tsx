import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SplashScreen from "@/components/SplashScreen";
import Ambassadors from "@/pages/app/Ambassadors";
import { SEO } from "@/components/seo/SEO";

/**
 * Native-style entry. Flow:
 *   1. Signed in   → redirect to role dashboard
 *   2. First visit → SplashScreen → WelcomeCarousel → /start
 *   3. Returning   → straight to /start
 */
const Welcome = () => {
  const navigate = useNavigate();
  const { user, profile, primaryRole, isLoading } = useAuth();

  // Always show splash on app open (per brand requirement)
  const [showSplash, setShowSplash] = useState(true);

  // Redirect signed-in users — preferring their last in-app route if we have one.
  // This is the "resume where you left off" behaviour: a returning student lands
  // back on the screen they were last using, instead of being bounced to the
  // generic dashboard.
  useEffect(() => {
    if (isLoading || !user) return;
    const env = (profile as any)?.environment_type ?? (profile as any)?.academic_path;
    const isJambStudent =
      (!primaryRole || primaryRole === "student") && env === "jamb";
    const roleHome =
      primaryRole === "admin" ? "/admin/dashboard"
      : primaryRole === "tutor" ? "/tutor/dashboard"
      : (primaryRole as any) === "school_owner" ? "/school/dashboard"
      : (primaryRole as any) === "parent" ? "/parent/dashboard"
      : isJambStudent ? "/jamb/dashboard"
      : "/student/dashboard";

    // Only restore a saved route when it belongs to the user's current role
    // section. Otherwise an admin/tutor who once visited a student page would
    // be sent back there on the next login instead of their real dashboard.
    const rolePrefix =
      primaryRole === "admin" ? "/admin"
      : primaryRole === "tutor" ? "/tutor"
      : (primaryRole as any) === "school_owner" ? "/school"
      : (primaryRole as any) === "parent" ? "/parent"
      : isJambStudent ? "/jamb"
      : "/student";

    let dest = roleHome;
    try {
      const saved = localStorage.getItem(`overra_last_route:${user.id}`);
      if (
        saved &&
        saved.startsWith(rolePrefix) &&
        !saved.startsWith("//") &&
        saved !== "/"
      ) {
        dest = saved;
      }
    } catch { /* localStorage unavailable */ }
    navigate(dest, { replace: true });
  }, [user, profile, primaryRole, isLoading, navigate]);


  const handleSplashDone = () => {
    try {
      localStorage.setItem("lastSplashShown", Date.now().toString());
    } catch {}
    setShowSplash(false);
  };

  return (
    <>
      <SEO title="Welcome" description="OverraPrep AI — the smart learning and school management app." noindex url="/" />
      {showSplash ? (
        <SplashScreen onComplete={handleSplashDone} />
      ) : (
        <Ambassadors />
      )}
    </>
  );
};

export default Welcome;
