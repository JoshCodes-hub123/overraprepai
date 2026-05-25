import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle, Settings, Briefcase, Star, BookOpen, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

type FilterKey = "all" | "opportunities" | "talent" | "articles" | "announcements" | "other";

const FILTERS: { key: FilterKey; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: Bell },
  { key: "opportunities", label: "Opportunities", icon: Briefcase },
  { key: "talent", label: "Talent", icon: Star },
  { key: "articles", label: "Articles", icon: BookOpen },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "other", label: "Other", icon: Info },
];

const matchesFilter = (n: { title: string; message: string; link: string | null; type: string }, key: FilterKey) => {
  if (key === "all") return true;
  const t = (n.type || "").toLowerCase();
  const isContent =
    t === "post_talent" || t === "post_opportunity" || t === "post_article" ||
    t === "post_announcement" || t === "opportunity_published";
  switch (key) {
    case "opportunities": return t === "opportunity_published" || t === "post_opportunity";
    case "talent":        return t === "post_talent";
    case "articles":      return t === "post_article";
    case "announcements": return t === "post_announcement";
    case "other":         return !isContent;
    default: return true;
  }
};

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, filter)),
    [notifications, filter],
  );

  const handleNotificationClick = (notification: {
    id: string;
    is_read: boolean;
    link: string | null;
  }) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/settings/notifications")} title="Notification settings">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto scrollbar-hide">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 border transition",
                filter === key
                  ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                  : "bg-white text-muted-foreground border-amber-100 hover:bg-amber-50 hover:text-amber-800",
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">{filter === "all" ? "No notifications yet" : "Nothing in this filter"}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            !notification.is_read && "text-foreground"
                          )}
                        >
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
