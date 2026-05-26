import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import {
  ArrowUp, GraduationCap, Copy, ThumbsUp, ThumbsDown, Check,
  Plus, MessageSquare, Trash2, Menu, BookOpen, Target, Heart, Briefcase,
  Search, Pin, PinOff, Pencil, FileDown, FileJson, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAITutorThreads, type TutorPersona } from "@/hooks/useAITutorThreads";
import { useAITutorMessages } from "@/hooks/useAITutorMessages";
import { exportThreadAsJSON, exportThreadAsPDF } from "@/lib/exportAITutorThread";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface LocalMsg {
  id: string;          // db id, or temp- for streaming
  role: "user" | "assistant";
  content: string;
  rating?: number | null;
  pending?: boolean;
}

const PERSONAS: { id: TutorPersona; label: string; tagline: string; icon: any }[] = [
  { id: "tutor",  label: "AI Tutor",        tagline: "Explain anything, any level",      icon: BookOpen },
  { id: "exam",   label: "Exam Strategist", tagline: "Predict, plan, pass",              icon: Target },
  { id: "coach",  label: "Study Coach",     tagline: "Focus, motivation & wellness",     icon: Heart },
  { id: "career", label: "Career Mentor",   tagline: "Jobs, internships, scholarships",  icon: Briefcase },
];

const SUGGESTIONS_BY_PERSONA: Record<TutorPersona, { label: string; prompt: string }[]> = {
  tutor: [
    { label: "Explain a concept", prompt: "Explain a tough concept step-by-step with a simple analogy and example." },
    { label: "Quiz me",           prompt: "Quiz me with 5 progressively harder questions on a topic I should master this week." },
    { label: "Summarize notes",   prompt: "Help me summarize a set of notes into key points, definitions, and likely exam questions." },
    { label: "Past questions",    prompt: "Show me the most likely past questions for my upcoming exam and walk me through each." },
  ],
  exam: [
    { label: "CBT practice",      prompt: "Give me a 5-question CBT-style practice set on a core course topic, then grade me." },
    { label: "Time strategy",     prompt: "Build me a CBT time-management strategy for a 60-question, 60-minute paper." },
    { label: "Predict questions", prompt: "Based on common patterns, predict 5 likely questions for my next exam." },
    { label: "Last-week plan",    prompt: "Give me a high-yield revision plan for the last 7 days before my exam." },
  ],
  coach: [
    { label: "Anxiety tips",      prompt: "I'm feeling anxious about an upcoming exam. Give me practical, science-backed tips to calm down." },
    { label: "Beat procrastination", prompt: "I keep procrastinating. Walk me through one tiny step to start studying right now." },
    { label: "Sleep & focus",     prompt: "Suggest a simple routine to improve my sleep and focus during exam season." },
    { label: "Motivation",        prompt: "Give me a short, honest pep talk to keep going this week." },
  ],
  career: [
    { label: "CV tips",           prompt: "Give me a strong CV structure for a Nigerian undergraduate applying for internships." },
    { label: "Scholarships",      prompt: "Suggest scholarships I should consider as a Nigerian university student and how to start applying." },
    { label: "Career paths",      prompt: "What career paths fit my course, and what skills should I be building right now?" },
    { label: "LinkedIn",          prompt: "Help me write a clean LinkedIn headline and About section." },
  ],
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const titleFromText = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 48 ? t.slice(0, 48) + "…" : t || "New chat";
};

const AITutor = () => {
  const navigate = useNavigate();
  const { threadId: routeThreadId } = useParams<{ threadId?: string }>();
  const { user, profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as
    "admin" | "tutor" | "student";

  const {
    threads, createThread, deleteThread, renameThread, touchThread,
    togglePin, markRead,
  } = useAITutorThreads();
  const { messages: dbMessages, insertMessage, updateMessage, setLocalMessages } =
    useAITutorMessages(routeThreadId ?? null);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === routeThreadId) ?? null,
    [threads, routeThreadId]
  );
  const persona: TutorPersona = activeThread?.persona ?? "tutor";
  const personaMeta = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0];

  // Local view = DB messages mapped to LocalMsg + any temp streaming/pending message
  const [stream, setStream] = useState<LocalMsg | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef<string>("");
  const streamRafRef = useRef<number | null>(null);

  const localMessages: LocalMsg[] = useMemo(() => {
    const base = dbMessages.map<LocalMsg>((m) => ({
      id: m.id, role: m.role, content: m.content, rating: m.rating,
    }));
    return stream ? [...base, stream] : base;
  }, [dbMessages, stream]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages.length, stream?.content]);

  useEffect(() => { inputRef.current?.focus(); }, [routeThreadId]);

  // Mark active thread as read whenever it's opened or new messages arrive
  useEffect(() => {
    if (routeThreadId) markRead(routeThreadId);
  }, [routeThreadId, dbMessages.length, markRead]);

  const greetingName = (profile?.full_name || "").trim().split(" ")[0];
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const modeLabel = profile?.academic_path === "secondary" ? "Secondary" : "University";

  const flushStream = useCallback(() => {
    streamRafRef.current = null;
    const buf = streamBufferRef.current;
    setStream((s) => (s ? (s.content === buf ? s : { ...s, content: buf }) : s));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (streamRafRef.current != null) return;
    streamRafRef.current = requestAnimationFrame(flushStream);
  }, [flushStream]);

  const handleNewChat = async (p: TutorPersona = "tutor") => {
    if (loading) return;
    const t = await createThread(p, "New chat");
    if (!t) { toast.error("Could not start a new chat"); return; }
    setSidebarOpen(false);
    navigate(`/ai-tutor/${t.id}`);
  };

  const handleSelectThread = (id: string) => {
    setSidebarOpen(false);
    if (id === routeThreadId) return;
    navigate(`/ai-tutor/${id}`);
  };

  const handleDeleteThread = async (id: string) => {
    await deleteThread(id);
    if (id === routeThreadId) {
      const next = threads.find((t) => t.id !== id);
      navigate(next ? `/ai-tutor/${next.id}` : "/ai-tutor");
    }
  };

  const openRename = (id: string, current: string) => {
    setRenameTarget({ id, title: current });
    setRenameValue(current);
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const v = renameValue.trim();
    if (!v) { toast.error("Title can't be empty"); return; }
    await renameThread(renameTarget.id, v);
    setRenameTarget(null);
    toast.success("Chat renamed");
  };

  const handleExportThread = async (threadId: string, format: "pdf" | "json") => {
    const t = threads.find((x) => x.id === threadId);
    if (!t) return;
    try {
      let msgs = dbMessages;
      if (threadId !== routeThreadId) {
        const { data } = await supabase
          .from("ai_tutor_messages")
          .select("role, content, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });
        msgs = (data ?? []) as any;
      }
      if (!msgs.length) { toast.error("This chat has no messages yet"); return; }
      const meta = { id: t.id, title: t.title, persona: t.persona, created_at: t.created_at, updated_at: t.updated_at };
      if (format === "json") exportThreadAsJSON(meta, msgs as any);
      else await exportThreadAsPDF(meta, msgs as any);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    if (!user?.id) { toast.error("Please sign in to chat with the AI Tutor."); return; }

    // Ensure a thread exists
    let threadId = routeThreadId ?? null;
    let usedPersona: TutorPersona = persona;
    if (!threadId) {
      const t = await createThread(usedPersona, titleFromText(text));
      if (!t) { toast.error("Could not start chat"); return; }
      threadId = t.id;
      // Navigate (this will switch active thread; messages will reload from DB)
      navigate(`/ai-tutor/${t.id}`, { replace: true });
    }

    setInput("");
    setLoading(true);

    // Optimistic insert user message
    const tempUserId = `temp-${newId()}`;
    setLocalMessages((prev) => [
      ...prev,
      { id: tempUserId, thread_id: threadId!, user_id: user.id, role: "user", content: text, rating: null, created_at: new Date().toISOString() },
    ]);

    // Persist user message
    const savedUser = await (async () => {
      const { data } = await supabase
        .from("ai_tutor_messages")
        .insert({ thread_id: threadId!, user_id: user.id, role: "user", content: text })
        .select("*").single();
      return data;
    })();
    if (savedUser) {
      setLocalMessages((prev) => prev.map((m) => (m.id === tempUserId ? (savedUser as any) : m)));
    }

    // If thread title is still "New chat", set it from first user message
    if (activeThread && activeThread.title === "New chat") {
      renameThread(activeThread.id, titleFromText(text));
    }
    touchThread(threadId!);

    // Build message history for the model
    const historyForModel = [
      ...dbMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: text },
    ];

    // Streaming assistant placeholder
    const streamId = `stream-${newId()}`;
    streamBufferRef.current = "";
    setStream({ id: streamId, role: "assistant", content: "", pending: true });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error("Please sign in to chat.");

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-tutor-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          apikey: ANON,
        },
        body: JSON.stringify({
          messages: historyForModel,
          academic_path: profile?.academic_path || "university",
          persona: usedPersona,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content || "";
            if (delta) {
              streamBufferRef.current += delta;
              scheduleFlush();
            }
          } catch {}
        }
      }
      if (streamRafRef.current != null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
      flushStream();

      const finalText = streamBufferRef.current;
      // Persist assistant message
      const saved = await insertMessage("assistant", finalText);
      if (!saved) {
        // Fall back: keep stream visible
        toast.error("Saved locally but couldn't sync to cloud.");
      }
      setStream(null);
      touchThread(threadId!);
    } catch (e: any) {
      setStream(null);
      toast.error(e.message || "Chat failed");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleCopy = async (m: LocalMsg) => {
    try {
      await navigator.clipboard.writeText(sanitizeAIText(m.content));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1500);
    } catch { toast.error("Couldn't copy"); }
  };

  const handleRate = async (m: LocalMsg, rating: 1 | -1) => {
    if (m.id.startsWith("stream-") || m.id.startsWith("temp-")) return;
    const next = m.rating === rating ? null : rating;
    await updateMessage(m.id, { rating: next });
    if (next != null) toast.success(rating === 1 ? "Thanks for the feedback!" : "Got it — I'll try to do better.");
  };

  const showSuggestions = dbMessages.length === 0 && !stream && !loading;
  const suggestions = SUGGESTIONS_BY_PERSONA[persona];

  // Filter by search, then group: pinned first, then by date bucket
  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const inTitle = t.title?.toLowerCase().includes(q);
      const inPreview = t.last_message_preview?.toLowerCase().includes(q);
      const inPersona = t.persona?.toLowerCase().includes(q);
      return inTitle || inPreview || inPersona;
    });
  }, [threads, searchQuery]);

  const grouped = useMemo(() => {
    const pinned: typeof threads = [];
    const today: typeof threads = [];
    const week: typeof threads = [];
    const older: typeof threads = [];
    const now = Date.now();
    for (const t of filteredThreads) {
      if (t.pinned) { pinned.push(t); continue; }
      const age = now - new Date(t.updated_at).getTime();
      if (age < 24 * 3600 * 1000) today.push(t);
      else if (age < 7 * 24 * 3600 * 1000) week.push(t);
      else older.push(t);
    }
    return { pinned, today, week, older };
  }, [filteredThreads]);

  const isUnread = (t: typeof threads[number]) => {
    if (!t.last_message_at || t.last_message_role !== "assistant") return false;
    if (t.id === routeThreadId) return false;
    return new Date(t.last_message_at).getTime() > new Date(t.last_read_at).getTime();
  };

  const Sidebar = (
    <aside className="flex flex-col h-full bg-muted/30 border-r border-border/60 w-72">
      <div className="p-3 border-b border-border/60">
        <button
          onClick={() => handleNewChat(persona)}
          disabled={loading}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm shadow-primary/20 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New chat
        </button>

        {/* Persona switcher */}
        <div className="mt-3">
          <div className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase mb-1.5 px-1">Start as</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const active = p.id === persona;
              return (
                <button
                  key={p.id}
                  onClick={() => handleNewChat(p.id)}
                  className={cn(
                    "flex items-start gap-1.5 p-2 rounded-lg border text-left transition",
                    active
                      ? "border-primary/40 bg-primary/5 text-foreground"
                      : "border-border/60 hover:border-primary/30 hover:bg-background text-muted-foreground hover:text-foreground"
                  )}
                  title={p.tagline}
                >
                  <Icon className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" strokeWidth={2.2} />
                  <div className="min-w-0">
                    <div className="text-[11.5px] font-semibold truncate">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground/80 truncate">{p.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Search */}
        <div className="relative px-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" strokeWidth={2.2} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats…"
            className="w-full bg-background/70 border border-border/60 rounded-lg pl-8 pr-3 py-2 text-[12.5px] focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition"
          />
        </div>

        {threads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-10 px-4">
            No saved chats yet. Start one — it'll appear here and stay synced across devices.
          </div>
        )}
        {threads.length > 0 && filteredThreads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-10 px-4">
            No chats match "{searchQuery}".
          </div>
        )}
        {(["pinned", "today", "week", "older"] as const).map((bucket) => {
          const list = grouped[bucket];
          if (list.length === 0) return null;
          const label =
            bucket === "pinned" ? "Pinned" :
            bucket === "today" ? "Today" :
            bucket === "week" ? "Past 7 days" : "Older";
          return (
            <div key={bucket}>
              <div className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase mb-1 px-2 flex items-center gap-1.5">
                {bucket === "pinned" && <Pin className="w-3 h-3" strokeWidth={2.4} />}
                {label}
              </div>
              <div className="space-y-0.5">
                {list.map((t) => {
                  const active = t.id === routeThreadId;
                  const p = PERSONAS.find((x) => x.id === t.persona) ?? PERSONAS[0];
                  const Icon = p.icon;
                  const unread = isUnread(t);
                  const previewLabel = t.last_message_preview
                    ? (t.last_message_role === "user" ? "You: " : "") + t.last_message_preview
                    : formatDistanceToNow(new Date(t.updated_at), { addSuffix: true });
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-lg pr-1",
                        active ? "bg-primary/10" : "hover:bg-background"
                      )}
                    >
                      <button
                        onClick={() => handleSelectThread(t.id)}
                        className="flex-1 min-w-0 flex items-center gap-2 px-2 py-2 text-left"
                      >
                        <div className="relative shrink-0">
                          <Icon className={cn("w-3.5 h-3.5", active ? "text-primary" : "text-muted-foreground")} strokeWidth={2.2} />
                          {unread && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary ring-2 ring-muted/30" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "text-[13px] truncate flex-1",
                              active ? "text-foreground font-semibold" :
                              unread ? "text-foreground font-semibold" : "text-foreground/80"
                            )}>
                              {t.title}
                            </div>
                            {t.pinned && <Pin className="w-2.5 h-2.5 text-primary shrink-0" strokeWidth={2.6} />}
                          </div>
                          <div className={cn(
                            "text-[11px] truncate",
                            unread ? "text-foreground/70 font-medium" : "text-muted-foreground"
                          )}>
                            {previewLabel}
                          </div>
                        </div>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label="Chat options"
                            className="opacity-60 md:opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/5 transition"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" strokeWidth={2.2} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => togglePin(t.id, !t.pinned)}>
                            {t.pinned
                              ? <><PinOff className="w-4 h-4 mr-2" /> Unpin chat</>
                              : <><Pin className="w-4 h-4 mr-2" /> Pin chat</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openRename(t.id, t.title)}>
                            <Pencil className="w-4 h-4 mr-2" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleExportThread(t.id, "pdf")}>
                            <FileDown className="w-4 h-4 mr-2" /> Export as PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportThread(t.id, "json")}>
                            <FileJson className="w-4 h-4 mr-2" /> Export as JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteThread(t.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete chat
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );

  return (
    <>
      <SEO title="AI Tutor Chat" description="Chat with your AI tutor — adapts to your academic level." url="https://overraprep.com/ai-tutor" />
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />

        <div className="flex-1 flex w-full">
          {/* Desktop sidebar */}
          <div className="hidden md:block">{Sidebar}</div>

          {/* Main chat area */}
          <main className="flex-1 flex flex-col min-w-0">
            <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col px-5 pt-4">
              {/* Hero header */}
              <header className="pb-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {/* Mobile menu trigger */}
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                      <SheetTrigger asChild>
                        <button
                          className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-border/70 text-foreground/70 hover:text-primary hover:border-primary/40 transition"
                          aria-label="Open chat menu"
                        >
                          <Menu className="w-4 h-4" strokeWidth={2.2} />
                        </button>
                      </SheetTrigger>
                      <SheetContent side="left" className="p-0 w-72">
                        {Sidebar}
                      </SheetContent>
                    </Sheet>
                    <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                      <GraduationCap className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase border border-primary/30 px-2.5 py-1 rounded-full bg-primary/5 flex items-center gap-1">
                      <personaMeta.icon className="w-3 h-3" strokeWidth={2.5} />
                      {personaMeta.label}
                    </span>
                    <span className="hidden xs:inline text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase border border-border/70 px-2.5 py-1 rounded-full">
                      {modeLabel}
                    </span>
                  </div>
                </div>
                <h1 className="font-display text-[26px] leading-tight font-semibold text-foreground tracking-tight">
                  {activeThread?.title && activeThread.title !== "New chat"
                    ? activeThread.title
                    : `${greeting}${greetingName ? `, ${greetingName}.` : "."}`}
                </h1>
                <p className="text-muted-foreground text-sm mt-1 font-light">
                  {personaMeta.tagline}. What are we working on today?
                </p>
              </header>

              {/* Chat feed */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-7 pb-40 -mx-1 px-1">
                {localMessages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-10">
                    Ask anything — a concept, an exam tip, or how to plan your week.
                  </div>
                )}
                {localMessages.map((m, i) => (
                  <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                    {m.role === "assistant" ? (
                      <div className="max-w-[92%]">
                        <div className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase mb-1.5">
                          Overra · {personaMeta.label}
                        </div>
                        {m.content ? (
                          <>
                            <div className="ai-prose max-w-none text-[15px] leading-relaxed text-foreground">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {sanitizeAIText(m.content)}
                              </ReactMarkdown>
                            </div>
                            {!m.pending && !m.id.startsWith("temp-") && (
                              <div className="flex items-center gap-1 mt-2 -ml-1.5 opacity-70 hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopy(m)}
                                  aria-label="Copy response"
                                  title="Copy"
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                                >
                                  {copiedId === m.id
                                    ? <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                                    : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
                                </button>
                                <button
                                  onClick={() => handleRate(m, 1)}
                                  aria-label="Helpful"
                                  aria-pressed={m.rating === 1}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    m.rating === 1
                                      ? "text-primary bg-primary/10"
                                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                                  )}
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                                <button
                                  onClick={() => handleRate(m, -1)}
                                  aria-label="Not helpful"
                                  aria-pressed={m.rating === -1}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-colors",
                                    m.rating === -1
                                      ? "text-destructive bg-destructive/10"
                                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                  )}
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="flex space-x-1 items-center">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase animate-pulse">
                              Thinking…
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-[85%] bg-primary text-primary-foreground px-5 py-3 rounded-2xl rounded-tr-md shadow-md shadow-primary/15">
                        <p className="text-[14.5px] font-medium whitespace-pre-wrap leading-relaxed">
                          {m.content}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sticky composer */}
              <div className="sticky bottom-0 left-0 right-0 -mx-5 px-5 pt-3 pb-4 bg-gradient-to-t from-background via-background to-background/60 backdrop-blur-md">
                {showSuggestions && (
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {suggestions.map((s) => (
                      <button
                        key={s.label}
                        onClick={() => send(s.prompt)}
                        className="whitespace-nowrap px-4 py-2 rounded-full border border-border/70 text-[13px] font-medium text-muted-foreground bg-background/60 backdrop-blur hover:border-primary hover:text-primary transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative flex items-end mt-1 rounded-2xl bg-muted/60 backdrop-blur-md border border-border/60 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/40 transition-all">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder={`Ask your ${personaMeta.label.toLowerCase()}…`}
                    disabled={loading}
                    className="flex-1 bg-transparent resize-none rounded-2xl py-4 pl-5 pr-14 text-[15px] focus:outline-none placeholder:text-muted-foreground/70 max-h-40"
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    aria-label="Send"
                    className="absolute right-2 bottom-2 p-2.5 bg-primary text-primary-foreground rounded-xl shadow-md shadow-primary/25 disabled:opacity-40 disabled:shadow-none active:scale-95 transition-transform"
                  >
                    <ArrowUp className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>

                <div className="flex justify-center items-center gap-2 pt-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <p className="text-[10px] text-muted-foreground/80 font-semibold uppercase tracking-[0.18em]">
                    Overra AI · {personaMeta.label} · {modeLabel} Mode
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AITutor;