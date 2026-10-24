import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarMenu } from "@/components/student/dashboard/v2/SidebarMenu";

/**
 * Dashboard & splash routes where the floating back button is hidden.
 */
const HIDDEN_EXACT_ROUTES = new Set([
  "/",
  "/dashboard",
  "/student/dashboard",
  "/admin/dashboard",
  "/tutor/dashboard",
  "/auth",
]);

const HIDDEN_PREFIXES = [
  "/quiz/", // Real-time exam simulation handles its own exit dialog
];

/**
 * Consistent 'Back' button component fixed to the top-left corner of all
 * non-dashboard pages, using React Router's navigate(-1) with a safe fallback
 * so students and users can ALWAYS exit any screen with zero friction.
 */
export const ConsistentBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { pathname } = location;

  if (HIDDEN_EXACT_ROUTES.has(pathname)) return null;
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const handleBack = () => {
    // If user arrived from external link or fresh tab (no history stack),
    // navigate to the dashboard rather than exiting the application.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(user ? "/student/dashboard" : "/");
    }
  };

  const handleHome = () => {
    navigate(user ? "/student/dashboard" : "/");
  };

  return (
    <aside
      aria-label="Navigation controls"
      className="fixed left-3.5 z-40 md:left-5 pointer-events-auto"
      style={{ top: "calc(env(safe-area-inset-top) + 0.65rem)" }}
    >
      <div className="flex items-center gap-1 p-1 rounded-full bg-white/92 backdrop-blur-xl border border-amber-200/80 shadow-md shadow-amber-900/5 hover:border-amber-300 transition-all">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back to previous page"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-900 bg-amber-50/70 hover:bg-amber-100/90 active:scale-95 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-700" strokeWidth={2.4} />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleHome}
          aria-label="Go to home dashboard"
          className="h-7 w-7 inline-flex items-center justify-center rounded-full text-neutral-600 hover:text-amber-800 hover:bg-amber-50 transition active:scale-95"
          title="Home Dashboard"
        >
          <Home className="w-3.5 h-3.5" />
        </button>

        {user && (
          <div className="border-l border-amber-200/60 pl-0.5">
            <SidebarMenu />
          </div>
        )}
      </div>
    </aside>
  );
};

export default ConsistentBackButton;
