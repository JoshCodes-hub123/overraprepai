import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Coins,
  LogOut,
  Settings,
  User,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { DashboardPreferencesDialog } from "@/components/student/dashboard/DashboardPreferencesMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu } from "@/components/student/dashboard/v2/SidebarMenu";
import { cn } from "@/lib/utils";

export function BrandTopBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const { balance } = useTokenBalance();
  const { visibleCount, totalCount } = useDashboardPreferences();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "OP";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className={cn("flex items-center justify-between py-3.5", className)}>
        <div className="flex items-center gap-2">
          {/* Global Drawer Menu with all pages & Sign Out */}
          <SidebarMenu />

          <Link
            to="/student/dashboard"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-lg group"
            aria-label="OverraPrep AI home"
          >
            <img
              src="/app-icon.png"
              alt="OverraPrep AI"
              className="h-8 w-8 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-display text-[16px] font-bold tracking-tight text-foreground leading-tight">
                OverraPrep
              </span>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 tracking-wide">
                AI ACADEMIC SUITE
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Token Wallet Badge */}
          <Link
            to="/wallet"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-amber-300/80 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 shadow-2xs"
            title="Your AI Exam Tokens"
          >
            <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono text-xs font-bold tabular-nums">{balance}</span>
          </Link>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            {unreadCount > 0 && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-600 ring-2 ring-background"
                aria-hidden
              />
            )}
          </Link>

          {/* Profile Avatar with Quick Account, Dashboard Preferences & Sign Out Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                aria-label="Account menu"
              >
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-amber-300/80 hover:border-amber-500 transition-colors">
                  <AvatarImage src={profile?.avatar_url ?? ""} alt={profile?.full_name ?? "Profile"} />
                  <AvatarFallback className="bg-amber-500/15 font-display text-[12px] font-bold text-amber-800 dark:text-amber-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-1.5">
              <DropdownMenuLabel className="px-2.5 py-2">
                <div className="font-display font-bold text-sm text-foreground truncate">
                  {profile?.full_name || "Student Account"}
                </div>
                <div className="text-xs text-muted-foreground truncate font-normal">
                  {user?.email || ""}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setPrefsOpen(true);
                }}
                className="rounded-xl cursor-pointer py-2 text-xs font-semibold flex items-center justify-between"
              >
                <span className="flex items-center">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-amber-600" />
                  Dashboard Preferences
                </span>
                <span className="font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                  {visibleCount}/{totalCount}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/profile/edit")}
                className="rounded-xl cursor-pointer py-2 text-xs font-semibold"
              >
                <User className="w-4 h-4 mr-2 text-amber-600" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings/academic")}
                className="rounded-xl cursor-pointer py-2 text-xs font-semibold"
              >
                <GraduationCap className="w-4 h-4 mr-2 text-amber-600" />
                Academic Level & Dept
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings/profile")}
                className="rounded-xl cursor-pointer py-2 text-xs font-semibold"
              >
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Account & Theme Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl cursor-pointer py-2 text-xs font-bold text-rose-600 focus:text-rose-700 focus:bg-rose-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <DashboardPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  );
}

export default BrandTopBar;
