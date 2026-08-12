import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function BrandTopBar({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "OP";

  return (
    <header
      className={cn(
        "flex items-center justify-between py-4",
        className,
      )}
    >
      <Link
        to="/"
        className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
        aria-label="OverraPrep AI home"
      >
        <img
          src="/app-icon.png"
          alt="OverraPrep AI"
          className="h-8 w-8 rounded-lg object-contain"
        />
        <span className="font-display text-[16px] font-bold tracking-tight text-brand-ink">
          OverraPrep
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          to="/notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-brand-surface text-brand-ink-soft transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-env" aria-hidden />
          )}
        </Link>

        <Link
          to="/profile"
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-env"
          aria-label="My profile"
        >
          <Avatar className="h-10 w-10 border border-brand-line">
            <AvatarImage src={profile?.avatar_url ?? ""} alt={profile?.full_name ?? "Profile"} />
            <AvatarFallback className="bg-brand-gold-soft font-display text-[12px] font-bold text-env">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}

export default BrandTopBar;
