import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type TutorPersona = "tutor" | "exam" | "coach" | "career";

export interface AITutorThread {
  id: string;
  user_id: string;
  title: string;
  persona: TutorPersona;
  created_at: string;
  updated_at: string;
  pinned: boolean;
  last_read_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_role: "user" | "assistant" | null;
}

export function useAITutorThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<AITutorThread[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setThreads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_tutor_threads")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (!error && data) setThreads(data as AITutorThread[]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const createThread = useCallback(
    async (persona: TutorPersona = "tutor", title = "New chat"): Promise<AITutorThread | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("ai_tutor_threads")
        .insert({ user_id: user.id, persona, title })
        .select("*")
        .single();
      if (error || !data) return null;
      const t = data as AITutorThread;
      setThreads((prev) => [t, ...prev]);
      return t;
    },
    [user?.id]
  );

  const renameThread = useCallback(async (id: string, title: string) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
    await supabase.from("ai_tutor_threads").update({ title }).eq("id", id);
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("ai_tutor_threads").delete().eq("id", id);
  }, []);

  const touchThread = useCallback((id: string) => {
    setThreads((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const updated = { ...prev[idx], updated_at: new Date().toISOString() };
      const copy = [updated, ...prev.filter((_, i) => i !== idx)];
      return copy;
    });
  }, []);

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, pinned } : t)));
    await supabase.from("ai_tutor_threads").update({ pinned }).eq("id", id);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const now = new Date().toISOString();
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, last_read_at: now } : t)));
    await supabase.from("ai_tutor_threads").update({ last_read_at: now }).eq("id", id);
  }, []);

  const patchLocalThread = useCallback((id: string, patch: Partial<AITutorThread>) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  return {
    threads, loading, refresh, createThread, renameThread, deleteThread,
    touchThread, togglePin, markRead, patchLocalThread,
  };
}
