import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PostType = "showcase" | "opportunity" | "article" | "announcement";
export type PostStatus = "draft" | "pending" | "published" | "archived";

export interface Post {
  id: string;
  author_id: string;
  type: PostType;
  status: PostStatus;
  title: string;
  subtitle: string | null;
  body: string;
  cover_image_url: string | null;
  gallery_urls: string[];
  tags: string[];
  organization: string | null;
  category: string | null;
  deadline: string | null;
  apply_url: string | null;
  university: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  author?: { full_name: string | null; avatar_url: string | null; profile_image_url: string | null } | null;
}

const SELECT = `*`;

async function attachAuthors<T extends { author_id: string }>(rows: T[]): Promise<(T & { author: any })[]> {
  const ids = Array.from(new Set(rows.map((r) => r.author_id)));
  if (ids.length === 0) return rows.map((r) => ({ ...r, author: null }));
  const { data } = await (supabase.from as any)("profiles")
    .select("id, full_name, avatar_url, profile_image_url")
    .in("id", ids);
  const map = new Map<string, any>((data ?? []).map((p: any) => [p.id, p]));
  return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
}

export function usePosts(filter?: { type?: PostType | "all"; limit?: number }) {
  return useQuery({
    queryKey: ["posts-feed", filter],
    queryFn: async () => {
      let q = (supabase.from as any)("posts")
        .select(SELECT)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (filter?.type && filter.type !== "all") q = q.eq("type", filter.type);
      if (filter?.limit) q = q.limit(filter.limit);
      const { data, error } = await q;
      if (error) throw error;
      return await attachAuthors((data ?? []) as Post[]) as Post[];
    },
  });
}

export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ["post", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("posts").select(SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [withAuthor] = await attachAuthors([data] as Post[]);
      return withAuthor as Post;
    },
  });
}

export function usePendingPosts() {
  return useQuery({
    queryKey: ["posts-pending"],
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("posts")
        .select(SELECT)
        .in("status", ["pending", "draft"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return await attachAuthors((data ?? []) as Post[]) as Post[];
    },
  });
}

export function usePostLike(postId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const liked = useQuery({
    queryKey: ["post-liked", postId, user?.id],
    enabled: !!postId && !!user,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("post_likes")
        .select("post_id").eq("post_id", postId).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !postId) throw new Error("Sign in required");
      if (liked.data) {
        await (supabase.from as any)("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await (supabase.from as any)("post_likes").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["post-liked", postId] });
      qc.invalidateQueries({ queryKey: ["post", postId] });
      qc.invalidateQueries({ queryKey: ["posts-feed"] });
    },
  });
  return { liked: liked.data ?? false, toggle };
}

export function usePostBookmark(postId: string | undefined) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const bookmarked = useQuery({
    queryKey: ["post-bookmarked", postId, user?.id],
    enabled: !!postId && !!user,
    queryFn: async () => {
      const { data } = await (supabase.from as any)("post_bookmarks")
        .select("post_id").eq("post_id", postId).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !postId) throw new Error("Sign in required");
      if (bookmarked.data) {
        await (supabase.from as any)("post_bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await (supabase.from as any)("post_bookmarks").insert({ post_id: postId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["post-bookmarked", postId] }),
  });
  return { bookmarked: bookmarked.data ?? false, toggle };
}

export function usePostComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["post-comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)("post_comments")
        .select(`*`)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.author_id)));
      if (ids.length === 0) return rows;
      const { data: profs } = await (supabase.from as any)("profiles")
        .select("id, full_name, avatar_url, profile_image_url").in("id", ids);
      const map = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, author: map.get(r.author_id) ?? null }));
    },
  });
}

export async function uploadPostImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("post-media").getPublicUrl(path);
  return data.publicUrl;
}
/** Articles the student has bookmarked, newest save first. */
export function useSavedPosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-posts", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Post[]> => {
      const { data: marks, error } = await (supabase.from as any)("post_bookmarks")
        .select("post_id, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (marks ?? []).map((m: any) => m.post_id);
      if (ids.length === 0) return [];
      const { data: posts } = await (supabase.from as any)("posts").select(SELECT).in("id", ids);
      const withAuthors = await attachAuthors((posts ?? []) as Post[]);
      const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
      return withAuthors.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) as Post[];
    },
  });
}
