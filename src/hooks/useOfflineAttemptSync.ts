/**
 * useOfflineAttemptSync — flushes queued offline quiz attempts to
 * `quiz_attempts` whenever the device is online and the user is signed in.
 *
 * Returns live counts so the global banner can show "X queued · syncing…".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  listPendingAttempts,
  removePendingAttempt,
  markPendingAttemptFailure,
  type PendingAttempt,
} from "@/lib/offlineQuizStore";

export interface OfflineSyncState {
  pendingCount: number;
  syncing: boolean;
  lastSyncedAt: number | null;
  flush: () => Promise<void>;
  refresh: () => Promise<void>;
}

const FLUSH_DEBOUNCE_MS = 600;

export function useOfflineAttemptSync(): OfflineSyncState {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const flushingRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setPendingCount(0); return; }
    try {
      const list = await listPendingAttempts(user.id);
      setPendingCount(list.length);
    } catch { /* IndexedDB not available — silent */ }
  }, [user]);

  const flush = useCallback(async () => {
    if (!user || flushingRef.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    flushingRef.current = true;
    setSyncing(true);
    try {
      const list = await listPendingAttempts(user.id);
      if (list.length === 0) return;
      for (const att of list) {
        try {
          const { error } = await supabase.from("quiz_attempts").insert({
            user_id: att.user_id,
            quiz_id: att.quiz_id,
            mode: att.mode,
            score: att.score,
            total_questions: att.total_questions,
            correct_answers: att.correct_answers,
            time_spent_seconds: att.time_spent_seconds,
            started_at: att.started_at,
            completed_at: att.completed_at,
          });
          if (error) throw error;
          await removePendingAttempt(att.id);
        } catch (e: any) {
          await markPendingAttemptFailure(att.id, e?.message ?? "upload failed").catch(() => {});
          // Stop after 5 attempts on the same row to avoid hammering a bad attempt
          if ((att.attempts ?? 0) >= 5) await removePendingAttempt(att.id).catch(() => {});
        }
      }
      setLastSyncedAt(Date.now());
    } finally {
      flushingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [user, refresh]);

  const scheduleFlush = useCallback(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => { void flush(); }, FLUSH_DEBOUNCE_MS);
  }, [flush]);

  // Initial load + react to user change
  useEffect(() => { void refresh().then(() => scheduleFlush()); }, [refresh, scheduleFlush]);

  // Flush on reconnect + when the tab becomes visible
  useEffect(() => {
    const onOnline = () => scheduleFlush();
    const onVis = () => { if (document.visibilityState === "visible") scheduleFlush(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [scheduleFlush]);

  // Light polling so a newly-queued attempt from another tab gets noticed
  useEffect(() => {
    const t = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  return { pendingCount, syncing, lastSyncedAt, flush, refresh };
}

export type { PendingAttempt };
