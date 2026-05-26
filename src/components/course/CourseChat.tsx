import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Loader2, Sparkles, Pin, Plus, X, SmilePlus, Reply, Bot, ShieldCheck, ChevronDown, ChevronRight, RefreshCw, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { sanitizeAIText } from "@/lib/sanitizeAI";

interface Message {
  id: string;
  course_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  is_ai?: boolean;
  ai_status?: "pending" | "ready" | "failed" | null;
}
interface Reaction { id: string; message_id: string; user_id: string; emoji: string }
interface PinnedPrompt { id: string; course_id: string; content: string; created_by: string; created_at: string }
interface Profile { full_name: string | null; profile_image_url: string | null; avatar_url: string | null }

interface Props { courseId: string; courseCode?: string }

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "💡", "🎯", "🤔"];

const formatStamp = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return `Yesterday · ${format(d, "HH:mm")}`;
  return format(d, "MMM d · HH:mm");
};

export const CourseChat = ({ courseId, courseCode }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pins, setPins] = useState<PinnedPrompt[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [tutorIds, setTutorIds] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [canPost, setCanPost] = useState(true);
  const [isTutorOrAdmin, setIsTutorOrAdmin] = useState(false);
  const [reactingFor, setReactingFor] = useState<string | null>(null);
  const [newPin, setNewPin] = useState("");
  const [showPinForm, setShowPinForm] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadProfiles = async (userIds: string[]) => {
    const need = userIds.filter((id) => !profiles[id]);
    if (need.length === 0) return;
    const { data } = await supabase
      .from("profiles").select("id, full_name, profile_image_url, avatar_url").in("id", need);
    if (data) {
      const map: Record<string, Profile> = {};
      data.forEach((p: any) => (map[p.id] = p));
      setProfiles((prev) => ({ ...prev, ...map }));
    }
    // Mark which users are tutors of THIS course
    const { data: q } = await supabase
      .from("quizzes").select("tutor_id").eq("course_id", courseId).in("tutor_id", need);
    if (q && q.length > 0) {
      setTutorIds((prev) => {
        const next = new Set(prev);
        q.forEach((r: any) => next.add(r.tutor_id));
        return next;
      });
    }
  };

  // Detect if current user is the course tutor or an admin (for pin permissions)
  useEffect(() => {
    if (!user || !courseId) return;
    (async () => {
      const [{ data: q }, { data: roles }] = await Promise.all([
        supabase.from("quizzes").select("id").eq("course_id", courseId).eq("tutor_id", user.id).limit(1),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const admin = (roles ?? []).some((r: any) => r.role === "admin");
      setIsTutorOrAdmin((q?.length ?? 0) > 0 || admin);
    })();
  }, [user, courseId]);

  useEffect(() => {
    if (!courseId) return;
    let active = true;
    (async () => {
      const [msgRes, pinRes] = await Promise.all([
        supabase.from("course_chat_messages").select("*").eq("course_id", courseId).order("created_at", { ascending: true }).limit(200),
        supabase.from("course_pinned_prompts").select("*").eq("course_id", courseId).order("created_at", { ascending: false }).limit(20),
      ]);
      if (!active) return;
      if (msgRes.error) { setCanPost(false); setLoading(false); return; }
      const msgs = (msgRes.data as Message[]) || [];
      setMessages(msgs);
      setPins((pinRes.data as PinnedPrompt[]) || []);

      // Reactions
      if (msgs.length > 0) {
        const { data: reactsData } = await supabase
          .from("course_chat_reactions").select("*").in("message_id", msgs.map((m) => m.id));
        if (reactsData) setReactions(reactsData as Reaction[]);
      }

      const ids = [...new Set([...msgs.map((m) => m.user_id), ...((pinRes.data as PinnedPrompt[]) ?? []).map((p) => p.created_by)])];
      if (ids.length > 0) loadProfiles(ids);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`course-chat-${courseId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "course_chat_messages", filter: `course_id=eq.${courseId}` },
        (payload) => {
          if ((payload as any).eventType === "DELETE") {
            const old = (payload as any).old as Message;
            setMessages((prev) => prev.filter((x) => x.id !== old.id));
            return;
          }
          const m = (payload as any).new as Message;
          setMessages((prev) => {
            const idx = prev.findIndex((x) => x.id === m.id);
            if (idx === -1) return [...prev, m];
            const next = prev.slice();
            next[idx] = m;
            return next;
          });
          if (m.user_id && !profiles[m.user_id]) loadProfiles([m.user_id]);
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "course_chat_reactions" },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            const r = payload.new as Reaction;
            setReactions((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
          } else if (payload.eventType === "DELETE") {
            const r = payload.old as Reaction;
            setReactions((prev) => prev.filter((x) => x.id !== r.id));
          }
        },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "course_pinned_prompts", filter: `course_id=eq.${courseId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") setPins((prev) => [payload.new as PinnedPrompt, ...prev]);
          else if (payload.eventType === "DELETE") setPins((prev) => prev.filter((p) => p.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length]);

  const invokeAI = async (prompt: string, parentId: string | null) => {
    try {
      await supabase.functions.invoke("course-ai-reply", {
        body: { course_id: courseId, prompt, parent_id: parentId, course_code: courseCode ?? null },
      });
    } catch (e) {
      console.error("AI reply failed", e);
      toast.error("AI reply failed.");
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setSending(true);
    const body = text.trim().slice(0, 2000);
    const parentId = replyTo?.id ?? null;
    setText("");
    setReplyTo(null);
    const { data: inserted, error } = await supabase
      .from("course_chat_messages")
      .insert({ course_id: courseId, user_id: user.id, content: body, parent_id: parentId })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error("Couldn't send message. Please sign in and try again.");
      setText(body);
      setReplyTo(replyTo);
      return;
    }
    if (inserted) {
      const m = inserted as Message;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    }
    if (/@AI\b/i.test(body)) {
      invokeAI(body.replace(/@AI\b/i, "").trim() || body, parentId);
    }
    if (/@tutor\b/i.test(body)) {
      try {
        const { data: count } = await supabase.rpc("notify_course_tutors", {
          _course_id: courseId,
          _snippet: body,
          _link: `/courses/${courseId}`,
        });
        if ((count ?? 0) > 0) toast.success("Tutor pinged");
        else toast.message("No tutor is attached to this course yet.");
      } catch (err) {
        console.error("notify_course_tutors failed", err);
      }
    }
  };

  const retryAI = async (aiMsg: Message) => {
    // find prompt: the parent message that triggered this AI reply (same parent_id user message)
    const prompt = messages.find((m) => m.id === aiMsg.parent_id)?.content;
    if (!prompt) { toast.error("Couldn't find the original question."); return; }
    await supabase.from("course_chat_messages")
      .update({ content: "_thinking…_", ai_status: "pending" }).eq("id", aiMsg.id);
    invokeAI(prompt.replace(/@AI\b/i, "").trim() || prompt, aiMsg.parent_id ?? null);
  };

  const useAsPrompt = (content: string) => {
    setText((t) => (t ? `${t} ${content}` : content));
  };

  const insertMention = (token: string) => {
    setText((t) => {
      if (new RegExp(`${token}\\b`, "i").test(t)) return t;
      return t ? `${token} ${t}` : `${token} `;
    });
  };

  const addPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPin.trim()) return;
    const body = newPin.trim().slice(0, 500);
    const { error } = await supabase
      .from("course_pinned_prompts").insert({ course_id: courseId, content: body, created_by: user.id });
    if (error) {
      toast.error("Only the course tutor or an admin can pin prompts.");
      return;
    }
    setNewPin(""); setShowPinForm(false);
  };

  const removePin = async (id: string) => {
    const { error } = await supabase.from("course_pinned_prompts").delete().eq("id", id);
    if (error) toast.error("Couldn't remove pin.");
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from("course_chat_reactions").delete().eq("id", existing.id);
    } else {
      await supabase.from("course_chat_reactions").insert({ message_id: messageId, user_id: user.id, emoji });
    }
    setReactingFor(null);
  };

  // Group reactions by message+emoji
  const reactionMap = useMemo(() => {
    const map: Record<string, Record<string, { count: number; mine: boolean }>> = {};
    for (const r of reactions) {
      map[r.message_id] = map[r.message_id] || {};
      const slot = map[r.message_id][r.emoji] || { count: 0, mine: false };
      slot.count += 1;
      if (r.user_id === user?.id) slot.mine = true;
      map[r.message_id][r.emoji] = slot;
    }
    return map;
  }, [reactions, user?.id]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top: Message[] = [];
    const byParent: Record<string, Message[]> = {};
    for (const m of messages) {
      if (m.parent_id) {
        (byParent[m.parent_id] = byParent[m.parent_id] || []).push(m);
      } else {
        top.push(m);
      }
    }
    return { topLevel: top, repliesByParent: byParent };
  }, [messages]);

  const toggleThread = (id: string) => {
    setOpenThreads((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const renderMessage = (m: Message, depth = 0) => {
    const mine = m.user_id === user?.id;
    const isAi = !!m.is_ai;
    const status = m.ai_status as Message["ai_status"];
    const p = profiles[m.user_id];
    const rx = reactionMap[m.id] || {};
    const isTutor = tutorIds.has(m.user_id) && !isAi;

    if (isAi) {
      return (
        <div key={m.id} className={cn("flex gap-2", depth > 0 && "ml-7")}>
          <div className="h-7 w-7 shrink-0 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold text-amber-800">OverraPrep AI</span>
              {status === "pending" && (
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> thinking…
                </span>
              )}
              {status === "failed" && (
                <span className="text-[10px] text-rose-600 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> failed
                </span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">{formatStamp(m.created_at)}</span>
            </div>
            <div className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm bg-white border-l-2 border-amber-400 border-y border-r border-amber-100/80 shadow-sm",
              "ai-prose prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:my-1.5 prose-li:my-0.5 prose-code:bg-amber-50 prose-code:px-1 prose-code:rounded",
            )}>
              <ReactMarkdown>{sanitizeAIText(m.content)}</ReactMarkdown>
            </div>
            {status === "failed" && (
              <button
                type="button" onClick={() => retryAI(m)}
                className="mt-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={m.id} className={cn("flex gap-2", mine && depth === 0 && "flex-row-reverse", depth > 0 && "ml-7")}>
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage src={p?.profile_image_url || p?.avatar_url || undefined} />
          <AvatarFallback className="bg-amber-100 text-amber-800 text-[10px] font-bold">
            {p?.full_name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className={cn("max-w-[78%]", mine && depth === 0 && "text-right")}>
          <div className={cn("flex items-center gap-1.5 mb-0.5", mine && depth === 0 && "justify-end")}>
            <span className="text-[11px] font-semibold">{p?.full_name || "Member"}</span>
            {isTutor && (
              <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-800 border border-amber-300 rounded-full px-1.5 py-[1px]">
                <ShieldCheck className="w-2.5 h-2.5" /> Tutor
              </span>
            )}
            <span
              className="text-[10px] text-muted-foreground"
              title={`${format(new Date(m.created_at), "PPpp")} · ${formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}`}
            >
              {formatStamp(m.created_at)}
            </span>
          </div>
          <div className="relative group">
            <div
              className={cn(
                "px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words shadow-sm",
                mine
                  ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-br-sm"
                  : "bg-white border border-amber-100 text-foreground rounded-bl-sm",
              )}
            >
              {m.content}
            </div>
            <div className={cn(
              "absolute -bottom-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition",
              mine && depth === 0 ? "-left-2" : "-right-2",
            )}>
              <button
                type="button"
                onClick={() => setReactingFor(reactingFor === m.id ? null : m.id)}
                aria-label="Add reaction"
                className="h-6 w-6 rounded-full bg-white border border-amber-200 shadow flex items-center justify-center text-amber-700"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
              {depth === 0 && (
                <button
                  type="button"
                  onClick={() => setReplyTo(m)}
                  aria-label="Reply"
                  className="h-6 w-6 rounded-full bg-white border border-amber-200 shadow flex items-center justify-center text-amber-700"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          {reactingFor === m.id && (
            <div className="mt-1 inline-flex gap-1 bg-white border border-amber-200 rounded-full px-1.5 py-1 shadow">
              {QUICK_EMOJIS.map((emo) => (
                <button
                  key={emo} type="button"
                  onClick={() => toggleReaction(m.id, emo)}
                  className="text-base hover:scale-125 transition"
                  aria-label={`React with ${emo}`}
                >
                  {emo}
                </button>
              ))}
            </div>
          )}
          {Object.keys(rx).length > 0 && (
            <div className={cn("mt-1 flex flex-wrap gap-1", mine && depth === 0 && "justify-end")}>
              {Object.entries(rx).map(([emo, info]) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => toggleReaction(m.id, emo)}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition",
                    info.mine
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-white border-amber-100 text-foreground hover:bg-amber-50",
                  )}
                >
                  <span>{emo}</span>
                  <span className="font-semibold tabular-nums">{info.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20">
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-base flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          Course Chat {courseCode && <span className="text-xs font-normal text-muted-foreground">· {courseCode}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pinned brainstorming prompts */}
        <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
              <Pin className="w-3 h-3" /> Brainstorm prompts
            </p>
            {isTutorOrAdmin && (
              <button
                type="button"
                onClick={() => setShowPinForm((v) => !v)}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {showPinForm ? "Cancel" : "Add"}
              </button>
            )}
          </div>
          {showPinForm && isTutorOrAdmin && (
            <form onSubmit={addPin} className="flex gap-1.5 mb-2">
              <Input
                value={newPin} onChange={(e) => setNewPin(e.target.value)}
                placeholder="e.g. What surprised you about today's topic?"
                maxLength={500}
                className="flex-1 h-8 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-white">Pin</Button>
            </form>
          )}
          {pins.length === 0 ? (
            <p className="text-[11px] text-amber-700/70 italic">
              {isTutorOrAdmin ? "Pin a question to spark discussion." : "No pinned prompts yet — start brainstorming below."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pins.map((p) => (
                <div key={p.id} className="group inline-flex items-center gap-1 bg-white border border-amber-200 rounded-full pl-2.5 pr-1 py-0.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => useAsPrompt(p.content)}
                    className="text-[11px] font-medium text-amber-900 hover:text-amber-700 max-w-[260px] truncate"
                    title={p.content}
                  >
                    {p.content}
                  </button>
                  {(isTutorOrAdmin || p.created_by === user?.id) && (
                    <button
                      type="button"
                      onClick={() => removePin(p.id)}
                      aria-label="Remove pinned prompt"
                      className="text-amber-700/60 hover:text-rose-600 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <ScrollArea className="h-72 pr-3" ref={scrollRef as any}>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-amber-600" /></div>
          ) : topLevel.length === 0 ? (
            <div className="py-10 text-center">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">Start the conversation</p>
              <p className="text-xs text-muted-foreground mt-1">
                Brainstorm with classmates and the tutor — try{" "}
                <span className="font-mono bg-amber-100 text-amber-900 px-1 rounded">@AI</span>{" "}
                to ask OverraPrep AI a question.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {topLevel.map((m) => {
                const replies = repliesByParent[m.id] ?? [];
                const open = openThreads.has(m.id);
                return (
                  <div key={m.id} className="space-y-2">
                    {renderMessage(m, 0)}
                    {replies.length > 0 && (
                      <div className="ml-9 space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleThread(m.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800"
                        >
                          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {replies.length} {replies.length === 1 ? "reply" : "replies"}
                        </button>
                        {open && (
                          <div className="space-y-3 pl-2 border-l-2 border-amber-100">
                            {replies.map((r) => renderMessage(r, 1))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {canPost ? (
          <div className="space-y-1.5">
            {replyTo && (
              <div className="flex items-center gap-2 text-[11px] bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                <Reply className="w-3 h-3 text-amber-700 shrink-0" />
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium text-amber-900 truncate">{(profiles[replyTo.user_id]?.full_name || "Member")}: {replyTo.content}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <form onSubmit={send} className="flex gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyTo ? "Reply… @tutor calls tutor · @AI asks AI" : "Ask anything… @tutor calls tutor · @AI asks AI"}
                maxLength={2000}
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!text.trim() || sending} className="bg-amber-500 hover:bg-amber-600 text-white">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => insertMention("@tutor")}
                className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 inline-flex items-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" /> @tutor
              </button>
              <button
                type="button"
                onClick={() => insertMention("@AI")}
                className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 inline-flex items-center gap-1"
              >
                <Bot className="w-3 h-3" /> @AI
              </button>
              <span className="text-[10px] text-muted-foreground ml-auto">Be kind — everyone is learning.</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-2">
            Sign in to join the discussion.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CourseChat;
