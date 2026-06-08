import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Loader2, Play, Pause, Square, Headphones,
  ListMusic, FileText, Volume2, WifiOff, Smartphone, RotateCcw, Pencil,
  Check, X, Gauge, Bookmark, BookmarkCheck,
  RefreshCw, FileDown, Sparkles, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { BrowserTts, isTtsSupported, listVoices, type TtsState, type TtsTick, type TtsVoice } from "@/lib/browserTts";
import { AmbientPlayer, AMBIENT_LIST, type AmbientPreset } from "@/lib/ambientAudio";
import { useStudentScope } from "@/hooks/useStudentScope";
import { LevelChip } from "@/components/shell/PageHeader";
import { NowPlayingArtwork } from "@/components/audio/NowPlayingArtwork";
import { VoiceSheet } from "@/components/audio/VoiceSheet";
import { AmbientSheet } from "@/components/audio/AmbientSheet";
import { BookmarksSheet } from "@/components/audio/BookmarksSheet";
import { SpeedSheet } from "@/components/audio/SpeedSheet";
import { sanitizeForTts } from "@/lib/sanitizeForTts";
import { exportSummaryPdf } from "@/lib/exportSummaryPdf";
import { supabase } from "@/integrations/supabase/client";
import { PremiumPageHero } from "@/components/shell/PremiumPageHero";

const MAX_CHARS = 50000;
const SPEEDS = [0.85, 1, 1.25, 1.5, 2];
const SECTION_SPEEDS = [1, 1.25, 1.5, 2];

interface Section { title: string; text: string }
interface PinnedVoice { uri: string; name: string; lang: string }
interface Bookmark { id: string; sectionIdx: number; chunkIdx: number; label: string; createdAt: number }

const LS_PINNED = "audio.pinnedVoices.v1";
const LS_LAST_VOICE = "audio.lastVoice.v1";
const LS_GLOBAL_RATE = "audio.globalRate.v1";
const LS_AMBIENT = "audio.ambient.v1";
const LS_AMBIENT_VOL = "audio.ambientVol.v1";
const sectionSpeedKey = (doc: string) => `audio.sectionSpeed.${doc}`;
const transcriptKey = (doc: string) => `audio.transcript.${doc}`;
const bookmarksKey = (doc: string) => `audio.bookmarks.${doc}`;

const safe = <T,>(fn: () => T, fallback: T): T => { try { return fn(); } catch { return fallback; } };
const docKey = (name: string, len: number) =>
  (name || "untitled").replace(/[^a-z0-9]/gi, "_").slice(0, 40) + "_" + len;

const AudioLearning = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { label: scopeLabel } = useStudentScope();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PinnedVoice[]>(() => safe(() => JSON.parse(localStorage.getItem(LS_PINNED) || "[]"), []));
  const [rate, setRate] = useState<number>(() => safe(() => Number(localStorage.getItem(LS_GLOBAL_RATE)) || 1, 1));

  const [tick, setTick] = useState<TtsTick>({ state: "idle", progress: 0, chunk: 0, total: 0, charIndex: 0, wordLength: 0 });
  const ttsRef = useRef<BrowserTts | null>(null);

  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [sectionSpeeds, setSectionSpeeds] = useState<Record<number, number>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const [ambient, setAmbient] = useState<AmbientPreset>(() =>
    (localStorage.getItem(LS_AMBIENT) as AmbientPreset) || "off");
  const [ambientVol, setAmbientVol] = useState<number>(() =>
    safe(() => Number(localStorage.getItem(LS_AMBIENT_VOL)) || 0.25, 0.25));
  const ambientRef = useRef<AmbientPlayer | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supported = isTtsSupported();
  const docId = useMemo(() => docKey(fileName, text.length), [fileName, text.length]);
  const [aiSummaryBusy, setAiSummaryBusy] = useState(false);
  const activeChunkRef = useRef<HTMLParagraphElement | null>(null);

  // Auto-scroll the synced chunk view so the spoken chunk stays centered.
  useEffect(() => {
    if (tick.state !== "playing" && tick.state !== "paused") return;
    const el = activeChunkRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      el.scrollIntoView();
    }
  }, [tick.chunk, tick.state]);

  // Currently-spoken word for the highlight overlay
  const liveWord = useMemo(() => {
    if (!ttsRef.current || tick.state === "idle" || tick.total === 0) return null;
    const ch = ttsRef.current.chunks[tick.chunk];
    if (!ch) return null;
    return {
      before: ch.slice(0, tick.charIndex),
      word: ch.slice(tick.charIndex, tick.charIndex + Math.max(1, tick.wordLength)),
      after: ch.slice(tick.charIndex + Math.max(1, tick.wordLength)),
      chunkIdx: tick.chunk,
      total: tick.total,
    };
  }, [tick]);

  /* Voices */
  useEffect(() => {
    if (!supported) return;
    listVoices().then((vs) => {
      setVoices(vs);
      const lastUri = localStorage.getItem(LS_LAST_VOICE);
      const stored = vs.find((v) => v.id === lastUri);
      if (stored) { setVoiceURI(stored.id); return; }
      const pins: PinnedVoice[] = safe(() => JSON.parse(localStorage.getItem(LS_PINNED) || "[]"), []);
      for (const p of pins) {
        const m = vs.find((v) => v.id === p.uri) || vs.find((v) => v.name === p.name && v.lang === p.lang) || vs.find((v) => v.name === p.name);
        if (m) { setVoiceURI(m.id); return; }
      }
      const preferred = vs.find((v) => v.default && v.lang.startsWith("en"))
        || vs.find((v) => v.localService && v.lang.startsWith("en"))
        || vs.find((v) => v.lang.startsWith("en")) || vs[0];
      if (preferred) setVoiceURI(preferred.id);
    });
  }, [supported]);

  useEffect(() => () => { ttsRef.current?.destroy(); ambientRef.current?.destroy(); }, []);

  // Auto-load from a course's lecture note when ?source=lecture_note:<id> is present.
  useEffect(() => {
    const src = searchParams.get("source");
    if (!src) return;
    const [kind, id] = src.split(":");
    if (kind !== "lecture_note" || !id) return;
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase
          .from("lecture_notes")
          .select("title, file_url, file_type")
          .eq("id", id)
          .maybeSingle();
        if (!data?.file_url) { toast.error("Could not find that lecture note."); return; }
        const res = await fetch(data.file_url);
        const blob = await res.blob();
        const ext = (data.file_type || blob.type || "pdf").split("/").pop() || "pdf";
        const file = new File([blob], `${data.title}.${ext}`, { type: blob.type });
        lastFileRef.current = file;
        await extractFromFile(file);
        // Clean the URL so refresh doesn't refetch
        const next = new URLSearchParams(searchParams);
        next.delete("source");
        setSearchParams(next, { replace: true });
      } catch (e) {
        console.error(e);
        toast.error("Failed to load the lecture note for audio.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Per-doc settings */
  useEffect(() => {
    if (!docId) return;
    setSectionSpeeds(safe(() => JSON.parse(localStorage.getItem(sectionSpeedKey(docId)) || "{}"), {}));
    setBookmarks(safe(() => JSON.parse(localStorage.getItem(bookmarksKey(docId)) || "[]"), []));
    const saved = safe(() => JSON.parse(localStorage.getItem(transcriptKey(docId)) || "null"), null);
    if (saved && Array.isArray(saved.sections)) setSections(saved.sections);
  }, [docId]);

  const persistSectionSpeeds = (next: Record<number, number>) => {
    setSectionSpeeds(next);
    localStorage.setItem(sectionSpeedKey(docId), JSON.stringify(next));
  };
  const persistTranscript = (next: Section[]) => {
    setSections(next);
    localStorage.setItem(transcriptKey(docId), JSON.stringify({ sections: next, savedAt: Date.now() }));
  };
  const persistBookmarks = (next: Bookmark[]) => {
    setBookmarks(next);
    localStorage.setItem(bookmarksKey(docId), JSON.stringify(next));
  };

  /* File extraction */
  const extractFromFile = async (file: File) => {
    setFileName(file.name);
    setExtracting(true);
    setExtractProgress({ done: 0, total: 1, label: "Opening file…" });
    ttsRef.current?.stop();
    try {
      let extracted = "";
      const lower = file.name.toLowerCase();
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        setExtractProgress({ done: 0, total: 1, label: "Loading PDF…" });
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const maxPages = Math.min(pdf.numPages, 50);
        const parts: string[] = [];
        for (let p = 1; p <= maxPages; p++) {
          setExtractProgress({ done: p - 1, total: maxPages, label: `Reading page ${p} of ${maxPages}…` });
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          let lastY: number | null = null; let line = ""; const lines: string[] = [];
          for (const it of content.items as any[]) {
            const y = it.transform?.[5];
            if (lastY !== null && Math.abs(y - lastY) > 4) { lines.push(line.trim()); line = ""; }
            line += (line && !line.endsWith(" ") ? " " : "") + (it.str || "");
            lastY = y;
          }
          if (line.trim()) lines.push(line.trim());
          parts.push(lines.join("\n"));
          await new Promise((r) => setTimeout(r, 0));
        }
        extracted = parts.join("\n\n");
        setExtractProgress({ done: maxPages, total: maxPages, label: "Cleaning text…" });
        if (pdf.numPages > 50) toast.info("Long PDF — first 50 pages were read.");
      } else if (lower.endsWith(".docx")) {
        setExtractProgress({ done: 0, total: 1, label: "Reading Word document…" });
        const mammoth: any = await import("mammoth");
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        extracted = res.value || "";
        setExtractProgress({ done: 1, total: 1, label: "Cleaning text…" });
      } else if (file.type.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
        setExtractProgress({ done: 0, total: 1, label: "Reading text…" });
        extracted = await file.text();
        setExtractProgress({ done: 1, total: 1, label: "Cleaning text…" });
      } else { toast.error("Unsupported file. Use PDF, DOCX, TXT or MD."); return; }
      const cleaned = sanitizeForTts(extracted);
      if (!cleaned) { toast.error("No readable text found."); return; }
      setText(cleaned.slice(0, MAX_CHARS));
      localStorage.removeItem(transcriptKey(docKey(file.name, cleaned.slice(0, MAX_CHARS).length)));
      setSections([]); setBookmarks([]);
      toast.success(`Extracted ${cleaned.length.toLocaleString()} characters`);
    } catch (e: any) { console.error(e); toast.error("Failed to read file: " + (e?.message ?? "unknown")); }
    finally { setExtracting(false); setExtractProgress(null); }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    lastFileRef.current = file;
    await extractFromFile(file);
  };

  const reExtract = async () => {
    if (!lastFileRef.current) return toast.error("Re-upload the file to re-extract.");
    await extractFromFile(lastFileRef.current);
    toast.success("Re-extracted successfully");
  };

  /** Re-run the markdown / special-char sanitizer on the current text without
   *  needing the source file. Useful when AI/imported text contains `**`, `/`,
   *  or other characters the TTS engine reads aloud. */
  const cleanCurrentText = () => {
    if (!text.trim()) return toast.error("Nothing to clean yet.");
    const before = text.length;
    const after = sanitizeForTts(text);
    setText(after.slice(0, MAX_CHARS));
    setSections([]);
    persistTranscript([]);
    toast.success(`Cleaned ${before - after.length} characters — regenerate the queue to refresh sections.`);
  };

  const generateSummaryPdf = async () => {
    if (!text.trim()) return toast.error("Add some text first.");
    setAiSummaryBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("library-ai", {
        body: {
          action: "summary",
          text: text.slice(0, 18000),
          title: fileName || "Study Notes",
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const result = (data as any)?.result || {};
      const parts: string[] = [];
      parts.push(`# ${result.title || fileName || "Summary"}`);
      if (result.overview) parts.push("", "## Overview", result.overview);
      if (Array.isArray(result.sections)) {
        for (const sec of result.sections) {
          parts.push("", `## ${sec.heading}`);
          for (const b of sec.bullets || []) parts.push(`- ${b}`);
        }
      }
      if (Array.isArray(result.key_points) && result.key_points.length) {
        parts.push("", "## Key points");
        for (const k of result.key_points) parts.push(`- ${k}`);
      }
      if (Array.isArray(result.must_know) && result.must_know.length) {
        parts.push("", "## Must know");
        for (const k of result.must_know) parts.push(`- ${k}`);
      }
      if (Array.isArray(result.exam_tips) && result.exam_tips.length) {
        parts.push("", "## Exam tips");
        for (const k of result.exam_tips) parts.push(`- ${k}`);
      }
      await exportSummaryPdf({
        title: result.title || fileName || "Study Notes",
        subtitle: `AI summary · ${new Date().toLocaleDateString()} · ${scopeLabel || ""}`.trim(),
        bodyMarkdown: parts.join("\n"),
        filename: `${(fileName || "overraprep-notes").replace(/\.[^.]+$/, "")}-summary`,
      });
      toast.success("Summary PDF downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not generate summary.");
    } finally {
      setAiSummaryBusy(false);
    }
  };

  /* TTS helpers */
  const ensureTts = (forText: string, useRate?: number, startIdx?: number) => {
    if (ttsRef.current) ttsRef.current.destroy();
    const inst = new BrowserTts(forText);
    inst.voiceURI = voiceURI;
    inst.rate = useRate ?? rate;
    if (typeof startIdx === "number") inst.setStartIndex(startIdx);
    inst.on(setTick);
    ttsRef.current = inst;
    return inst;
  };

  const startAmbientIfNeeded = () => {
    if (ambient === "off") return;
    if (!ambientRef.current) ambientRef.current = new AmbientPlayer();
    ambientRef.current.setVolume(ambientVol);
    ambientRef.current.play(ambient);
  };
  const stopAmbient = () => ambientRef.current?.stop();

  const handlePlay = () => {
    if (!supported) return toast.error("Your browser doesn't support on-device speech.");
    if (!text.trim()) return toast.error("Add text or upload a document first.");
    setActiveSection(null);
    if (ttsRef.current && tick.state === "paused") { ttsRef.current.play(); startAmbientIfNeeded(); return; }
    if (ttsRef.current && tick.state === "playing") { ttsRef.current.pause(); stopAmbient(); return; }
    ensureTts(text).play();
    startAmbientIfNeeded();
  };

  const handleStop = () => { ttsRef.current?.stop(); stopAmbient(); };

  const handleRate = (r: number) => {
    setRate(r); localStorage.setItem(LS_GLOBAL_RATE, String(r));
    if (ttsRef.current && activeSection === null) ttsRef.current.setRate(r);
  };

  const handleVoice = (id: string) => {
    setVoiceURI(id); localStorage.setItem(LS_LAST_VOICE, id);
    if (ttsRef.current) ttsRef.current.setVoice(id);
  };

  const togglePin = (v: TtsVoice) => {
    const exists = pinned.some((p) => p.uri === v.id);
    const next = exists ? pinned.filter((p) => p.uri !== v.id) : [...pinned, { uri: v.id, name: v.name, lang: v.lang }];
    setPinned(next); localStorage.setItem(LS_PINNED, JSON.stringify(next));
    toast.success(exists ? `Unpinned ${v.name}` : `Pinned ${v.name}`);
  };

  /* Ambient */
  const handleAmbient = (preset: AmbientPreset) => {
    setAmbient(preset); localStorage.setItem(LS_AMBIENT, preset);
    if (preset === "off") { stopAmbient(); return; }
    if (!ambientRef.current) ambientRef.current = new AmbientPlayer();
    ambientRef.current.setVolume(ambientVol);
    if (tick.state === "playing") ambientRef.current.play(preset);
    else { ambientRef.current.play(preset); /* preview start */ }
  };
  const handleAmbientVol = (v: number) => {
    setAmbientVol(v); localStorage.setItem(LS_AMBIENT_VOL, String(v));
    ambientRef.current?.setVolume(v);
  };

  /* Sections */
  const splitIntoSections = (raw: string): Section[] => {
    const clean = raw.replace(/\r\n/g, "\n").trim();
    if (!clean) return [];
    const headingRe = /\n(?=(?:Chapter\s+\d+|Section\s+\d+|\d+\.\s+[A-Z]|[A-Z][A-Z\s]{4,}\n))/g;
    let parts = clean.split(headingRe).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      const paras = clean.split(/\n{2,}|(?<=\.)\s{2,}/).map((p) => p.trim()).filter(Boolean);
      parts = []; let buf = "";
      for (const p of paras) {
        if ((buf + " " + p).length > 1500 && buf) { parts.push(buf.trim()); buf = p; }
        else buf = buf ? `${buf}\n\n${p}` : p;
      }
      if (buf.trim()) parts.push(buf.trim());
    }
    return parts.map((body, i) => {
      const firstLine = body.split("\n")[0].trim();
      const title = firstLine.length > 0 && firstLine.length <= 80 ? firstLine.replace(/[:.\-—]+$/, "") : `Section ${i + 1}`;
      return { title, text: body };
    });
  };

  const generateTranscript = () => {
    if (!text.trim()) return toast.error("Add some text first.");
    const next = splitIntoSections(text);
    if (!next.length) return toast.error("Could not split text.");
    persistTranscript(next); persistSectionSpeeds({});
    toast.success(`Transcript generated — ${next.length} sections`);
  };

  const playSection = (idx: number, startChunk = 0) => {
    const sec = sections[idx]; if (!sec) return;
    if (activeSection === idx && tick.state === "playing" && startChunk === 0) { ttsRef.current?.pause(); stopAmbient(); return; }
    if (activeSection === idx && tick.state === "paused" && startChunk === 0) { ttsRef.current?.play(); startAmbientIfNeeded(); return; }
    setActiveSection(idx);
    const r = sectionSpeeds[idx] ?? rate;
    ensureTts(sec.text, r, startChunk).play();
    startAmbientIfNeeded();
  };

  const setSectionSpeed = (idx: number, r: number) => {
    persistSectionSpeeds({ ...sectionSpeeds, [idx]: r });
    if (activeSection === idx && ttsRef.current) ttsRef.current.setRate(r);
  };

  const startEdit = (idx: number) => { setEditingIdx(idx); setEditDraft(sections[idx].text); };
  const saveEdit = () => {
    if (editingIdx === null) return;
    const next = sections.map((s, i) => (i === editingIdx ? { ...s, text: editDraft.trim() } : s));
    persistTranscript(next); setEditingIdx(null); toast.success("Section saved");
  };
  const cancelEdit = () => { setEditingIdx(null); setEditDraft(""); };

  /* Bookmarks */
  const addBookmark = () => {
    if (activeSection === null) return toast.error("Play a section to bookmark this spot.");
    const sec = sections[activeSection];
    const snippet = (ttsRef.current?.chunks[tick.chunk] || "").slice(0, 50).trim();
    const bm: Bookmark = {
      id: Math.random().toString(36).slice(2, 9),
      sectionIdx: activeSection,
      chunkIdx: tick.chunk,
      label: `${sec?.title || "Section"} — "${snippet}…"`,
      createdAt: Date.now(),
    };
    persistBookmarks([bm, ...bookmarks].slice(0, 50));
    toast.success("Bookmarked");
  };
  const jumpToBookmark = (b: Bookmark) => playSection(b.sectionIdx, b.chunkIdx);
  const deleteBookmark = (id: string) => persistBookmarks(bookmarks.filter((b) => b.id !== id));

  /* Exports */
  const exportPinnedVoices = () => {
    const blob = new Blob([JSON.stringify({ pinned, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "overraprep-pinned-voices.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const saveTranscript = () => {
    if (!text.trim()) return;
    const body = sections.length ? sections.map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.text}`).join("\n\n") : text;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${(fileName || "narration").replace(/\.[^.]+$/, "")}-transcript.txt`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Transcript saved");
  };

  const exportRecap = () => {
    if (!text.trim()) return toast.error("Nothing to export yet.");
    const voice = voices.find((v) => v.id === voiceURI);
    const recap = {
      meta: {
        document: fileName || "untitled",
        exportedAt: new Date().toISOString(),
        characters: text.length,
        sections: sections.length,
      },
      voice: voice ? { name: voice.name, lang: voice.lang, uri: voice.id, offline: voice.localService } : null,
      pinnedVoices: pinned,
      ambient: { preset: ambient, volume: ambientVol },
      defaultRate: rate,
      sectionSpeeds,
      bookmarks,
      transcript: sections.length
        ? sections.map((s, i) => ({ index: i + 1, title: s.title, speed: sectionSpeeds[i] ?? rate, text: s.text }))
        : [{ index: 1, title: "Document", speed: rate, text }],
    };
    // JSON
    const json = new Blob([JSON.stringify(recap, null, 2)], { type: "application/json" });
    // Pretty markdown
    const md = [
      `# ${recap.meta.document} — Audio Recap`,
      ``,
      `_Exported ${new Date().toLocaleString()}_`,
      ``,
      `## Settings`,
      `- Voice: **${voice?.name ?? "default"}** (${voice?.lang ?? "—"})${voice?.localService ? " · offline" : ""}`,
      `- Default speed: **${rate}x**`,
      `- Ambient: **${ambient}** (vol ${Math.round(ambientVol * 100)}%)`,
      `- Pinned voices: ${pinned.map((p) => p.name).join(", ") || "none"}`,
      ``,
      bookmarks.length ? `## Bookmarks\n${bookmarks.map((b) => `- ${b.label}`).join("\n")}\n` : "",
      `## Transcript`,
      ...recap.transcript.map((s) => `\n### ${s.index}. ${s.title}  _(speed ${s.speed}x)_\n\n${s.text}\n`),
    ].join("\n");
    const mdBlob = new Blob([md], { type: "text/markdown" });
    const base = (fileName || "narration").replace(/\.[^.]+$/, "");
    [
      { blob: json, name: `${base}-recap.json` },
      { blob: mdBlob, name: `${base}-recap.md` },
    ].forEach(({ blob, name }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    });
    toast.success("Recap exported (JSON + Markdown)");
  };

  const isPlaying = tick.state === "playing";
  const isPaused = tick.state === "paused";

  return (
    <>
      <SEO title="AI Narration — Listen offline with focus music"
        description="Turn notes into audio using your phone's voice with built-in lo-fi, rain and ocean focus sounds."
        url="/audio-learning" />
      <div className="min-h-screen bg-background pb-12">
        <main className="container mx-auto px-4 pt-4 pb-5 max-w-3xl space-y-5">
          <PremiumPageHero
            eyebrow="AUDIO LEARNING"
            title="Listen. Learn. Repeat."
            subtitle="Turn any document into focus-friendly audio with lo-fi, rain, or ocean in the background."
            icon={Headphones}
            back
            size="sm"
            right={
              scopeLabel ? (
                <span className="hidden sm:inline-flex">
                  <LevelChip label={scopeLabel} />
                </span>
              ) : null
            }
          />
          {/* PREMIUM NOW-PLAYING CARD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-50/80 to-white p-5 sm:p-7 ring-1 ring-amber-200/60 shadow-xl"
          >
            <NowPlayingArtwork
              title={fileName || "Your Document"}
              subtitle={voices.find((v) => v.id === voiceURI)?.name ?? "Default voice"}
              isPlaying={isPlaying}
            />

            {/* Title row */}
            <div className="mt-5 text-center">
              <p className="font-display text-lg sm:text-xl font-bold tracking-tight truncate">
                {fileName || "Untitled narration"}
              </p>
              <p className="text-[12px] text-muted-foreground truncate">
                {tick.total ? `Track ${Math.min(tick.chunk + 1, tick.total)} of ${tick.total}` : "Ready when you are"} · {rate}x
              </p>
            </div>

            {/* Live word ticker */}
            <div className="mt-4 min-h-[56px] rounded-2xl bg-amber-50 ring-1 ring-amber-200/50 p-3">
              {liveWord ? (
                <p className="text-[13px] leading-relaxed text-foreground/90 line-clamp-3">
                  <span className="opacity-50">{liveWord.before}</span>
                  <motion.span
                    key={`${liveWord.chunkIdx}-${tick.charIndex}`}
                    initial={{ backgroundColor: "hsl(var(--primary) / 0.35)" }}
                    animate={{ backgroundColor: "hsl(var(--primary) / 0.15)" }}
                    transition={{ duration: 0.4 }}
                    className="font-bold text-primary px-1 rounded"
                  >
                    {liveWord.word}
                  </motion.span>
                  <span className="opacity-50">{liveWord.after}</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center">
                  Press play — words will light up as they're spoken.
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-amber-200/60 overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                  animate={{ width: `${Math.round(tick.progress * 100)}%` }} transition={{ duration: 0.3 }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground font-mono">
                <span>{tick.total ? `${Math.min(tick.chunk + (isPlaying ? 1 : 0), tick.total)} / ${tick.total}` : "—"}</span>
                <span>{Math.round(tick.progress * 100)}%</span>
              </div>
            </div>

            {/* Transport — large, centered */}
            <div className="mt-4 flex items-center justify-center gap-5">
              <button onClick={handleStop} disabled={tick.state === "idle"}
                className="w-12 h-12 rounded-full bg-white ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                aria-label="Stop"><Square className="w-4 h-4 text-amber-700" /></button>
              <button onClick={handlePlay} disabled={!text.trim() || extracting}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-2xl shadow-amber-500/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 ring-4 ring-amber-100"
                aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? <Pause className="w-9 h-9" /> : <Play className="w-9 h-9 translate-x-0.5" />}
              </button>
              <button onClick={() => { ttsRef.current?.stop(); setTimeout(handlePlay, 50); }}
                disabled={tick.state === "idle"}
                className="w-12 h-12 rounded-full bg-white ring-1 ring-amber-200 hover:bg-amber-50 disabled:opacity-40 flex items-center justify-center transition-all active:scale-95 shadow-sm"
                aria-label="Restart"><RotateCcw className="w-4 h-4 text-amber-700" /></button>
            </div>

            {/* Speed quick row + sheet trigger */}
            <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
              <Gauge className="w-3.5 h-3.5 text-muted-foreground mr-1" />
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => handleRate(s)}
                  className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold transition-all",
                    rate === s
                      ? "bg-amber-600 text-white shadow"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100 ring-1 ring-amber-200/60")}>
                  {s}x
                </button>
              ))}
              <SpeedSheet
                trigger={
                  <button
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white text-amber-700 ring-1 ring-amber-200/60 hover:bg-amber-50"
                    aria-label="More speeds"
                  >
                    More…
                  </button>
                }
                rate={rate}
                onPick={handleRate}
              />
            </div>

            {/* Secondary actions row */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <VoiceSheet
                trigger={
                  <button className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white ring-1 ring-amber-200/60 hover:bg-amber-50 transition-colors active:scale-[0.98]">
                    <Volume2 className="w-4 h-4 text-amber-700" />
                    <span className="text-[11px] font-bold text-foreground/80">Voice</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full px-1">
                      {voices.find((v) => v.id === voiceURI)?.name?.split(" ")[0] ?? "Default"}
                    </span>
                  </button>
                }
                voices={voices} voiceURI={voiceURI} pinned={pinned}
                onPick={handleVoice} onTogglePin={togglePin} onExport={exportPinnedVoices}
              />
              <AmbientSheet
                trigger={
                  <button className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-white ring-1 ring-amber-200/60 hover:bg-amber-50 transition-colors active:scale-[0.98]">
                    <span className="text-base leading-none">
                      {AMBIENT_LIST.find((a) => a.id === ambient)?.emoji ?? "🔇"}
                    </span>
                    <span className="text-[11px] font-bold text-foreground/80">Ambient</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full px-1">
                      {AMBIENT_LIST.find((a) => a.id === ambient)?.label ?? "Off"}
                    </span>
                  </button>
                }
                ambient={ambient} ambientVol={ambientVol}
                onPick={handleAmbient} onVol={handleAmbientVol}
              />
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={addBookmark}
                  disabled={activeSection === null}
                  className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl bg-white ring-1 ring-amber-200/60 hover:bg-amber-50 transition-colors active:scale-[0.98] disabled:opacity-40"
                  aria-label="Add bookmark"
                >
                  <Bookmark className="w-4 h-4 text-amber-700" />
                  <span className="text-[10px] font-bold text-foreground/80">Save</span>
                </button>
                <BookmarksSheet
                  trigger={
                    <button
                      className="flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl bg-white ring-1 ring-amber-200/60 hover:bg-amber-50 transition-colors active:scale-[0.98]"
                      aria-label="View bookmarks"
                    >
                      <BookmarkCheck className="w-4 h-4 text-amber-700" />
                      <span className="text-[10px] font-bold text-foreground/80">
                        {bookmarks.length || "0"}
                      </span>
                    </button>
                  }
                  bookmarks={bookmarks}
                  onJump={jumpToBookmark}
                  onDelete={deleteBookmark}
                  onClearAll={bookmarks.length ? () => persistBookmarks([]) : undefined}
                />
              </div>
            </div>
          </motion.div>

          {/* Capability badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              <Smartphone className="w-3 h-3" /> Phone voice
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-semibold">
              No API key
            </span>
          </div>

          {!supported && (
            <Card className="p-4 border-destructive/30 bg-destructive/5 text-sm">
              Your browser doesn't expose the on-device speech engine. Try Chrome, Safari or Edge.
            </Card>
          )}

          {/* Upload */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Add your content
              </Label>
              {lastFileRef.current && (
                <Button size="sm" variant="ghost" onClick={reExtract} disabled={extracting} className="h-7 px-2 text-[11px]">
                  <RefreshCw className={cn("w-3 h-3 mr-1", extracting && "animate-spin")} /> Re-extract
                </Button>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} disabled={extracting}
              className={cn("w-full flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-dashed",
                "border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-colors disabled:opacity-60")}>
              {extracting ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-primary" />}
              <div className="text-left min-w-0">
                <p className="font-semibold text-sm truncate">
                  {extracting ? (extractProgress?.label ?? "Reading…") : fileName || "Upload PDF, DOCX, TXT or MD"}
                </p>
                <p className="text-xs text-muted-foreground">Up to 50 pages • text extracted on your device</p>
              </div>
            </button>

            <AnimatePresence>
              {extracting && extractProgress && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-primary">{extractProgress.label}</span>
                    <span className="text-muted-foreground font-mono">{extractProgress.done}/{extractProgress.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-primary/15 overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full relative"
                      animate={{ width: `${Math.round((extractProgress.done / Math.max(1, extractProgress.total)) * 100)}%` }}
                      transition={{ duration: 0.25 }}>
                      <div className="absolute inset-0 bg-white/30 animate-pulse" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <input ref={fileInputRef} type="file"
              accept=".pdf,.docx,.txt,.md,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Or paste / edit text</Label>
                <span className="text-[11px] font-medium text-muted-foreground">{text.length.toLocaleString()} chars</span>
              </div>
              <Textarea value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                rows={6} placeholder="Paste lecture notes, a chapter, or any study text…"
                className="resize-y font-sans text-sm leading-relaxed" />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  type="button" size="sm" variant="outline" onClick={cleanCurrentText}
                  disabled={!text.trim()} className="h-8 text-[11px]"
                >
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Clean special chars
                </Button>
                <Button
                  type="button" size="sm" onClick={generateSummaryPdf}
                  disabled={!text.trim() || aiSummaryBusy}
                  className="h-8 text-[11px] bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
                >
                  {aiSummaryBusy
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  AI Summary PDF
                </Button>
                <span className="text-[10px] text-muted-foreground">Branded with OverraPrep AI watermark.</span>
              </div>
            </div>
          </Card>

          {/* Queue (sections) with synced highlight */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="font-semibold flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-primary" /> Queue
                {sections.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {sections.length}
                  </span>
                )}
              </Label>
              <Button size="sm" variant="outline" onClick={generateTranscript} disabled={!text.trim()}>
                <RefreshCw className="w-3 h-3 mr-1" /> {sections.length ? "Regenerate" : "Generate"}
              </Button>
            </div>
            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground">Split your document into sections, edit any mistakes, and play each part on its own.</p>
            ) : (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {sections.map((s, i) => {
                    const isActive = activeSection === i;
                    const playing = isActive && isPlaying;
                    const speed = sectionSpeeds[i] ?? rate;
                    const isEditing = editingIdx === i;
                    return (
                      <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={cn("rounded-xl border p-3 transition-colors",
                          isActive ? "border-primary bg-primary/5" : "border-border bg-card")}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => !isEditing && playSection(i)}
                          onKeyDown={(e) => {
                            if (isEditing) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              playSection(i);
                            }
                          }}
                          className="flex items-start gap-3 min-w-0 cursor-pointer select-none"
                          aria-label={`Play section ${i + 1}: ${s.title}`}
                        >
                          <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{s.title}</p>
                            {!isEditing && !isActive && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">{s.text.slice(0, 160)}…</p>
                            )}
                            {isActive && !isEditing && (
                              <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                                <motion.div className="h-full bg-primary" animate={{ width: `${Math.round(tick.progress * 100)}%` }} />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {!isEditing && (
                              <Button size="icon" variant="ghost" onClick={() => startEdit(i)} aria-label="Edit" className="h-8 w-8">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button size="icon" variant={playing ? "default" : "outline"}
                              onClick={() => playSection(i)} aria-label={playing ? "Pause" : "Play"} disabled={isEditing}>
                              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Synced chunk view */}
                        {isActive && !isEditing && ttsRef.current && (
                          <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-muted/40 p-2.5 text-[12px] leading-relaxed space-y-1">
                            {ttsRef.current.chunks.map((c, ci) => {
                              const isHere = ci === tick.chunk;
                              const past = ci < tick.chunk;
                              return (
                                <p key={ci}
                                  ref={isHere ? activeChunkRef : undefined}
                                  onClick={(e) => { e.stopPropagation(); playSection(i, ci); }}
                                  className={cn(
                                    "rounded px-1.5 py-0.5 transition-colors cursor-pointer hover:bg-primary/10",
                                    isHere ? "bg-primary/15 text-foreground font-medium ring-1 ring-primary/30"
                                      : past ? "text-muted-foreground/70" : "text-foreground/90",
                                  )}>
                                  {isHere && liveWord ? (
                                    <>
                                      <span>{liveWord.before}</span>
                                      <span className="bg-primary text-primary-foreground px-0.5 rounded font-bold">{liveWord.word}</span>
                                      <span>{liveWord.after}</span>
                                    </>
                                  ) : c}
                                </p>
                              );
                            })}
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-3 space-y-2">
                            <Textarea value={editDraft} onChange={(e) => setEditDraft(e.target.value)} rows={6} className="text-sm leading-relaxed" />
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
                              <Button size="sm" onClick={saveEdit}><Check className="w-3.5 h-3.5 mr-1" /> Save</Button>
                            </div>
                          </div>
                        )}

                        {!isEditing && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mr-1">Speed</span>
                            {SECTION_SPEEDS.map((r) => (
                              <button key={r} onClick={() => setSectionSpeed(i, r)}
                                className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold transition-all",
                                  speed === r ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary")}>
                                {r}x
                              </button>
                            ))}
                            {sectionSpeeds[i] !== undefined && <span className="text-[9px] text-primary font-semibold ml-1">saved</span>}
                          </div>
                        )}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          {/* Action row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button variant="outline" onClick={saveTranscript} disabled={!text.trim()} className="h-12">
              <FileText className="w-4 h-4 mr-2" /> Transcript
            </Button>
            <Button variant="outline" onClick={exportRecap} disabled={!text.trim()} className="h-12">
              <FileDown className="w-4 h-4 mr-2" /> Export Recap
            </Button>
            <Button onClick={handlePlay} disabled={!text.trim() || extracting} className="h-12 col-span-2 sm:col-span-1">
              {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isPlaying ? "Pause" : isPaused ? "Resume" : "Listen"}
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground pt-2">
            Built for deep focus · Your device's voice + synthesized lo-fi · Nothing leaves your phone.
          </p>
        </main>
      </div>
    </>
  );
};

export default AudioLearning;
