import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { ArrowUp, GraduationCap, Copy, ThumbsUp, ThumbsDown, RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  rating?: "up" | "down" | null;
}

const SUGGESTIONS: { label: string; prompt: string }[] = [
  { label: "CBT practice", prompt: "Give me a quick 5-question CBT-style practice set on a core topic in my course and grade me at the end." },
  { label: "Past questions", prompt: "Show me the most likely past questions for my upcoming exam and walk me through how to solve each." },
  { label: "Anxiety tips", prompt: "I'm feeling anxious about an upcoming exam. Give me practical, science-backed tips to calm down and focus." },
  { label: "Explain a concept", prompt: "Explain a tough concept to me step-by-step with a simple analogy and a quick example." },
  { label: "Quiz me", prompt: "Quiz me with 5 progressively harder questions on a topic I should master this week." },
  { label: "Summarize my notes", prompt: "Help me summarize a set of notes into key points, definitions, and likely exam questions." },
  { label: "Plan my study week", prompt: "Build me a realistic 7-day study plan that balances revision, practice, and rest." },
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi! I'm your **Overra AI Tutor**. Ask me anything — a tough concept, an exam question, or study tips. I'll adapt to your level.",
};

const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const AITutor = () => {
  const { user, profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const storageKey = user?.id ? `overra:ai-tutor:history:${user.id}` : null;

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef<string>("");
  const streamRafRef = useRef<number | null>(null);
  const streamTargetIdRef = useRef<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Message[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  // Persist
  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      // Cap to last 100 messages to keep storage small
      const trimmed = messages.slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch {}
  }, [messages, storageKey, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    const targetId = streamTargetIdRef.current;
    const buf = streamBufferRef.current;
    if (!targetId) return;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === targetId);
      if (idx === -1) return prev;
      if (prev[idx].content === buf) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], content: buf };
      return copy;
    });
  }, []);

  const scheduleStreamFlush = useCallback(() => {
    if (streamRafRef.current != null) return;
    streamRafRef.current = requestAnimationFrame(flushStream);
  }, [flushStream]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const userMsg: Message = { id: newId(), role: "user", content: text };
    const newMessages: Message[] = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error("Please sign in to chat with the AI Tutor.");
        setLoading(false);
        return;
      }
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
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          academic_path: profile?.academic_path || "university",
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const assistantId = newId();
      streamBufferRef.current = "";
      streamTargetIdRef.current = assistantId;
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

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
              scheduleStreamFlush();
            }
          } catch {}
        }
      }
      // Final flush
      if (streamRafRef.current != null) {
        cancelAnimationFrame(streamRafRef.current);
        streamRafRef.current = null;
      }
      flushStream();
      streamTargetIdRef.current = null;
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const handleCopy = async (m: Message) => {
    try {
      await navigator.clipboard.writeText(sanitizeAIText(m.content));
      setCopiedId(m.id);
      setTimeout(() => setCopiedId((c) => (c === m.id ? null : c)), 1500);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleRate = (m: Message, rating: "up" | "down") => {
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, rating: x.rating === rating ? null : rating } : x))
    );
    if (m.rating !== rating) {
      toast.success(rating === "up" ? "Thanks for the feedback!" : "Got it — I'll try to do better.");
    }
  };

  const handleNewChat = () => {
    if (loading) return;
    setMessages([WELCOME_MESSAGE]);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const showSuggestions = messages.length <= 1 && !loading;
  const hasHistory = messages.length > 1;

  return (
    <>
      <SEO title="AI Tutor Chat" description="Chat with your AI tutor — adapts to your academic level." url="https://overraprep.com/ai-tutor" />
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
        <main className="mx-auto w-full max-w-3xl flex-1 flex flex-col px-5 pt-4">
          {/* Hero header */}
          <header className="pb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <GraduationCap className="w-6 h-6 text-primary-foreground" strokeWidth={2} />
              </div>
              <div className="flex items-center gap-2">
                {hasHistory && (
                  <button
                    onClick={handleNewChat}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase border border-border/70 px-2.5 py-1 rounded-full hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
                    aria-label="Start a new chat"
                  >
                    <RotateCcw className="w-3 h-3" strokeWidth={2.5} />
                    New
                  </button>
                )}
                <span className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase border border-primary/30 px-2.5 py-1 rounded-full bg-primary/5">
                  {modeLabel} Mode
                </span>
              </div>
            </div>
            <h1 className="font-display text-[26px] leading-tight font-semibold text-foreground tracking-tight">
              {greeting}{greetingName ? `, ${greetingName}.` : "."}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 font-light">
              I'm your Overra AI Tutor. What are we mastering today?
            </p>
          </header>

          {/* Chat feed */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-7 pb-40 -mx-1 px-1">
            {messages.map((m, i) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "assistant" ? (
                  <div className="max-w-[92%]">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase mb-1.5">
                      Overra
                    </div>
                    {m.content ? (
                      <>
                        <div className="ai-prose max-w-none text-[15px] leading-relaxed text-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {sanitizeAIText(m.content)}
                          </ReactMarkdown>
                        </div>
                        {/* Feedback row — hide on welcome and while this message is still streaming */}
                        {m.id !== "welcome" && !(loading && i === messages.length - 1) && (
                          <div className="flex items-center gap-1 mt-2 -ml-1.5 opacity-70 hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(m)}
                              aria-label="Copy response"
                              title="Copy"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" strokeWidth={2.5} />
                              ) : (
                                <Copy className="w-3.5 h-3.5" strokeWidth={2} />
                              )}
                            </button>
                            <button
                              onClick={() => handleRate(m, "up")}
                              aria-label="Helpful"
                              title="Helpful"
                              aria-pressed={m.rating === "up"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                m.rating === "up"
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleRate(m, "down")}
                              aria-label="Not helpful"
                              title="Not helpful"
                              aria-pressed={m.rating === "down"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                m.rating === "down"
                                  ? "text-destructive bg-destructive/10"
                                  : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                              }`}
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
                {SUGGESTIONS.map((s) => (
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
                placeholder="Ask your tutor anything…"
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
                Overra AI · {modeLabel} Mode
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AITutor;