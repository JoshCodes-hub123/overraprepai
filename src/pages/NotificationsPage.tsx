import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, Trash2, Settings as SettingsIcon, Info, AlertTriangle, CheckCircle, XCircle, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";

const iconForType = (type: string) => {
  switch (type) {
    case "success": return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "error":   return <XCircle className="h-4 w-4 text-rose-500" />;
    default:        return <Info className="h-4 w-4 text-sky-500" />;
  }
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  return (
    <>
      <SEO title="Notifications" description="Stay on top of your study activity, tutor updates, community replies, and platform announcements — all in one place." noindex url="/notifications" />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-amber-100/70">
          <div className="container max-w-2xl mx-auto px-4 h-14 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} aria-label="Go back">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="ml-auto flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-amber-700" />
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className="container max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center justify-end gap-2 mb-3">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
                <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/settings/notifications")} aria-label="Notification settings">
              <SettingsIcon className="w-3.5 h-3.5 mr-1" /> Settings
            </Button>
          </div>

          {isLoading ? (
            <ul className="space-y-2" aria-busy="true" aria-label="Loading notifications">
              {Array.from({ length: 5 }).map((_, i) => (
                <li key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </ul>
          ) : notifications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50/40 to-white py-14 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-amber-100/70 flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-amber-600" />
              </div>
              <p className="font-display text-base font-bold text-foreground">You're all caught up</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[28ch] mx-auto">
                New activity, replies, and announcements will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/30",
                    !n.is_read ? "border-amber-200 bg-amber-50/40" : "border-border/70",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      if (n.link) navigate(n.link);
                    }}
                    className="w-full text-left flex gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-xl"
                  >
                    <div className="mt-0.5 shrink-0">{iconForType(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm font-semibold truncate", !n.is_read && "text-foreground")}>{n.title}</p>
                        {!n.is_read && <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-amber-500" aria-label="Unread" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(n.id)}
                      className="text-muted-foreground hover:text-destructive h-7 px-2"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
