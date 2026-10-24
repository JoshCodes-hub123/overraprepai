import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Flame, GraduationCap, Cake, LogOut, User, Settings as SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Calm academic header — greeting, university chip, streak pill, bell, avatar.
 * Mobile-first, single row, generous touch targets (>=44px).
 */
export const TopHeader = () => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [streak, setStreak] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);

  const handleSignOut = async () => {
    try {
      await signOut?.();
      toast.success("Signed out successfully");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadCounts = async () => {
      const { data: s } = await supabase
        .from("study_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setStreak((s as any)?.current_streak ?? 0);

      const { count } = await (supabase as any)
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (cancelled) return;
      setUnread(count ?? 0);
    };
    loadCounts();

    // Realtime: re-count on any notification change for this user
    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => { loadCounts(); },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Student";
  const university = (profile as any)?.university || "FUTA";
  const level = (profile as any)?.level;
  const department = (profile as any)?.department;
  const subline = [department, level ? `Level ${level}` : null].filter(Boolean).join(" • ");

  // Birthday awareness
  const dob = (profile as any)?.date_of_birth as string | undefined;
  const birthdayInfo = (() => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    if (d.getMonth() === today.getMonth() && d.getDate() === today.getDate()) {
      return { isToday: true, days: 0 };
    }
    const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    const days = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { isToday: false, days };
  })();

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mb-5 flex items-start justify-between gap-3"
      aria-label="Student greeting"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-700/90">
          {birthdayInfo?.isToday ? "🎂 Happy birthday" : greeting()}
        </p>
        <h1 className="font-display text-[22px] sm:text-[26px] font-bold leading-tight tracking-tight text-foreground mt-1 truncate">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
            {firstName}
          </span>
        </h1>
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/60 text-[10.5px] font-bold tracking-wide uppercase text-amber-800">
            <GraduationCap className="w-3 h-3" /> {university}
          </span>
          {subline && (
            <span className="text-[11.5px] text-muted-foreground truncate">{subline}</span>
          )}
          {birthdayInfo && !birthdayInfo.isToday && birthdayInfo.days <= 14 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200/70 text-[11px] font-bold text-rose-700">
              <Cake className="w-3 h-3" /> {birthdayInfo.days}d
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {streak > 0 && (
          <span className="hidden xs:inline-flex items-center gap-1 h-9 px-2.5 rounded-full bg-gradient-to-br from-amber-50 to-amber-100/70 border border-amber-200/60 text-[12px] font-bold text-amber-800 shadow-sm shadow-amber-200/40">
            <Flame className="w-3.5 h-3.5" /> {streak}
          </span>
        )}
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
          className="relative h-11 w-11 rounded-2xl flex items-center justify-center bg-white border border-neutral-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all"
        >
          <Bell className="w-5 h-5 text-neutral-600" strokeWidth={1.6} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User account menu"
              className="h-11 w-11 rounded-2xl flex items-center justify-center hover:bg-amber-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <Avatar className="h-10 w-10 ring-1 ring-amber-200/70 shadow-sm cursor-pointer">
                <AvatarImage src={resolveAvatarUrl(profile)} alt={profile?.full_name || "Profile"} />
                <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 text-sm font-bold">
                  {firstName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border-amber-100">
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-sm font-bold text-foreground truncate">{profile?.full_name || firstName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/profile")} className="cursor-pointer gap-2 py-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Profile & Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/profile/edit")} className="cursor-pointer gap-2 py-2">
              <User className="w-4 h-4 text-neutral-500" />
              <span>Edit Public Bio</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings/academic")} className="cursor-pointer gap-2 py-2">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span>Academic Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer gap-2 py-2">
              <SettingsIcon className="w-4 h-4 text-neutral-500" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Theme
              </span>
              <ThemeToggle variant="segmented" className="w-full" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="cursor-pointer gap-2 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 focus:text-rose-700 focus:bg-rose-50"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span className="font-semibold">Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
};

export default TopHeader;