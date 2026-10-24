import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Target, Trophy, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * World-class 5-destination mobile bottom spine (Thumb zone optimized for Play Store Android/iOS)
 * 🏠 Home · 📚 Courses · 🎯 CBT Practice · 🏆 Arena · 👤 Me
 */
const TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",     icon: Home },
  { to: "/courses",           label: "Courses",  icon: BookOpen },
  { to: "/practice",          label: "CBT",      icon: Target },
  { to: "/arena",             label: "Arena",    icon: Trophy },
  { to: "/profile/edit",      label: "Me",       icon: User },
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/90 dark:bg-neutral-950/90 backdrop-blur-2xl border-t border-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
    >
      {/* Quick Theme Switcher capsule docked above bottom navigation */}
      <div className="absolute -top-9 right-3 z-50 pointer-events-auto">
        <ThemeToggle
          variant="dropdown"
          className="h-7 px-2.5 text-[11px] font-semibold rounded-full shadow-sm bg-card/95 border border-border/80 backdrop-blur-md text-foreground"
        />
      </div>

      <ul className="grid grid-cols-5 relative px-1">
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
                  "relative flex flex-col items-center justify-end gap-1 pt-2 pb-1.5 text-[10.5px] font-semibold tracking-tight min-h-[56px] transition-all active:scale-95 select-none",
                  active
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="relative h-6 flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-x-[-10px] inset-y-[-4px] rounded-full bg-primary/15 border border-primary/25 shadow-xs"
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative w-[20px] h-[20px] transition-transform duration-200",
                      active && "scale-110 text-primary drop-shadow-[0_2px_8px_rgba(234,179,8,0.25)]"
                    )}
                    strokeWidth={active ? 2.3 : 1.8}
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
