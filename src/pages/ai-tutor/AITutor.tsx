import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { ArrowUp, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";
import { supabase } from "@/integrations/supabase/client";

interface Message { role: "user" | "assistant"; content: string; }

const SUGGESTIONS = [
  "Explain a concept",
  "Quiz me",
  "Summarize my notes",
  "Plan my study week",
];

const AITutor = () => {
  const { profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your **Overra AI Tutor**. Ask me anything — a tough concept, an exam question, or study tips. I'll adapt to your level." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
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
      let assistant = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              assistant += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Chat failed");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const showSuggestions = messages.length <= 1 && !loading;

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
              <span className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase border border-primary/30 px-2.5 py-1 rounded-full bg-primary/5">
                {modeLabel} Mode
              </span>
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
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "assistant" ? (
                  <div className="max-w-[92%]">
                    <div className="text-[10px] font-bold tracking-[0.18em] text-primary uppercase mb-1.5">
                      Overra
                    </div>
                    {m.content ? (
                      <div className="ai-prose max-w-none text-[15px] leading-relaxed text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {sanitizeAIText(m.content)}
                        </ReactMarkdown>
                      </div>
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
                    key={s}
                    onClick={() => send(s)}
                    className="whitespace-nowrap px-4 py-2 rounded-full border border-border/70 text-[13px] font-medium text-muted-foreground bg-background/60 backdrop-blur hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
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