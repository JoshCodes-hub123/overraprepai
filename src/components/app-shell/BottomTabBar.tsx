import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, User, LucideIcon, School, ClipboardCheck, Wallet, Megaphone, Users, Target, MoreHorizontal, Brain, Library, Headphones, Sparkles, Crown, Gift, Layers, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import AppListItem from "@/components/app-shell/AppListItem";

interface Tab { to: string; label: string; icon: LucideIcon; }

const STUDENT_TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",      icon: Home },
  { to: "/learn",             label: "Learn",     icon: BookOpen },
  { to: "/student/readiness", label: "Practice",  icon: Target },
  { to: "/community",         label: "Community", icon: Users },
  { to: "more",               label: "More",      icon: MoreHorizontal },
];

const STUDENT_MORE: Tab[] = [
  { to: "/profile/edit", label: "Profile", icon: User },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/study-hub", label: "Study Hub", icon: Library },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/ai-tutor", label: "AI Tutor", icon: Brain },
  { to: "/audio-learning", label: "Audio Learning", icon: Headphones },
  { to: "/review", label: "Review", icon: Target },
  { to: "/sessions", label: "Sessions", icon: Calendar },
  { to: "/student/smart-summary", label: "Smart Summary", icon: Sparkles },
  { to: "/subscription", label: "Premium", icon: Crown },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/referrals", label: "Referrals", icon: Gift },
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
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

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

  const hasStudentMore = tabs === STUDENT_TABS;

  const openRoute = (to: string) => {
    if (to === "more") {
      setMoreOpen(true);
      return;
    }
    navigate(to);
  };

  return (
    <>
      <nav
        aria-label="Bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-[70] bg-white/90 backdrop-blur-2xl border-t border-amber-100/70 shadow-[0_-6px_20px_-12px_rgba(180,140,40,0.18)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5 relative">
        {tabs.map(({ to, label, icon: Icon }, idx) => {
          const path = to.split("?")[0];
          const moreActive = to === "more" && STUDENT_MORE.some((item) => location.pathname === item.to || location.pathname.startsWith(item.to + "/"));
          const active = moreActive || location.pathname === path || location.pathname.startsWith(path + "/");
          return (
            <li key={to} className="relative">
              <button
                type="button"
                onClick={() => openRoute(to)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "w-full relative flex flex-col items-center justify-end gap-0.5 pt-2 pb-2 text-[10.5px] font-semibold tracking-tight min-h-[60px] transition-colors",
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
              </button>
            </li>
          );
        })}
        </ul>
      </nav>

      {hasStudentMore && (
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="z-[90] rounded-t-3xl border-amber-100 pb-8">
            <SheetHeader>
              <SheetTitle className="font-display text-left">Dashboard pages</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid gap-2">
              {STUDENT_MORE.map((item) => (
                <AppListItem
                  key={item.to}
                  icon={item.icon}
                  title={item.label}
                  onClick={() => {
                    setMoreOpen(false);
                    navigate(item.to);
                  }}
                />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default BottomTabBar;
