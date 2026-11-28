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
      <header
        className={cn(
          "flex items-center justify-between gap-3 h-14 border-b border-border/70 mb-4",
          className
        )}
      >
        {/* Left: Drawer Trigger + Single-Line Brand Wordmark */}
        <div className="flex items-center gap-2 min-w-0">
          <SidebarMenu />

          <Link
            to="/student/dashboard"
            className="flex items-center gap-2.5 min-h-[44px] px-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group shrink-0 whitespace-nowrap"
            aria-label="OverraPrep home"
          >
            <img
              src="/app-icon.png"
              alt="OverraPrep"
              className="h-7 w-7 rounded-lg object-contain shrink-0 transition-transform duration-150 group-hover:scale-105"
            />
            <span className="font-display text-base font-extrabold tracking-tight text-foreground leading-none whitespace-nowrap">
              OverraPrep
            </span>
          </Link>
        </div>

        {/* Right: Clean Token Readout + 44px Touch Targets for Alerts & Account */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Link
            to="/wallet"
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-border bg-card hover:border-primary/60 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
            title="Your AI Exam Tokens"
          >
            <Coins className="h-4 w-4 text-primary shrink-0" />
            <span className="font-mono text-xs font-bold tabular-nums">{balance}</span>
          </Link>

          <Link
            to="/notifications"
            className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
            {unreadCount > 0 && (
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
                aria-hidden
              />
            )}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="Account menu"
              >
                <Avatar className="h-9 w-9 border border-border hover:border-primary transition-colors">
                  <AvatarImage
                    src={profile?.avatar_url ?? ""}
                    alt={profile?.full_name ?? "Profile"}
                  />
                  <AvatarFallback className="bg-primary/15 font-display text-xs font-bold text-foreground">
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
                className="rounded-xl cursor-pointer py-2.5 text-xs font-semibold flex items-center justify-between"
              >
                <span className="flex items-center">
                  <SlidersHorizontal className="w-4 h-4 mr-2 text-primary" />
                  Dashboard Preferences
                </span>
                <span className="font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {visibleCount}/{totalCount}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/profile/edit")}
                className="rounded-xl cursor-pointer py-2.5 text-xs font-semibold"
              >
                <User className="w-4 h-4 mr-2 text-primary" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings/academic")}
                className="rounded-xl cursor-pointer py-2.5 text-xs font-semibold"
              >
                <GraduationCap className="w-4 h-4 mr-2 text-primary" />
                Academic Level &amp; Dept
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings/profile")}
                className="rounded-xl cursor-pointer py-2.5 text-xs font-semibold"
              >
                <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                Account &amp; Theme Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="rounded-xl cursor-pointer py-2.5 text-xs font-bold text-destructive focus:text-destructive"
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
