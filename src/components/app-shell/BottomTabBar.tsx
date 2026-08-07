import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, LucideIcon, School, ClipboardCheck, Wallet, Megaphone, Users, Target, Bot, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
import { motion } from "framer-motion";

interface Tab { to: string; label: string; icon: LucideIcon; }

/** University world: Home · Courses · Practice · AI Coach · Community */
const UNIVERSITY_TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",      icon: Home },
  { to: "/courses",           label: "Courses",   icon: BookOpen },
  { to: "/practice",          label: "Practice",  icon: Target },
  { to: "/coach",             label: "AI Coach",  icon: Bot },
  { to: "/community",         label: "Community", icon: Users },
];

/** JAMB world: Home · Subjects · Practice · AI Coach · Community */
const JAMB_TABS: Tab[] = [
  { to: "/jamb/dashboard", label: "Home",      icon: Home },
  { to: "/subjects",       label: "Subjects",  icon: Library },
  { to: "/practice",       label: "Practice",  icon: Target },
  { to: "/coach",          label: "AI Coach",  icon: Bot },
  { to: "/community",      label: "Community", icon: Users },
];


const SCHOOL_TABS: Tab[] = [
  { to: "/school/dashboard", label: "Overview", icon: School },
  { to: "/school/classes", label: "Classes", icon: BookOpen },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/fees", label: "Fees", icon: Wallet },
  { to: "/school/announcements", label: "More", icon: Megaphone },
];

const TEACHER_TABS: Tab[] = [
  { to: "/school/dashboard", label: "Today", icon: Home },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/results", label: "Results", icon: ClipboardCheck },
  { to: "/school/announcements", label: "Notices", icon: Megaphone },
  { to: "/profile/edit", label: "Profile", icon: User },
];

const PARENT_TABS: Tab[] = [
  { to: "/parent/dashboard", label: "Child", icon: Users },
  { to: "/school/results", label: "Results", icon: ClipboardCheck },
  { to: "/school/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/school/fees", label: "Fees", icon: Wallet },
  { to: "/profile/edit", label: "Profile", icon: User },
];

const HIDDEN_PREFIXES = ["/auth", "/quiz/", "/school/intro", "/school/register", "/school/pending", "/website", "/forgot-password", "/reset-password"];

export const BottomTabBar = () => {
  const { primaryRole, user } = useAuth();
  const { isJamb } = useEnvironment();
  const location = useLocation();

  if (!user) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === "/") return null;

  // Force student tabs on student-area routes regardless of role
  // (so admins/tutors previewing the student dashboard still see the quick footer).
  const isStudentRoute =
    location.pathname.startsWith("/student") ||
    location.pathname.startsWith("/jamb") ||
    ["/learn", "/study", "/practice", "/people", "/me", "/study-packs", "/chat", "/profile/edit", "/notifications", "/library", "/review", "/courses", "/subjects", "/coach", "/community", "/wallet"].some((p) =>
      location.pathname.startsWith(p)
    );

  // The student tab set follows the academic environment, never the route.
  const STUDENT_TABS = isJamb ? JAMB_TABS : UNIVERSITY_TABS;

  let tabs: Tab[];
  if (isStudentRoute) tabs = STUDENT_TABS;
  else if (primaryRole === "school_owner" || primaryRole === "school_admin") tabs = SCHOOL_TABS;
  else if (primaryRole === "teacher") tabs = TEACHER_TABS;
  else if (primaryRole === "parent") tabs = PARENT_TABS;
  else if (primaryRole === "student") tabs = STUDENT_TABS;
  else return null; // admin / tutor keep top nav only on their own routes

  return (
    <nav
      aria-label="Bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-surface/95 backdrop-blur-xl border-t border-brand-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 relative">
        {tabs.map(({ to, label, icon: Icon }, idx) => {
          const path = to.split("?")[0];
          const active = location.pathname === path || location.pathname.startsWith(path + "/");
          return (
            <li key={to} className="relative">
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-end gap-0.5 pt-2 pb-2 text-[10.5px] font-semibold tracking-tight min-h-[60px] transition-colors",
                  active
                    ? "text-env"
                    : "text-brand-ink-soft hover:text-brand-ink"
                )}
              >

              >
                <span className="relative h-7 flex items-center justify-center">
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-x-[-10px] inset-y-0 rounded-full bg-amber-100/80"
                      />
                    )}
                    <Icon
                      className={cn(
                        "relative w-[22px] h-[22px] transition-transform duration-200",
                        active && "scale-110"
                      )}
                      strokeWidth={active ? 2.2 : 2}
                    />
                  </span>
                <span className="relative leading-none mt-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
