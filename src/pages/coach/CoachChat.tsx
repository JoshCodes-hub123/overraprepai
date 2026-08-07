import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUp, Copy, Check, ChevronDown, GraduationCap, Bot } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAITutorThreads } from "@/hooks/useAITutorThreads";
import { useAITutorMessages } from "@/hooks/useAITutorMessages";
import { useCoachContext } from "@/hooks/useCoachContext";
import { SEO } from "@/components/seo/SEO";
import { CoachMarkdown } from "@/components/coach/CoachMarkdown";
import { cn } from "@/lib/utils";

type Mode = "explain" | "practice" | "test" | "revision" | "summary";

const MODES: { id: Mode; label: string }[] = [
  { id: "explain", label: "Explain" },
  { id: "practice", label: "Practice" },
  { id: "test", label: "Test me" },
  { id: "revision", label: "Revision" },
  { id: "summary", label: "Summary" },
];

const titleFrom = (s: string) => {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > 46 ? `${t.slice(0, 46)}…` : t || "New conversation";
};

/**
 * The Overra AI Coach conversation. One column, no bubbles for Overra, a quiet
 * ink bubble for the student — the reading experience is the product.
 */
const CoachChat = () => {
  const navigate = useNavigate();
  const { threadId: routeThreadId } = useParams<{ threadId?: string }>();
  const [params] = useSearchParams();
  const { user, profile } = useAuth();
  const { contextLine } = useCoachContext();

  const courseId = params.get("course") ?? undefined;
  const topicId = params.get("topic") ?? undefined;

  const { threads, createThread, renameThread } = useAITutorThreads();
  const { messages: dbMessages, setLocalMessages } = useAITutorMessages(routeThreadId ?? null);

  const activeThread = threads.find((t) => t.id === routeThreadId) ?? null;
  const [mode, setMode] = useState<Mode | null>((params.get("mode") as Mode) ?? null);
  const [modeOpen, setModeOpen] = useState(false);
  const [input, setInput] = useState("");
  const [stream, setStream] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sentRef = useRef(false);

  // Course/topic labels for the header — real rows only, never invented.
  const [focus, setFocus] = useState<{ course: string | null; topic: string | null }>({
    course: null,
    topic: null,
  });
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!courseId) return;
      const { data: c } = await supabase
        .from("courses")
        .select("code")
        .eq("id", courseId)
        .maybeSingle();
      let topicName: string | null = null;
      if (topicId) {
        const { data: t } = await supabase
          .from("topics")
          .select("name")
          .eq("id", topicId)
          .maybeSingle();
        topicName = t?.name ?? null;
      }
      if (!cancel) setFocus({ course: c?.code ?? null, topic: topicName });
    })();
    return () => {
      cancel = true;
    };
  }, [courseId, topicId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [dbMessages.length, stream]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [routeThreadId]);

  const send = useCallback(
    async (text: string, forThreadId?: string) => {
      const body = text.trim();
      if (!body || busy) return;
      if (!user?.id) {
        toast.error("Please sign in to chat with Overra.");
        return;
      }

      let threadId = forThreadId ?? routeThreadId ?? null;
      let history = dbMessages.map((m) => ({ role: m.role, content: m.content }));
      // Navigating to /coach/chat/:id remounts this screen and would abort an
      // in-flight stream, so a brand-new thread only takes over the URL after
      // the answer has fully arrived.
      let pendingUrl: string | null = null;

      if (!threadId) {
        const t = await createThread("tutor", titleFrom(body));
        if (!t) {
          toast.error("Could not start the conversation");
          return;
        }
        threadId = t.id;
        history = [];
        const qs = new URLSearchParams();
        if (mode) qs.set("mode", mode);
        if (courseId) qs.set("course", courseId);
        if (topicId) qs.set("topic", topicId);
        pendingUrl = `/coach/chat/${t.id}${qs.toString() ? `?${qs}` : ""}`;
      } else if (activeThread?.title === "New conversation") {
        renameThread(threadId, titleFrom(body));
      }


      setInput("");
      setBusy(true);

      const tempId = `temp-${Date.now()}`;
      setLocalMessages((prev) => [
        ...prev,
        {
          id: tempId,
          thread_id: threadId!,
          user_id: user.id,
          role: "user",
          content: body,
          rating: null,
          created_at: new Date().toISOString(),
        },
      ]);

      const { data: savedUser } = await supabase
        .from("ai_tutor_messages")
        .insert({ thread_id: threadId!, user_id: user.id, role: "user", content: body })
        .select("*")
        .single();
      if (savedUser) {
        setLocalMessages((prev) => prev.map((m) => (m.id === tempId ? (savedUser as any) : m)));
      }

      setStream("");
      let acc = "";
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) throw new Error("Please sign in to chat.");

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor-chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({
              messages: [...history, { role: "user", content: body }],
              persona: "tutor",
              ...(mode ? { mode } : {}),
              ...(courseId ? { course_id: courseId } : {}),
              ...(topicId ? { topic_id: topicId } : {}),
            }),
          },
        );
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Overra is unavailable (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        // SSE frames can split across chunks, so keep the tail until it ends
        // with a newline — otherwise half a JSON frame is silently dropped.
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content || "";
              if (delta) {
                acc += delta;
                setStream(acc);
              }
            } catch {
              /* not a complete JSON frame */
            }
          }
        }

        if (acc.trim()) {
          const { data: savedAI } = await supabase
            .from("ai_tutor_messages")
            .insert({ thread_id: threadId!, user_id: user.id, role: "assistant", content: acc })
            .select("*")
            .single();
          if (savedAI) setLocalMessages((prev) => [...prev, savedAI as any]);
        }

        if (pendingUrl) navigate(pendingUrl, { replace: true });
      } catch (e: any) {
        toast.error(e?.message || "Overra could not answer. Please try again.");
      } finally {
        setStream(null);
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [
      busy,
      user?.id,
      routeThreadId,
      dbMessages,
      createThread,
      activeThread?.title,
      renameThread,
      navigate,
      mode,
      courseId,
      topicId,
      setLocalMessages,
    ],
  );

  // A prompt handed over from the coach home / a course / a topic.
  useEffect(() => {
    const q = params.get("q");
    if (!q || sentRef.current || !user?.id || routeThreadId) return;
    sentRef.current = true;
    send(q);
  }, [params, user?.id, routeThreadId, send]);

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const headerContext = useMemo(() => {
    const bits = [focus.course, focus.topic].filter(Boolean);
    return bits.length ? bits.join(" · ") : contextLine;
  }, [focus, contextLine]);

  const empty = dbMessages.length === 0 && stream === null;

  return (
    <>
      <SEO title="Overra AI" description="Your academic companion." noindex />
      <div
        className="flex h-[100dvh] flex-col overflow-hidden bg-brand-surface text-brand-ink"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-brand-line bg-brand-surface/95 px-5 py-3 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/coach")}
              aria-label="Back to Overra AI"
              className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-brand-ink-soft hover:bg-brand-soft hover:text-brand-ink"
            >
              <ChevronDown className="h-5 w-5 rotate-90" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold tracking-tight text-brand-ink">
                {activeThread?.title && activeThread.title !== "New conversation"
                  ? activeThread.title
                  : "Overra AI"}
              </p>
              {headerContext && (
                <p className="truncate text-[12px] text-brand-ink-soft">{headerContext}</p>
              )}
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setModeOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-brand-line px-3 py-1.5 text-[12px] font-bold text-brand-ink"
              >
                {mode ? MODES.find((m) => m.id === mode)?.label : "Study mode"}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {modeOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-brand border border-brand-line bg-brand-surface shadow-lg">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id === mode ? null : m.id);
                        setModeOpen(false);
                      }}
                      className={cn(
                        "block w-full px-3.5 py-2.5 text-left text-[13.5px] hover:bg-brand-soft",
                        m.id === mode ? "font-bold text-env" : "text-brand-ink",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
          <div className="mx-auto w-full max-w-2xl">
            {empty && (
              <div className="pt-6">
                <p className="text-[19px] font-bold tracking-tight text-brand-ink">
                  {focus.course
                    ? `You're studying ${focus.course}${focus.topic ? ` · ${focus.topic}` : ""}. What would you like help with?`
                    : "Start with a question."}
                </p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-brand-ink-soft">
                  Ask Overra to explain a topic, solve a problem, quiz you, or help you plan your
                  study.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {dbMessages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap rounded-brand bg-brand-ink px-4 py-2.5 text-[15px] leading-relaxed text-brand-surface">
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={m.id}>
                    <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-env">
                      <Bot className="h-3.5 w-3.5" aria-hidden /> Overra AI
                    </p>
                    <CoachMarkdown>{m.content}</CoachMarkdown>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copy(m.id, m.content)}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-line px-2.5 py-1 text-[12px] font-semibold text-brand-ink-soft hover:bg-brand-soft"
                      >
                        {copied === m.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copied === m.id ? "Copied" : "Copy"}
                      </button>
                      {[
                        { label: "Ask deeper", q: "Go deeper on that." },
                        { label: "Give me an example", q: "Give me a worked example." },
                        { label: "Quiz me", q: "Quiz me on that, one question at a time." },
                      ].map((a) => (
                        <button
                          key={a.label}
                          type="button"
                          disabled={busy}
                          onClick={() => send(a.q)}
                          className="rounded-full border border-brand-line px-2.5 py-1 text-[12px] font-semibold text-brand-ink-soft hover:bg-brand-soft disabled:opacity-50"
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ),
              )}

              {stream !== null && (
                <div>
                  <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-env">
                    <Bot className="h-3.5 w-3.5" aria-hidden /> Overra AI
                  </p>
                  {stream ? (
                    <CoachMarkdown>{stream}</CoachMarkdown>
                  ) : (
                    <p className="animate-pulse text-[15px] text-brand-ink-soft">Thinking…</p>
                  )}
                </div>
              )}
            </div>
            <div ref={endRef} className="h-2" />
          </div>
        </div>

        {/* Composer — stays reachable when the keyboard is open */}
        <div
          className="sticky bottom-0 z-20 border-t border-brand-line bg-brand-surface/95 px-5 pt-3 backdrop-blur-xl"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          <form
            className="mx-auto flex w-full max-w-2xl items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={
                mode === "test" ? "Answer, or ask for the next question…" : "Ask Overra anything…"
              }
              className="max-h-[140px] min-h-[44px] flex-1 resize-none rounded-brand border border-brand-line bg-brand-surface px-3.5 py-2.5 text-[15px] leading-relaxed text-brand-ink outline-none placeholder:text-brand-ink-soft/70 focus:border-env"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-env text-white transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
          {!headerContext && profile && (
            <p className="mx-auto mt-2 flex w-full max-w-2xl items-center gap-1 text-[11.5px] text-brand-ink-soft">
              <GraduationCap className="h-3 w-3" aria-hidden /> Overra answers using your own
              academic profile.
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default CoachChat;
