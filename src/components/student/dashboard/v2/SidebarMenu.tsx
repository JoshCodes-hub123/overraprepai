import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Menu, Home, BookOpen, Library, Layers, Headphones, Bot, Users,
  Briefcase, GraduationCap, Trophy, Bell, Settings, HelpCircle, Crown,
  ArrowRight, FileText, LogOut, BarChart3, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { DashboardPreferencesDialog } from "@/components/student/dashboard/DashboardPreferencesMenu";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { DailyCheckIn } from "@/components/student/dashboard/DailyCheckIn";

const NAV = [
  { label: "Dashboard",        to: "/student/dashboard",            icon: Home },
  { label: "My Courses",       to: "/courses",                      icon: BookOpen },
  { label: "Study Analytics",  to: "/student/analytics",            icon: BarChart3 },
  { label: "Challenge Arena",  to: "/arena",                        icon: Trophy },
  { label: "Library",          to: "/library",                      icon: Library },
  { label: "Smart Notes",      to: "/student/smart-summary",        icon: FileText },
  { label: "Flashcards",       to: "/flashcards",                   icon: Layers },
  { label: "Audio Learning",   to: "/audio-learning",               icon: Headphones },
  { label: "AI Tutor",         to: "/ai-tutor",                     icon: Bot },
  { label: "Community",        to: "/community",                    icon: Users },
  { label: "Opportunities Hub",to: "/opportunities",                icon: Briefcase },
  { label: "Scholarships",     to: "/opportunities?type=scholarship", icon: GraduationCap },
  { label: "Global Rankings",  to: "/leaderboard",                  icon: Trophy },
  { label: "Notifications",    to: "/notifications",                icon: Bell },
  { label: "Settings",         to: "/settings",                     icon: Settings },
  { label: "Help & Support",   to: "/help",                         icon: HelpCircle },
];

export function SidebarMenu() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { preferences, visibleCount, totalCount } = useDashboardPreferences();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const filteredNav = NAV.filter((item) => {
    if (item.label === "Global Rankings" && !preferences.showGlobalRankings) {
      return false;
    }
    return true;
  });

  const handleSignOut = async () => {
    try {
      await signOut?.();
      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Sign out failed. Please try again.");
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="h-11 w-11 inline-flex items-center justify-center rounded-2xl hover:bg-amber-50 transition"
          >
            <Menu className="w-6 h-6 text-neutral-700" strokeWidth={1.8} />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[310px] p-0 bg-white border-r border-amber-100 flex flex-col justify-between overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <SheetHeader className="px-4 pt-4 pb-2.5 shrink-0">
              <div className="flex items-center gap-2.5">
                <img src={logo} alt="OverraPrep" className="h-8 w-8 rounded-lg" />
                <SheetTitle className="font-display text-[17px] font-extrabold tracking-tight">
                  OverraPrep <span className="text-amber-600">AI</span>
                </SheetTitle>
              </div>
              {profile?.full_name && (
                <p className="text-xs text-neutral-500 text-left truncate pt-0.5">
                  {profile.full_name} · <span className="text-amber-700 font-semibold">{profile.university || "University"}</span>
                </p>
              )}
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrefsOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50/90 hover:bg-amber-100/80 border border-amber-200/80 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3 text-amber-600" />
                  <span>Dashboard Preferences</span>
                  <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
                    ({visibleCount}/{totalCount})
                  </span>
                </button>
              </div>
            </SheetHeader>

            {/* Prominent Daily Check-In Streak Bonus Card in Sidebar */}
            {preferences.showDailyCheckIn && (
              <div className="px-3 pb-2.5 shrink-0">
                <DailyCheckIn variant="sidebar" />
              </div>
            )}

            <nav className="px-2 pb-2 overflow-y-auto flex-1 min-h-0">
              {filteredNav.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={to === "/student/dashboard"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 my-0.5 rounded-xl text-[13.5px] font-medium transition-colors",
                      isActive
                        ? "bg-amber-50 text-amber-800 font-semibold"
                        : "text-neutral-700 hover:bg-amber-50/60 hover:text-amber-800",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-amber-600" : "text-neutral-500")} strokeWidth={1.8} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-3 border-t border-amber-100/80 bg-neutral-50/60 space-y-2">
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Sign Out ({user.email ? user.email.split("@")[0] : "Account"})</span>
              </button>
            )}

            <div className="rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <p className="font-display text-[12px] font-bold">Go Premium</p>
                </div>
                <NavLink
                  to="/wallet"
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-0.5"
                >
                  Top up <ArrowRight className="w-3 h-3" />
                </NavLink>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <DashboardPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}

export default SidebarMenu;
