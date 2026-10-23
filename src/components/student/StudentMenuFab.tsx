import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SidebarMenu } from "@/components/student/dashboard/v2/SidebarMenu";

const HIDDEN_PREFIXES = [
  "/auth", "/quiz/", "/school", "/website",
  "/forgot-password", "/reset-password", "/admin", "/tutor", "/parent",
];

const STUDENT_PREFIXES = [
  "/student", "/learn", "/study", "/practice", "/people", "/me",
  "/study-packs", "/chat", "/profile", "/notifications", "/library",
  "/review", "/courses", "/wallet", "/flashcards", "/audio", "/ai-tutor",
  "/community", "/opportunities", "/leaderboard", "/settings", "/help",
  "/copilot", "/referrals", "/spotlight", "/challenges", "/cgpa",
  "/mock-exams", "/exam-readiness", "/strategy", "/sessions",
  "/theory", "/survival-kits", "/posts", "/feed",
];

/**
 * Floating slide-out menu trigger for student-area routes that don't
 * render the TopAppBar themselves. Keeps navigation always reachable.
 */
export const StudentMenuFab = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;
  if (pathname === "/" || pathname === "/student/dashboard") return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (!STUDENT_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <div
      className="fixed left-3 z-40 md:left-4"
      style={{ top: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <div className="rounded-2xl bg-white/85 backdrop-blur-xl shadow-md border border-amber-100">
        <SidebarMenu />
      </div>
    </div>
  );
};

export default StudentMenuFab;
