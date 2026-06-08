/**
 * Hybrid TTS — Phase 2.
 *
 * Strategy:
 *   1. Try the `overra-tts` edge function (premium HF voice).
 *      - One quick retry (5s) on `warming_up`.
 *   2. On second failure → fall back to the browser SpeechSynthesis API
 *      (free, instant, offline-capable) so audio NEVER blocks the user.
 *
 * Returns a unified `TtsHandle` so callers can render either an MP3
 * waveform or a "live speech" minimal player.
 */
import { supabase } from "@/integrations/supabase/client";

export type TtsVoice = "standard" | "lecturer";

export interface TtsResult {
  kind: "mp3" | "browser";
  /** Object URL to MP3 (kind === 'mp3' only). */
  url?: string;
  /** Sentences spoken in browser-tts mode. */
  sentences?: string[];
  /** Stop in-progress browser speech. No-op for mp3. */
  stop: () => void;
}

const VOICE_PARAM = (v: TtsVoice) => (v === "lecturer" ? "lecturer" : "nigerian");

export const splitSentences = (raw: string): string[] => {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const parts = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [clean];
  return parts.map((p) => p.trim()).filter(Boolean);
};

interface TryOpts {
  voice: TtsVoice;
  onWarming?: () => void;
}

/** Returns an MP3 Blob from Overra, or throws. Single quick retry. */
async function tryOverra(text: string, opts: TryOpts): Promise<Blob> {
  const payload = {
    text: text.slice(0, 5000),
    voice: VOICE_PARAM(opts.voice),
    beat_type: "afro_lofi",
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase.functions.invoke("overra-tts", { body: payload });
    if (!error && data instanceof Blob && data.type.startsWith("audio/")) return data;

    let warming = false;
    let message = "TTS failed";
    if (error) {
      message = error.message || message;
      const ctx: any = (error as any).context;
      try {
        const txt = await ctx?.text?.();
        if (txt) {
          const j = JSON.parse(txt);
          warming = !!j.warming_up;
          message = j.message || j.error || message;
        }
      } catch { /* noop */ }
      if (/wak|warm|load|503|starting/i.test(message)) warming = true;
    }
    if (warming && attempt === 0) {
      opts.onWarming?.();
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    throw new Error(message);
  }
  throw new Error("Overra still warming");
}

/** Speak the text via the browser. Returns control + the sentence list. */
function speakBrowser(
  text: string,
  onSentence?: (idx: number) => void,
): TtsResult {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  const sentences = splitSentences(text);
  if (!synth || !sentences.length) {
    return { kind: "browser", sentences, stop: () => {} };
  }
  let cancelled = false;
  let i = 0;

  const speakNext = () => {
    if (cancelled || i >= sentences.length) return;
    const u = new SpeechSynthesisUtterance(sentences[i]);
    u.lang = "en-NG";
    u.rate = 1;
    u.pitch = 1;
    u.onstart = () => onSentence?.(i);
    u.onend = () => { i++; speakNext(); };
    u.onerror = () => { i++; speakNext(); };
    synth.speak(u);
  };

  // Chrome bug: synth pauses after ~15s. Keep it alive.
  const keepalive = window.setInterval(() => {
    if (cancelled) { window.clearInterval(keepalive); return; }
    if (synth.speaking && !synth.paused) {
      synth.pause();
      synth.resume();
    }
  }, 10000);

  synth.cancel();
  speakNext();

  return {
    kind: "browser",
    sentences,
    stop: () => {
      cancelled = true;
      window.clearInterval(keepalive);
      try { synth.cancel(); } catch { /* noop */ }
    },
  };
}

export interface SpeakOpts {
  voice?: TtsVoice;
  /** Notified when Overra reports "warming up" between retries. */
  onWarming?: () => void;
  /** Notified when Overra fails and we fall back to the browser. */
  onFallback?: (reason: string) => void;
  /** For browser mode: notified when each sentence starts. */
  onSentence?: (idx: number) => void;
}

/**
 * Top-level entry: returns either an MP3 URL (premium) or a live browser
 * speech handle. Never throws — the browser fallback always succeeds when
 * SpeechSynthesis is available.
 */
export async function speak(text: string, opts: SpeakOpts = {}): Promise<TtsResult> {
  const voice = opts.voice ?? "standard";
  if (!text?.trim()) {
    throw new Error("No text to speak");
  }

  // Token gate (3 tokens per AI audio)
  const { aiGate } = await import("@/lib/aiGate");
  const ok = await aiGate.consume("audio_tts", { action: "Audio (Text-to-Speech)" });
  if (!ok) throw new Error("Insufficient tokens for audio");

  // 1) Try Overra
  try {
    const blob = await tryOverra(text, { voice, onWarming: opts.onWarming });
    const url = URL.createObjectURL(blob);
    return {
      kind: "mp3",
      url,
      stop: () => { /* caller manages the <audio> element */ },
    };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Overra unavailable";
    opts.onFallback?.(reason);
  }

  // 2) Browser fallback
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    return speakBrowser(text, opts.onSentence);
  }

  throw new Error("Audio unavailable on this device");
}
