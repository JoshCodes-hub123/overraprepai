import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, User, LucideIcon, School, ClipboardCheck, Wallet, Megaphone, Users, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface Tab { to: string; label: string; icon: LucideIcon; }

const STUDENT_TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",      icon: Home },
  { to: "/learn",             label: "Learn",     icon: BookOpen },
  { to: "/student/readiness", label: "Practice",  icon: Target },
  { to: "/community",         label: "Community", icon: Users },
  { to: "/profile/edit",      label: "Profile",   icon: User },
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

const HIDDEN_PREFIXES = ["/auth", "/onboarding", "/start", "/quiz/", "/school/intro", "/school/register", "/school/pending", "/website", "/forgot-password", "/reset-password"];

export const BottomTabBar = () => {
  const { primaryRole, user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;
  if (location.pathname === "/") return null;

  // Force student tabs on student-area routes regardless of role
  // (so admins/tutors previewing the student dashboard still see the quick footer).
  const isStudentRoute =
    location.pathname.startsWith("/student") ||
    ["/learn", "/study-packs", "/chat", "/profile/edit", "/notifications", "/library", "/review", "/courses"].some((p) =>
      location.pathname.startsWith(p)
    );

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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-2xl border-t border-amber-100/70 shadow-[0_-6px_20px_-12px_rgba(180,140,40,0.18)]"
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
                    ? "text-amber-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
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
