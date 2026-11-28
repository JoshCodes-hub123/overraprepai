import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Target, Trophy, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Compact 5-destination mobile bottom navigation dock (56px height)
 * adhering to the <=15% aggregate sticky cap and >=44px touch target ergonomics.
 */
const TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home", icon: Home },
  { to: "/courses", label: "Courses", icon: BookOpen },
  { to: "/practice", label: "CBT", icon: Target },
  { to: "/arena", label: "Arena", icon: Trophy },
  { to: "/profile/edit", label: "Me", icon: User },
];

const HIDDEN_PREFIXES = [
  "/auth",
  "/quiz/",
  "/onboarding",
  "/start",
  "/forgot-password",
  "/reset-password",
];

export const BottomTabBar = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname === "/") return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  return (
    <nav
      aria-label="Mobile application navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
    >
      <ul className="grid grid-cols-5 relative px-1.5 py-1">
        {TABS.map(({ to, label, icon: Icon }) => {
          const path = to.split("?")[0];
          const active =
            location.pathname === path ||
            (path !== "/student/dashboard" && location.pathname.startsWith(path));

          return (
            <li key={to} className="relative">
              <Link
                to={to}
                onClick={triggerHaptic}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-semibold tracking-tight min-h-[48px] rounded-xl transition-transform duration-150 active:scale-95 select-none whitespace-nowrap",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative h-6 w-10 flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={{ type: "spring", stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-lg bg-foreground dark:bg-primary/20 border border-primary/50"
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative w-[18px] h-[18px] transition-transform duration-150",
                      active
                        ? "text-primary scale-105"
                        : "text-muted-foreground"
                    )}
                    strokeWidth={active ? 2.3 : 1.85}
                  />
                </span>
                <span className="relative leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
