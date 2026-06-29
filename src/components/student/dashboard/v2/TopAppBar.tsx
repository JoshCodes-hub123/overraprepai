import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Compass } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";
import { SidebarMenu } from "./SidebarMenu";
import QuickJumpMenu from "./QuickJumpMenu";
import logo from "@/assets/logo.png";

export function TopAppBar() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (!cancelled) setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`appbar-notif-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user]);

  const first = profile?.full_name?.split(" ")[0] || "Student";

  return (
    <header className="flex items-center justify-between gap-2 pt-1">
      <SidebarMenu />

      <Link to="/student/dashboard" className="flex items-center gap-2 min-w-0">
        <img src={logo} alt="" className="h-7 w-7 rounded-md" />
        <div className="leading-none">
          <span className="font-display text-[15px] font-extrabold tracking-tight">
            OverraPrep <span className="text-amber-600">AI</span>
          </span>
          <p className="text-[9px] tracking-[0.22em] uppercase text-amber-700/70 font-bold mt-0.5">
            Study smarter, not harder
          </p>
        </div>
      </Link>

      <div className="flex items-center gap-1.5">
        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Quick jump to courses"
              className="h-11 w-11 inline-flex items-center justify-center rounded-2xl hover:bg-amber-50 transition"
            >
              <Compass className="w-5 h-5 text-neutral-700" strokeWidth={1.7} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:w-[420px] overflow-y-auto p-4">
            <QuickJumpMenu />
          </SheetContent>
        </Sheet>
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label="Notifications"
          className="relative h-11 w-11 inline-flex items-center justify-center rounded-2xl hover:bg-amber-50 transition"
        >
          <Bell className="w-5 h-5 text-neutral-700" strokeWidth={1.7} />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <Link to="/profile/edit" aria-label="Profile" className="rounded-full">
          <Avatar className="h-10 w-10 ring-2 ring-amber-200/70">
            <AvatarImage src={resolveAvatarUrl(profile)} alt={profile?.full_name || "Profile"} />
            <AvatarFallback className="bg-amber-100 text-amber-800 text-sm font-bold">
              {first.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

export default TopAppBar;
