import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Send, Sparkles, Share2, Copy, Check, MoreVertical, Flag, Ban,
  RefreshCw, Settings2, FileText, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useChatMessages, type ChatMessage } from "@/hooks/useChatMessages";
import { markThreadRead } from "@/hooks/useChatThreads";
import { useUserBlocks, reportMessage } from "@/hooks/useChatModeration";
import MessageBubble from "@/components/chat/MessageBubble";
import AiTypingDots from "@/components/chat/AiTypingDots";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { saveTextNote } from "@/lib/userResources";
import { AddBulkToReviewButton } from "@/components/student/AddToReviewButton";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import ReactMarkdown from "react-markdown";

type Thread = {
  id: string; kind: string; title: string | null; invite_code: string | null;
  invite_expires_at: string | null; invite_single_use: boolean; invite_used_at: string | null;
  created_by: string;
};

type ExpiryChoice = "never" | "1h" | "24h" | "7d";

function expiryToDate(c: ExpiryChoice): string | null {
  if (c === "never") return null;
  const ms = c === "1h" ? 3_600_000 : c === "24h" ? 86_400_000 : 7 * 86_400_000;
  return new Date(Date.now() + ms).toISOString();
}

export default function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages: rawMessages, profiles, loading, send, aiTyping } = useChatMessages(threadId);
  const { blocked, block, unblock } = useUserBlocks();
  const [searchParams] = useSearchParams();
  const focusMsgId = searchParams.get("msg");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Invite settings dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [expiry, setExpiry] = useState<ExpiryChoice>("never");
  const [singleUse, setSingleUse] = useState(false);
  const [savingInvite, setSavingInvite] = useState(false);

  // Summarize dialog
  type SummLength = "short" | "medium" | "long";
  type SummRef = { n: number; author: string; excerpt: string };
  type SummKey = { text: string; citations: number[] };
  type SummCard = { question: string; answer: string; citations: number[] };
  const [summOpen, setSummOpen] = useState(false);
  const [summMode, setSummMode] = useState<"notes" | "flashcards">("notes");
  const [summLength, setSummLength] = useState<SummLength>("medium");
  const [summBusy, setSummBusy] = useState(false);
  const [summResult, setSummResult] = useState<{
    notes?: string;
    key_points?: SummKey[];
    flashcards?: SummCard[];
    references?: SummRef[];
  } | null>(null);

  // Report dialog
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filter blocked users (UI-only; messages still exist server-side)
  const messages = useMemo(
    () => rawMessages.filter(m => !m.author_id || !blocked.has(m.author_id)),
    [rawMessages, blocked]
  );

  useEffect(() => {
    if (!threadId) return;
    supabase.from("chat_threads").select("*").eq("id", threadId).maybeSingle()
      .then(({ data }) => {
        setThread(data as any);
        if (data?.invite_expires_at) {
          const ms = new Date(data.invite_expires_at).getTime() - Date.now();
          setExpiry(ms <= 3.6e6 ? "1h" : ms <= 8.7e7 ? "24h" : "7d");
        } else setExpiry("never");
        setSingleUse(!!data?.invite_single_use);
      });
  }, [threadId, inviteOpen]);

  useEffect(() => {
    if (threadId && user?.id) markThreadRead(threadId, user.id);
  }, [threadId, user?.id, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, aiTyping]);

  // Deep-link: scroll to & briefly highlight the mentioned message.
  useEffect(() => {
    if (!focusMsgId || loading) return;
    const target = messages.find((m) => m.id === focusMsgId);
    if (!target) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${focusMsgId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightId(focusMsgId);
        setTimeout(() => setHighlightId(null), 2400);
      }
    });
  }, [focusMsgId, loading, messages]);

  useEffect(() => { inputRef.current?.focus(); }, [threadId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { await send(text); setText(""); inputRef.current?.focus(); }
    catch (e: any) { toast.error(e.message || "Failed to send"); }
    finally { setSending(false); }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const insertAi = () => {
    setText(t => (t.trim() ? `${t} @AI ` : "@AI "));
    inputRef.current?.focus();
  };

  const inviteUrl = thread?.invite_code
    ? `${window.location.origin}/chat/join/${thread.invite_code}`
    : "";

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Invite link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const saveInviteSettings = async () => {
    if (!thread) return;
    setSavingInvite(true);
    const { error } = await supabase
      .from("chat_threads")
      .update({
        invite_expires_at: expiryToDate(expiry),
        invite_single_use: singleUse,
        invite_used_at: null, // reset on settings change
      })
      .eq("id", thread.id);
    setSavingInvite(false);
    if (error) return toast.error(error.message);
    toast.success("Invite updated");
  };

  const regenerateCode = async () => {
    if (!thread) return;
    const code = "BR-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const { error } = await supabase
      .from("chat_threads")
      .update({ invite_code: code, invite_used_at: null })
      .eq("id", thread.id);
    if (error) return toast.error(error.message);
    setThread({ ...thread, invite_code: code, invite_used_at: null });
    toast.success("New invite code generated");
  };

  const runSummarize = async () => {
    if (!threadId) return;
    setSummBusy(true); setSummResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-thread", {
        body: { thread_id: threadId, mode: summMode, length: summLength },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummResult(data as any);
    } catch (e: any) {
      toast.error(e.message || "Failed to summarize");
    } finally { setSummBusy(false); }
  };

  const refMap = useMemo(() => {
    const m = new Map<number, SummRef>();
    (summResult?.references ?? []).forEach(r => m.set(r.n, r));
    return m;
  }, [summResult?.references]);

  const saveNotesToLibrary = async () => {
    if (!summResult?.notes || !user?.id) return;
    try {
      await saveTextNote({
        userId: user.id,
        title: `Notes — ${thread?.title ?? "Brainstorm"}`,
        content: summResult.notes,
      });
      toast.success("Saved to your library");
    } catch (e: any) { toast.error(e.message); }
  };

  const submitReport = async () => {
    if (!reportTarget || !reportReason.trim()) return;
    setReporting(true);
    try {
      await reportMessage(reportTarget.id, reportReason.trim());
      toast.success("Report submitted. Thanks for keeping the community safe.");
      setReportTarget(null); setReportReason("");
    } catch (e: any) {
      toast.error(e.code === "23505" ? "You already reported this message" : (e.message || "Failed"));
    } finally { setReporting(false); }
  };

  const handleBlock = async (uid: string) => {
    try {
      await block.mutateAsync(uid);
      toast.success("User blocked. Their messages are hidden.");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background pb-16 md:pb-0">
      <SEO title={thread?.title ?? "Chat"} description="OverraPrep chat" />

      {/* Header */}
      <header className="flex items-center gap-2 px-3 py-3 border-b border-border/60 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/chat")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{thread?.title ?? "Chat"}</h1>
          <p className="text-xs text-muted-foreground capitalize truncate">
            {thread?.kind === "brainstorm" ? "Brainstorm room" : thread?.kind ?? "Loading..."}
            {thread?.invite_code && ` · ${thread.invite_code}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSummOpen(true)} title="Summarize thread">
          <FileText className="w-5 h-5" />
        </Button>
        {thread?.kind === "brainstorm" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title="Invite options">
                <Share2 className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={copyInvite}>
                {copied ? <Check className="w-4 h-4 mr-2 text-primary" /> : <Copy className="w-4 h-4 mr-2" />}
                Copy invite link
              </DropdownMenuItem>
              {thread.created_by === user?.id && (
                <>
                  <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                    <Settings2 className="w-4 h-4 mr-2" /> Invite settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={regenerateCode}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate code
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3">
            <Sparkles className="w-10 h-10 text-primary" />
            <h2 className="font-semibold">No messages yet</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Type <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">@AI</code> to bring in OverraPrep AI.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showAuthor = !prev || prev.author_id !== m.author_id || prev.is_ai !== m.is_ai;
            const isOwn = m.author_id === user?.id;
            return (
              <div
                key={m.id}
                id={`msg-${m.id}`}
                className={`group relative transition-colors ${highlightId === m.id ? "bg-amber-100/60 ring-2 ring-amber-300 rounded-xl" : ""}`}
              >
                <MessageBubble
                  message={m}
                  isOwn={isOwn}
                  author={m.author_id ? profiles[m.author_id] : undefined}
                  showAuthor={showAuthor}
                />
                {!isOwn && !m.is_ai && (
                  <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setReportTarget(m)}>
                          <Flag className="w-4 h-4 mr-2" /> Report message
                        </DropdownMenuItem>
                        {m.author_id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBlock(m.author_id!)} className="text-destructive">
                              <Ban className="w-4 h-4 mr-2" /> Block user
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            );
          })
        )}
        {aiTyping && <AiTypingDots />}
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-background p-2" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" onClick={insertAi} title="Mention @AI" className="shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </Button>
          <Textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message... use @AI for help"
            rows={1}
            className="flex-1 min-h-[40px] max-h-32 resize-none"
          />
          <Button onClick={handleSend} disabled={!text.trim() || sending} size="icon" className="shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Invite settings dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite settings</DialogTitle>
            <DialogDescription>Control who can join with your link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-semibold mb-2 block">Link expires</Label>
              <RadioGroup value={expiry} onValueChange={(v) => setExpiry(v as ExpiryChoice)} className="grid grid-cols-2 gap-2">
                {(["never", "1h", "24h", "7d"] as ExpiryChoice[]).map(v => (
                  <label key={v} className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value={v} id={`exp-${v}`} />
                    <span className="text-sm">{v === "never" ? "Never" : `In ${v}`}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="flex items-center justify-between border rounded-lg px-3 py-2">
              <div>
                <Label className="text-sm font-semibold">Single use</Label>
                <p className="text-xs text-muted-foreground">Link works for one new joiner only.</p>
              </div>
              <Switch checked={singleUse} onCheckedChange={setSingleUse} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Invite link</p>
              <code className="text-xs break-all">{inviteUrl}</code>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyInvite}><Copy className="w-4 h-4 mr-1.5" /> Copy</Button>
            <Button onClick={saveInviteSettings} disabled={savingInvite}>
              {savingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summarize dialog */}
      <Dialog open={summOpen} onOpenChange={(o) => { setSummOpen(o); if (!o) setSummResult(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Summarize this thread</DialogTitle>
            <DialogDescription>Turn the discussion into study material.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Format</Label>
              <RadioGroup value={summMode} onValueChange={(v) => setSummMode(v as any)} className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="notes" id="m-notes" />
                  <span className="text-sm">Study notes</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="flashcards" id="m-cards" />
                  <span className="text-sm">Flashcards</span>
                </label>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Length</Label>
              <RadioGroup value={summLength} onValueChange={(v) => setSummLength(v as SummLength)} className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as SummLength[]).map(v => (
                  <label key={v} className="flex flex-col items-center gap-0.5 border rounded-lg px-2 py-2 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value={v} id={`len-${v}`} className="sr-only" />
                    <span className={`text-sm capitalize ${summLength === v ? "font-semibold text-primary" : ""}`}>{v}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {v === "short" ? (summMode === "notes" ? "~200w" : "6 cards") :
                       v === "medium" ? (summMode === "notes" ? "~450w" : "10 cards") :
                       (summMode === "notes" ? "~800w" : "15 cards")}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {!summResult ? (
              <Button onClick={runSummarize} disabled={summBusy} className="w-full">
                {summBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate
              </Button>
            ) : summResult.notes ? (
              <div className="space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none border rounded-lg p-3 bg-muted/20">
                  <ReactMarkdown>{summResult.notes}</ReactMarkdown>
                </div>
                {summResult.key_points && summResult.key_points.length > 0 && (
                  <div className="border rounded-lg p-3 bg-background">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Key points & sources</p>
                    <ul className="space-y-2">
                      {summResult.key_points.map((kp, i) => (
                        <li key={i} className="text-sm">
                          <span>{kp.text}</span>
                          <CitationChips citations={kp.citations} refMap={refMap} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={saveNotesToLibrary} className="flex-1">Save to Library</Button>
                  <Button variant="outline" onClick={() => setSummResult(null)}>Try again</Button>
                </div>
              </div>
            ) : summResult.flashcards ? (
              <div className="space-y-3">
                <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                  {summResult.flashcards.map((c, i) => (
                    <div key={i} className="border-b last:border-0 pb-2">
                      <p className="text-sm font-semibold">Q: {c.question}</p>
                      <p className="text-sm text-muted-foreground">A: {c.answer}</p>
                      <CitationChips citations={c.citations} refMap={refMap} />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!user?.id || !summResult.flashcards) return;
                      try {
                        await saveTextNote({
                          userId: user.id,
                          title: `Flashcards — ${thread?.title ?? "Brainstorm"}`,
                          content: summResult.flashcards.map(c => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n"),
                        });
                        toast.success("Saved to your library");
                      } catch (e: any) { toast.error(e.message); }
                    }}
                    className="flex-1"
                  >
                    Save to Library
                  </Button>
                  <Button variant="outline" onClick={() => setSummResult(null)}>Try again</Button>
                </div>
                <AddBulkToReviewButton
                  cards={summResult.flashcards.map(c => ({ front: c.question, back: c.answer }))}
                  sourceKind="summary"
                />
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={!!reportTarget} onOpenChange={(o) => { if (!o) { setReportTarget(null); setReportReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report message</DialogTitle>
            <DialogDescription>Tell us what's wrong with this message. Our team will review it.</DialogDescription>
          </DialogHeader>
          {reportTarget && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm max-h-32 overflow-y-auto">
              {reportTarget.content}
            </div>
          )}
          <Textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Why are you reporting this? (e.g. harassment, spam, hate speech)"
            rows={3}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportTarget(null)}>Cancel</Button>
            <Button onClick={submitReport} disabled={reporting || !reportReason.trim()}>
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CitationChips({
  citations,
  refMap,
}: {
  citations?: number[];
  refMap: Map<number, { n: number; author: string; excerpt: string }>;
}) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {citations.map(n => {
        const r = refMap.get(n);
        return (
          <Popover key={n}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title={r ? `${r.author}` : `Message #${n}`}
              >
                [{n}]
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-72 text-xs">
              {r ? (
                <>
                  <p className="font-semibold mb-1">{r.author} · #{n}</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{r.excerpt}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Source #{n}</p>
              )}
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}

