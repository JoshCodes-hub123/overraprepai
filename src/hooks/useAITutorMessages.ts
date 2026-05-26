import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AITutorMessage {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  rating: number | null;
  created_at: string;
}

export function useAITutorMessages(threadId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AITutorMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId || !user?.id) {
      setMessages([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("ai_tutor_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (cancel) return;
      setMessages((data ?? []) as AITutorMessage[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [threadId, user?.id]);

  const insertMessage = useCallback(
    async (role: "user" | "assistant", content: string): Promise<AITutorMessage | null> => {
      if (!threadId || !user?.id) return null;
      const { data, error } = await supabase
        .from("ai_tutor_messages")
        .insert({ thread_id: threadId, user_id: user.id, role, content })
        .select("*")
        .single();
      if (error || !data) return null;
      const m = data as AITutorMessage;
      setMessages((prev) => [...prev, m]);
      return m;
    },
    [threadId, user?.id]
  );

  const updateMessage = useCallback(async (id: string, patch: Partial<Pick<AITutorMessage, "content" | "rating">>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    await supabase.from("ai_tutor_messages").update(patch).eq("id", id);
  }, []);

  // Local-only setter for streaming (no DB writes between tokens)
  const setLocalMessages = useCallback((updater: (prev: AITutorMessage[]) => AITutorMessage[]) => {
    setMessages(updater);
  }, []);

  return { messages, loading, insertMessage, updateMessage, setLocalMessages };
}
