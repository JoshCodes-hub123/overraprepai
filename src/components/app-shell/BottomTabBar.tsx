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
 * 5-destination mobile bottom navigation dock styled in Warm Academic Ivory,
 * Deep Charcoal (#18181B), and Gold (#F5D77F / #D4AF37).
 */
const TABS: Tab[] = [
  { to: "/student/dashboard", label: "Home",    icon: Home },
  { to: "/courses",           label: "Courses", icon: BookOpen },
  { to: "/practice",          label: "CBT",     icon: Target },
  { to: "/arena",             label: "Arena",   icon: Trophy },
  { to: "/profile/edit",      label: "Me",      icon: User },
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FAF8F5]/95 dark:bg-neutral-950/95 backdrop-blur-xl border-t border-[#E8E2D6] dark:border-border/80 shadow-[0_-8px_24px_rgba(24,24,27,0.06)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}
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
                  "relative flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-bold tracking-tight min-h-[52px] rounded-2xl transition-all active:scale-95 select-none",
                  active
                    ? "text-[#18181B] dark:text-[#F5D77F]"
                    : "text-[#71717A] hover:text-[#18181B] dark:text-muted-foreground"
                )}
              >
                <span className="relative h-6 flex items-center justify-center">
                  {active && (
                    <motion.span
                      layoutId="tab-pill"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className="absolute inset-x-[-12px] inset-y-[-3px] rounded-xl bg-[#18181B] dark:bg-[#D4AF37]/20 border border-[#D4AF37]/50 shadow-2xs"
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative w-[19px] h-[19px] transition-transform duration-150",
                      active
                        ? "text-[#F5D77F] scale-105"
                        : "text-[#71717A] dark:text-muted-foreground"
                    )}
                    strokeWidth={active ? 2.4 : 1.9}
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
