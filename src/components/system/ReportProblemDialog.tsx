import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLastError, clearLastError } from "@/lib/lastError";
import { queueOfflineSupportReport } from "@/lib/autoOfflineSeeder";
import { MessageSquarePlus, Send, MessageCircle, WifiOff } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ISSUE_CATEGORIES = [
  "Question / Answer Typo",
  "Missing Course or PDF",
  "Offline / Network Issue",
  "Tokens or Billing",
  "Feature Suggestion",
] as const;

/**
 * Student Support, Issue Report & WhatsApp Desk Dialog.
 * Works both online and offline (queues reports in localStorage when offline
 * and flushes automatically on reconnect).
 */
export const ReportProblemDialog = ({ open, onOpenChange }: Props) => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [category, setCategory] = useState<string>(ISSUE_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const context = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      path: location.pathname,
      search: location.search,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      university: (profile as any)?.university || "University",
      level: (profile as any)?.level || "",
      ts: new Date().toISOString(),
    };
  }, [location.pathname, location.search, open, profile]);

  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  const lastErr = open ? getLastError() : null;

  const submit = async () => {
    if (sending) return;
    if (!note.trim()) {
      toast.error("Please briefly describe what you need help with.");
      return;
    }

    setSending(true);
    const fullMessage = `[${category.toUpperCase()}] ${note.trim()}`;

    // Offline-first fallback: queue locally if offline
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueOfflineSupportReport({
        category,
        message: fullMessage,
        path: context?.path || "/",
        userId: user?.id ?? null,
      });
      setSending(false);
      toast.success("Saved offline — will send automatically when back online", {
        description: "Your feedback has been safely queued on your phone.",
      });
      onOpenChange(false);
      return;
    }

    try {
      const payload = {
        user_id: user?.id ?? null,
        message: `${fullMessage} — ${lastErr?.message ?? "student support"}`.slice(0, 2000),
        stack: lastErr?.stack?.slice(0, 8000) ?? null,
        component_stack: JSON.stringify(
          { category, context, lastError: lastErr },
          null,
          2
        ).slice(0, 8000),
        path: context?.path ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };
      const { error } = await supabase.from("client_errors").insert(payload);
      if (error) throw error;
      clearLastError();
      toast.success("Received — our academic support team is on it!", {
        description: "Thank you for helping us keep OverraPrep accurate for every student.",
      });
      onOpenChange(false);
    } catch {
      // Even if Supabase fails on a flaky connection, queue it locally so the student never sees an error!
      queueOfflineSupportReport({
        category,
        message: fullMessage,
        path: context?.path || "/",
        userId: user?.id ?? null,
      });
      toast.success("Report saved — queued for delivery", {
        description: "Your network is weak, so we saved your message and will deliver it automatically.",
      });
      onOpenChange(false);
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = useMemo(() => {
    const uni = (profile as any)?.university || "University";
    const lvl = (profile as any)?.level ? `${(profile as any).level}L` : "";
    const text = encodeURIComponent(
      `Hello OverraPrep Support! I am a ${uni} ${lvl} student.\nCategory: ${category}\nPage: ${
        location.pathname
      }\nMessage: ${note.trim() || "I need quick assistance with my study account."}`
    );
    return `https://wa.me/2348100000000?text=${text}`;
  }, [profile, category, location.pathname, note]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-extrabold text-[#18181B]">
            <MessageSquarePlus className="w-5 h-5 text-[#B48A1E]" />
            Student Help &amp; Fast Support
          </DialogTitle>
          <DialogDescription className="text-xs text-[#52525B]">
            Spot a question typo, missing course PDF, or network hiccup? Let us know below or message our WhatsApp support desk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5">
          {/* Quick Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-[#18181B]">1. Select Topic</Label>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-[#18181B] text-[#D4AF37] font-bold"
                        : "bg-white border border-[#E6E0D4] text-[#52525B] hover:border-[#D4AF37]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label htmlFor="report-note" className="text-xs font-bold text-[#18181B]">
              2. How can we help?
            </Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Please add MTH 102 past questions for 100L, or Question 4 option B has a typo…"
              rows={3}
              className="mt-1.5 rounded-xl border-[#E6E0D4] bg-white text-xs sm:text-sm text-[#18181B]"
            />
          </div>

          {context && !context.online && (
            <div className="rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 p-2.5 text-xs text-[#9A7B1C] flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                You are offline — your message will be saved on your phone and sent automatically when network returns.
              </span>
            </div>
          )}

          {/* Direct WhatsApp Support Option */}
          <div className="pt-1 border-t border-[#E6E0D4] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>Chat on WhatsApp</span>
            </a>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs font-semibold text-[#52525B] h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={sending}
                className="bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] font-bold text-xs h-10 px-4 rounded-xl cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-[#D4AF37]" />
                {sending ? "Sending…" : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportProblemDialog;
