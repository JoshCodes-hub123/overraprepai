import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Headphones,
  Download,
  BookmarkPlus,
  Captions,
  Volume2,
  VolumeX,
  Music,
  Upload,
  Sliders,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { playGlobal } from "@/lib/globalAudio";

/**
 * Royalty-free soft piano loops (CC0/Pixabay-hosted).
 * Users can also upload their own track via the BGM controls.
 */
const PIANO_PRESETS: { id: string; label: string; url: string }[] = [
  { id: "off", label: "Off", url: "" },
  {
    id: "calm",
    label: "Calm Piano",
    url: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
  },
  {
    id: "study",
    label: "Study Piano",
    url: "https://cdn.pixabay.com/audio/2022/10/30/audio_347111d654.mp3",
  },
  {
    id: "focus",
    label: "Focus Keys",
    url: "https://cdn.pixabay.com/audio/2024/02/14/audio_8b5b8f3a4d.mp3",
  },
];

interface AudioPlayerCardProps {
  src: string;
  title?: string;
  subtitle?: string;
  /** Optional transcript text shown when captions are toggled on */
  transcript?: string;
  /** Suggested filename when downloading */
  downloadName?: string;
  /** Optional className extension for the outer card */
  className?: string;
  /** Persistence key for resume position (in seconds) */
  resumeKey?: string;
  /** Optional handler for the "Save to Library" footer button */
  onSaveToLibrary?: () => void;
  /** Show the piano background-music mixer (default true). */
  showBgm?: boolean;
}

const SPEEDS = [1, 1.5, 2] as const;

/**
 * 3-band equalizer presets (low / mid / high gain in dB).
 * Applied to narration only via Web Audio biquad filters.
 */
type EqPreset = { id: string; label: string; low: number; mid: number; high: number };
const EQ_PRESETS: EqPreset[] = [
  { id: "flat",   label: "Flat",        low: 0,  mid: 0,  high: 0 },
  { id: "voice",  label: "Voice",       low: -2, mid: 4,  high: 2 },
  { id: "bass",   label: "Bass Boost",  low: 6,  mid: 0,  high: -1 },
  { id: "bright", label: "Bright",      low: -2, mid: 1,  high: 5 },
  { id: "study",  label: "Study Calm",  low: 1,  mid: -1, high: -2 },
];

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
};

// Skip-back / Skip-forward "10" badge icons (custom — circular arrow with "10")
const SkipIcon = ({ direction = "back" }: { direction?: "back" | "forward" }) => (
  <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {direction === "back" ? (
      <>
        <path d="M5 14a9 9 0 1 0 3-6.7" />
        <polyline points="5,3 5,8 10,8" />
      </>
    ) : (
      <>
        <path d="M23 14a9 9 0 1 1-3-6.7" />
        <polyline points="23,3 23,8 18,8" />
      </>
    )}
    <text x="14" y="18" textAnchor="middle" fontSize="8" fontWeight="700" stroke="none" fill="currentColor">10</text>
  </svg>
);

/**
 * Premium "AI Narration" audio player. Matches the Study Pack audio
 * mockup: hero gradient header → time-stamped scrubber → large center
 * play with ±10s skips → speed pills → Download / Save footer.
 *
 * Accessibility:
 * - All controls keyboard reachable, with visible focus rings.
 * - Scrubber is a native range slider (full keyboard support, ARIA values).
 * - Toggle buttons expose aria-pressed for assistive tech.
 */
export const AudioPlayerCard = ({
  src,
  title = "AI Narration",
  subtitle = "Listen to your document",
  transcript,
  downloadName = "narration.mp3",
  className,
  resumeKey,
  onSaveToLibrary,
  showBgm = true,
}: AudioPlayerCardProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [muted, setMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);

  // Piano BGM state — persisted between sessions
  const [bgmId, setBgmId] = useState<string>(() => {
    if (typeof window === "undefined") return "off";
    return localStorage.getItem("audio-bgm-id") || "off";
  });
  const [customBgmUrl, setCustomBgmUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("audio-bgm-custom-url");
  });
  const [customBgmName, setCustomBgmName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("audio-bgm-custom-name");
  });
  const [bgmVolume, setBgmVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 0.18;
    const v = Number(localStorage.getItem("audio-bgm-volume") || "0.18");
    return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.18;
  });

  // Narration volume (separate from BGM) + EQ preset — persisted per student
  const [narrationVolume, setNarrationVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(localStorage.getItem("audio-narration-volume") || "1");
    return isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
  });
  const [eqId, setEqId] = useState<string>(() => {
    if (typeof window === "undefined") return "flat";
    return localStorage.getItem("audio-eq-id") || "flat";
  });

  // Web Audio refs for the EQ chain
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const highFilterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  // Resolve the active BGM URL (custom upload wins)
  const activeBgmUrl =
    bgmId === "custom" ? customBgmUrl ?? "" : PIANO_PRESETS.find((p) => p.id === bgmId)?.url ?? "";

  // Persist preferences
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("audio-bgm-id", bgmId);
  }, [bgmId]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("audio-bgm-volume", String(bgmVolume));
    if (bgmRef.current) bgmRef.current.volume = bgmVolume;
  }, [bgmVolume]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("audio-narration-volume", String(narrationVolume));
    if (gainRef.current) gainRef.current.gain.value = narrationVolume;
    else if (audioRef.current) audioRef.current.volume = narrationVolume;
  }, [narrationVolume]);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("audio-eq-id", eqId);
    const preset = EQ_PRESETS.find((p) => p.id === eqId) ?? EQ_PRESETS[0];
    if (lowFilterRef.current) lowFilterRef.current.gain.value = preset.low;
    if (midFilterRef.current) midFilterRef.current.gain.value = preset.mid;
    if (highFilterRef.current) highFilterRef.current.gain.value = preset.high;
  }, [eqId]);

  // Wire up the Web Audio EQ chain on first play (browsers require user gesture).
  const ensureAudioGraph = () => {
    if (audioCtxRef.current || !audioRef.current) return;
    try {
      const Ctx: typeof AudioContext =
        (window.AudioContext || (window as any).webkitAudioContext);
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaElementSource(audioRef.current);
      sourceRef.current = src;

      const low = ctx.createBiquadFilter();
      low.type = "lowshelf"; low.frequency.value = 200;
      const mid = ctx.createBiquadFilter();
      mid.type = "peaking"; mid.frequency.value = 1000; mid.Q.value = 1;
      const high = ctx.createBiquadFilter();
      high.type = "highshelf"; high.frequency.value = 4000;

      const gain = ctx.createGain();
      gain.gain.value = narrationVolume;

      const preset = EQ_PRESETS.find((p) => p.id === eqId) ?? EQ_PRESETS[0];
      low.gain.value = preset.low;
      mid.gain.value = preset.mid;
      high.gain.value = preset.high;

      src.connect(low); low.connect(mid); mid.connect(high); high.connect(gain); gain.connect(ctx.destination);

      lowFilterRef.current = low;
      midFilterRef.current = mid;
      highFilterRef.current = high;
      gainRef.current = gain;
    } catch {
      // Fallback silently — element-level volume will still apply.
    }
  };

  // Sync BGM playback with main narration (only when BGM is enabled)
  useEffect(() => {
    const el = bgmRef.current;
    if (!el) return;
    el.volume = bgmVolume;
    el.loop = true;
    if (!activeBgmUrl) {
      el.pause();
      return;
    }
    if (playing) {
      el.play().catch(() => void 0);
    } else {
      el.pause();
    }
  }, [playing, activeBgmUrl, bgmVolume]);

  const onPickCustomFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) return;
    const url = URL.createObjectURL(f);
    setCustomBgmUrl(url);
    setCustomBgmName(f.name);
    setBgmId("custom");
    if (typeof window !== "undefined") {
      // Object URLs don't survive reloads, but persist the name so the chip stays meaningful
      localStorage.setItem("audio-bgm-custom-url", url);
      localStorage.setItem("audio-bgm-custom-name", f.name);
    }
  };

  // Restore resume position
  useEffect(() => {
    if (!resumeKey) return;
    const saved = Number(localStorage.getItem(`audio-resume:${resumeKey}`) || "0");
    if (saved > 0 && audioRef.current) {
      const onLoaded = () => {
        if (audioRef.current && saved < (audioRef.current.duration || Infinity) - 2) {
          audioRef.current.currentTime = saved;
        }
        audioRef.current?.removeEventListener("loadedmetadata", onLoaded);
      };
      audioRef.current.addEventListener("loadedmetadata", onLoaded);
    }
  }, [resumeKey, src]);

  // Persist resume position
  useEffect(() => {
    if (!resumeKey) return;
    const id = window.setInterval(() => {
      const t = audioRef.current?.currentTime ?? 0;
      if (t > 0) localStorage.setItem(`audio-resume:${resumeKey}`, String(Math.floor(t)));
    }, 4000);
    return () => window.clearInterval(id);
  }, [resumeKey]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    ensureAudioGraph();
    if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume().catch(() => void 0);
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seekBy = (delta: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min((el.duration || 0), el.currentTime + delta));
  };

  const onScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
  };

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-amber-200/70 bg-white shadow-[0_24px_60px_-30px_rgba(180,140,40,0.45)]",
        className,
      )}
      role="region"
      aria-label={`Audio player: ${title}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime || 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Background piano loop, plays at low volume under narration */}
      <audio ref={bgmRef} src={activeBgmUrl || undefined} loop preload="auto" />

      {/* Hero header */}
      <div className="relative px-6 pt-7 pb-6 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white">
        <div className="absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            animate={playing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: playing ? Infinity : 0, ease: "easeInOut" }}
            className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg mb-3"
          >
            <Headphones className="h-8 w-8 text-white" aria-hidden />
          </motion.div>
          <p className="font-display text-xl font-bold tracking-tight">{title}</p>
          <p className="text-[12.5px] text-white/85 mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 sm:px-6 pt-5 pb-5">
        {/* Scrubber + timestamps */}
        <div className="relative">
          <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-[width] duration-150 relative"
              style={{ width: `${pct}%` }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-amber-500 shadow" aria-hidden />
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={onScrub}
            aria-label="Seek audio"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={current}
            aria-valuetext={`${fmt(current)} of ${fmt(duration)}`}
            className="absolute inset-0 w-full h-5 -top-2 opacity-0 cursor-pointer"
          />
          <div className="mt-2 flex items-center justify-between text-[12px] tabular-nums text-muted-foreground">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Transport */}
        <div className="mt-4 flex items-center justify-center gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Skip back 10 seconds"
            className="h-12 w-12 rounded-full text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipIcon direction="back" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            aria-pressed={playing}
            className="h-16 w-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_14px_30px_-10px_rgba(180,140,40,0.7)] flex items-center justify-center hover:from-amber-500 hover:to-amber-700 active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-[2px]" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Skip forward 10 seconds"
            className="h-12 w-12 rounded-full text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <SkipIcon direction="forward" />
          </button>
        </div>

        {/* Secondary controls (mute + captions) */}
        <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute" : "Mute"}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-amber-700 hover:bg-amber-50 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {transcript && (
              <button
                type="button"
                onClick={() => setShowCaptions((v) => !v)}
                aria-pressed={showCaptions}
                aria-label="Toggle captions"
                className={cn(
                  "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  showCaptions
                    ? "bg-amber-500 text-white"
                    : "text-muted-foreground hover:text-amber-700 hover:bg-amber-50",
                )}
              >
                <Captions className="h-3.5 w-3.5" /> CC
              </button>
            )}
          </div>

        {/* Speed selector */}
        <div className="mt-5">
          <p className="text-[13px] font-semibold text-foreground/80 mb-2">Playback Speed</p>
          <div role="radiogroup" aria-label="Playback speed" className="grid grid-cols-3 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={speed === s}
                onClick={() => setSpeed(s)}
                className={cn(
                  "h-11 rounded-xl text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                  speed === s
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_8px_20px_-10px_rgba(180,140,40,0.7)]"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-100",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Piano background music mixer */}
        {showBgm && (
          <>
          {/* Narration volume + Equalizer presets */}
          <div className="mt-5 rounded-2xl border border-amber-100 bg-white p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Mic className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-[13px] font-semibold text-foreground/85 flex-1">Narration</p>
              <Sliders className="h-3.5 w-3.5 text-amber-700" />
            </div>
            <div className="flex items-center gap-2.5 mb-3">
              <Volume2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={narrationVolume}
                onChange={(e) => setNarrationVolume(Number(e.target.value))}
                aria-label="Narration volume"
                className="flex-1 h-1.5 rounded-full appearance-none bg-amber-100 accent-amber-500"
              />
              <span className="text-[10px] tabular-nums font-semibold text-amber-800 w-8 text-right">
                {Math.round(narrationVolume * 100)}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EQ_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { ensureAudioGraph(); setEqId(p.id); }}
                  aria-pressed={eqId === p.id}
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-full border transition",
                    eqId === p.id
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Music className="h-3.5 w-3.5 text-white" />
              </div>
              <p className="text-[13px] font-semibold text-foreground/85 flex-1">Piano background</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-100/60 transition"
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={onPickCustomFile}
                className="hidden"
              />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {PIANO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBgmId(p.id)}
                  aria-pressed={bgmId === p.id}
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-full border transition",
                    bgmId === p.id
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
                  )}
                >
                  {p.label}
                </button>
              ))}
              {customBgmUrl && (
                <button
                  type="button"
                  onClick={() => setBgmId("custom")}
                  aria-pressed={bgmId === "custom"}
                  className={cn(
                    "text-[11px] font-bold px-2.5 py-1 rounded-full border transition max-w-[140px] truncate",
                    bgmId === "custom"
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-white text-amber-800 border-amber-200 hover:bg-amber-50",
                  )}
                  title={customBgmName ?? "Your track"}
                >
                  ♪ {customBgmName ?? "Your track"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <Volume2 className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={bgmVolume}
                onChange={(e) => setBgmVolume(Number(e.target.value))}
                aria-label="Background music volume"
                className="flex-1 h-1.5 rounded-full appearance-none bg-amber-100 accent-amber-500"
              />
              <span className="text-[10px] tabular-nums font-semibold text-amber-800 w-8 text-right">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
          </div>
          </>
        )}

        {/* Captions / transcript */}
        <AnimatePresence>
          {showCaptions && transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-4 overflow-hidden"
            >
              <div
                className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 max-h-48 overflow-y-auto text-[12.5px] leading-relaxed text-foreground/85"
                aria-live="polite"
              >
                {transcript}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="px-5 sm:px-6 pb-5 pt-1 space-y-2.5">
        <button
          type="button"
          onClick={() => playGlobal({ src, title, subtitle })}
          className="w-full h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-amber-100 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          title="Keep playing in the background while you move around the app"
        >
          <Headphones className="h-4 w-4" /> Play in background
        </button>
        <div className="grid grid-cols-2 gap-3">
        <a
          href={src}
          download={downloadName}
          className="h-12 rounded-2xl border-2 border-amber-200 bg-white text-amber-800 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-amber-50 active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Download className="h-4 w-4" /> Download Audio
        </a>
        <button
          type="button"
          onClick={onSaveToLibrary}
          disabled={!onSaveToLibrary}
          className={cn(
            "h-12 rounded-2xl font-semibold text-sm inline-flex items-center justify-center gap-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
            onSaveToLibrary
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-[0_10px_24px_-12px_rgba(180,140,40,0.7)] hover:from-amber-500 hover:to-amber-700 active:scale-[0.98]"
              : "bg-amber-100/60 text-amber-800/60 cursor-not-allowed",
          )}
        >
          <BookmarkPlus className="h-4 w-4" /> Save to Library
        </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayerCard;
