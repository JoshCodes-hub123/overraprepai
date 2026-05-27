import { supabase } from "@/integrations/supabase/client";

export interface AudioSessionRow {
  id: string;
  source_hash: string;
  title: string;
  position_seconds: number;
  duration_seconds: number | null;
  total_chars: number | null;
  voice: string | null;
  updated_at: string;
}

/** djb2 hash → stable short string for a source URL or text fingerprint. */
export function hashSource(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h) ^ input.charCodeAt(i);
  return "s" + (h >>> 0).toString(36);
}

/** Upsert (best-effort) a listening session position. Silently no-ops when signed out. */
export async function saveAudioSession(opts: {
  sourceHash: string;
  title: string;
  positionSeconds: number;
  durationSeconds?: number | null;
  totalChars?: number | null;
  voice?: string | null;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("audio_sessions")
      .upsert(
        {
          user_id: user.id,
          source_hash: opts.sourceHash,
          title: opts.title.slice(0, 200),
          position_seconds: Math.max(0, Math.floor(opts.positionSeconds)),
          duration_seconds: opts.durationSeconds ?? null,
          total_chars: opts.totalChars ?? null,
          voice: opts.voice ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source_hash" }
      );
  } catch (e) {
    // non-fatal
    console.warn("saveAudioSession failed", e);
  }
}

/** Fetch the user's most recent listening sessions for the "Continue listening" row. */
export async function listRecentAudioSessions(limit = 6): Promise<AudioSessionRow[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("audio_sessions")
      .select("id, source_hash, title, position_seconds, duration_seconds, total_chars, voice, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.warn("listRecentAudioSessions failed", e);
    return [];
  }
}

/** Remove a session (e.g. user dismisses it from Continue Listening). */
export async function deleteAudioSession(id: string) {
  try {
    await supabase.from("audio_sessions").delete().eq("id", id);
  } catch (e) {
    console.warn("deleteAudioSession failed", e);
  }
}