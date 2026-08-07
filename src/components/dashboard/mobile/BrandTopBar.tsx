import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";
import { SidebarMenu } from "@/components/student/dashboard/v2/SidebarMenu";

/**
 * Minimal home bar: menu · wordmark · notifications · avatar.
 *
 * Deliberately quiet — the academic identity is stated by the headline right
 * below it, not by chrome. Reuses the existing SidebarMenu so every route that
 * was reachable before is still reachable.
 */
export function BrandTopBar() {
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
      .channel(`homebar-notif-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [user]);

  const first = profile?.full_name?.split(" ")[0] || "Student";

  return (
    <header className="flex items-center justify-between gap-2 pt-2">
      <SidebarMenu />
      <span className="text-[15px] font-bold tracking-tight text-brand-ink">
        OverraPrep <span className="text-env">AI</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-label="Notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-soft"
        >
          <Bell className="h-5 w-5 text-brand-ink" strokeWidth={1.7} />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-env ring-2 ring-brand-surface" />
          )}
        </button>
        <Link to="/profile/edit" aria-label="Profile" className="rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={resolveAvatarUrl(profile)} alt={profile?.full_name || "Profile"} />
            <AvatarFallback className="bg-brand-soft text-[13px] font-bold text-brand-ink">
              {first.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

export default BrandTopBar;
