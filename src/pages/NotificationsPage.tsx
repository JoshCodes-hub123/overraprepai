import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Trash2,
  Settings as SettingsIcon,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Inbox,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { SmartStudyReminderCard } from "@/components/notifications/SmartStudyReminderCard";

const iconForType = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-[#B8860B]" />;
    case "error":
      return <XCircle className="h-4 w-4 text-rose-600" />;
    default:
      return <Info className="h-4 w-4 text-[#996515]" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <>
      <SEO
        title="Notifications & Smart Study Reminders — OverraPrep AI"
        description="Manage your 15-minute pre-study push notifications, tutor updates, and campus announcements."
        noindex
        url="/notifications"
      />
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-background text-[#18181B] dark:text-foreground pb-20">
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-card/90 backdrop-blur-md border-b border-[#E8E2D6] dark:border-border">
          <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-xs font-bold text-[#18181B] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#18181B] text-[#F5D77F]">
                <Bell className="w-4 h-4" />
              </span>
              <span className="font-display font-extrabold text-sm text-[#18181B] dark:text-foreground">
                Notifications &amp; Reminders
              </span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#D4AF37] text-[#18181B] font-mono text-[10px] font-extrabold tabular-nums">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigate("/settings/notifications")}
              aria-label="Notification settings"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E8E2D6] bg-[#FAF8F5] hover:border-[#D4AF37] text-xs font-bold text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </header>

        <main className="container max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* Smart 15-Minute Pre-Study Reminder Schedule */}
          <SmartStudyReminderCard />

          <div className="flex items-center justify-between pt-1">
            <h2 className="font-display text-sm font-extrabold text-[#18181B] dark:text-foreground">
              Activity Feed
            </h2>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                className="h-8 rounded-xl border-[#E8E2D6] bg-white text-xs font-bold"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1 text-[#996515]" />
                Mark all read
              </Button>
            )}
          </div>

          {isLoading ? (
            <ul className="space-y-2.5" aria-busy="true" aria-label="Loading notifications">
              {Array.from({ length: 4 }).map((_, i) => (
                <li
                  key={i}
                  className="h-20 rounded-2xl bg-white border border-[#E8E2D6] animate-pulse"
                />
              ))}
            </ul>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#E8E2D6] bg-white py-12 px-4 text-center shadow-2xs">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF0D6] flex items-center justify-center mb-3">
                <Inbox className="w-5 h-5 text-[#996515]" />
              </div>
              <p className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                You're all caught up
              </p>
              <p className="text-xs text-[#71717A] mt-1 max-w-[32ch] mx-auto">
                Your 15-minute pre-study reminders, tutor replies, and campus updates will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-2xl border bg-white dark:bg-card p-4 transition-all hover:border-[#D4AF37]",
                    !n.is_read
                      ? "border-[#D4AF37]/60 bg-[#FAF0D6]/20"
                      : "border-[#E8E2D6] dark:border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    className="w-full text-left flex gap-3 focus:outline-none rounded-xl cursor-pointer"
                  >
                    <div className="mt-0.5 shrink-0">{iconForType(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-bold truncate",
                            !n.is_read ? "text-[#18181B]" : "text-[#52525B]"
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span
                            className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-[#D4AF37]"
                            aria-label="Unread"
                          />
                        )}
                      </div>
                      <p className="text-xs text-[#71717A] mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="font-mono text-[10px] text-[#8C8273] mt-1.5 tabular-nums">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="text-[#8C8273] hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>
    </>
  );
};

export default NotificationsPage;
