import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

/**
 * Rewrite legacy/relocated notification links to current routes so every
 * notification always deep-links to the right page.
 */
const normalizeLink = (link: string | null): string | null => {
  if (!link) return null;
  let l = link.trim();
  if (!l) return null;

  // Strip absolute origins
  try {
    if (/^https?:\/\//i.test(l)) {
      const u = new URL(l);
      l = u.pathname + u.search + u.hash;
    }
  } catch {
    // ignore
  }
  if (!l.startsWith("/")) l = "/" + l;

  // Known legacy → current mappings
  const rewrites: Array<[RegExp, string]> = [
    [/^\/inbox(\/|$)/, "/notifications"],
    [/^\/messages\/inbox(\/|$)/, "/messages"],
    [/^\/threads\/([^/?#]+)/, "/chat/$1"],
    [/^\/dm\/([^/?#]+)/, "/chat/$1"],
    [/^\/opportunity\/([^/?#]+)/, "/opportunities/$1"],
    [/^\/jobs\/([^/?#]+)/, "/opportunities/$1"],
    [/^\/course\/([^/?#]+)/, "/courses/$1"],
    [/^\/quiz\/([^/?#]+)\/results?/, "/quiz/$1/results"],
    [/^\/tutor\/apply(\/|$)/, "/apply-tutor"],
    [/^\/profile\/me(\/|$)/, "/profile"],
    [/^\/announcement\/([^/?#]+)/, "/announcements/$1"],
    [/^\/post\/([^/?#]+)/, "/posts/$1"],
    [/^\/session\/([^/?#]+)/, "/sessions/$1"],
    [/^\/live\/room\/([^/?#]+)/, "/live/$1"],
  ];
  for (const [pat, rep] of rewrites) {
    if (pat.test(l)) {
      l = l.replace(pat, rep);
      break;
    }
  }
  return l;
};

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["notifications", user?.id] as const;

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return (data as Notification[]).map((n) => ({ ...n, link: normalizeLink(n.link) }));
    },
    enabled: !!user?.id,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Real-time subscription: INSERT / UPDATE / DELETE
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const incoming = { ...(payload.new as Notification), link: normalizeLink((payload.new as Notification).link) };
          queryClient.setQueryData<Notification[]>(key, (prev = []) => {
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev].slice(0, 50);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = { ...(payload.new as Notification), link: normalizeLink((payload.new as Notification).link) };
          queryClient.setQueryData<Notification[]>(key, (prev = []) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const oldId = (payload.old as { id?: string } | null)?.id;
          if (!oldId) return;
          queryClient.setQueryData<Notification[]>(key, (prev = []) =>
            prev.filter((n) => n.id !== oldId)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (prev = []) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (prev = []) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (prev = []) =>
        prev.filter((n) => n.id !== notificationId)
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
};
