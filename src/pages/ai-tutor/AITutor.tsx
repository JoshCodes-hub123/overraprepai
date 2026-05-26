import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Send, Sparkles, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";
import { supabase } from "@/integrations/supabase/client";

interface Message { role: "user" | "assistant"; content: string; }

const AITutor = () => {
  const { profile, primaryRole } = useAuth();
  const navRole = (primaryRole === "admin" || primaryRole === "tutor" ? primaryRole : "student") as "admin" | "tutor" | "student";
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI Tutor. Ask me anything — a tough concept, an exam question, study tips. I'll adapt to your level." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Use the signed-in user's access token — the edge function requires
      // a real user JWT (not the anon publishable key) to authorize streaming.
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
    }
  };

  return (
    <>
      <SEO title="AI Tutor Chat" description="Chat with your AI tutor — adapts to your academic level." url="https://overraprep.com/ai-tutor" />
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardNav role={navRole} />
        <DashboardBreadcrumb role={navRole} />
        <main className="container mx-auto px-4 py-6 max-w-3xl flex-1 flex flex-col">
          <div className="mb-4">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" /> AI Tutor
              <span className="text-xs font-normal text-muted-foreground ml-2 capitalize">({profile?.academic_path || "university"} mode)</span>
            </h1>
          </div>

          <Card className="flex-1 flex flex-col p-0 overflow-hidden">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[420px]">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted text-foreground"}`}>
                    {m.role === "assistant" ? (
                      m.content ? (
                        <div className="ai-prose max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{sanitizeAIText(m.content)}</ReactMarkdown>
                        </div>
                      ) : (loading && i === messages.length - 1 ? <Sparkles className="w-4 h-4 animate-pulse" /> : "")
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.role === "user" && <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0"><UserIcon className="w-4 h-4" /></div>}
                </div>
              ))}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Ask anything..."
                disabled={loading}
              />
              <Button onClick={send} disabled={loading || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </>
  );
};

export default AITutor;
