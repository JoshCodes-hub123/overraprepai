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
import { Bug, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * One-tap problem report. Auto-captures route, search params,
 * viewport, user agent and the most recent runtime error.
 * Persists to public.client_errors with a [USER REPORT] prefix.
 */
export const ReportProblemDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const location = useLocation();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const context = useMemo(() => {
    if (typeof window === "undefined") return null;
    return {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      dpr: window.devicePixelRatio,
      online: navigator.onLine,
      ts: new Date().toISOString(),
    };
  }, [location.pathname, location.search, location.hash, open]);

  useEffect(() => {
    if (!open) setNote("");
  }, [open]);

  const lastErr = open ? getLastError() : null;

  const submit = async () => {
    if (sending) return;
    setSending(true);
    try {
      const payload = {
        user_id: user?.id ?? null,
        message: `[USER REPORT] ${note.trim() || "(no description)"} — ${
          lastErr?.message ?? "no recent error"
        }`.slice(0, 2000),
        stack: lastErr?.stack?.slice(0, 8000) ?? null,
        component_stack: JSON.stringify(
          { context, lastError: lastErr },
          null,
          2,
        ).slice(0, 8000),
        path: context?.path ?? null,
        user_agent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
      };
      const { error } = await supabase.from("client_errors").insert(payload);
      if (error) throw error;
      clearLastError();
      toast.success("Thanks — we got your report", {
        description: "Our team will take a look shortly.",
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Couldn't send report", {
        description: e?.message || "Please try again in a moment.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-600" />
            Report a problem
          </DialogTitle>
          <DialogDescription>
            Tell us what went wrong — we'll attach this page and any error we
            spotted automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="report-note" className="text-xs font-semibold">
              What happened? (optional)
            </Label>
            <Textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. The Claim button doesn't do anything"
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-[11px] font-mono text-amber-900/80 space-y-1">
            <p>
              <span className="font-semibold">Page:</span>{" "}
              {context?.path || "—"}
              {context?.search}
            </p>
            <p>
              <span className="font-semibold">Viewport:</span>{" "}
              {context?.viewport} @{context?.dpr.toFixed(1)}x
            </p>
            <p>
              <span className="font-semibold">Online:</span>{" "}
              {String(context?.online ?? "?")}
            </p>
            {lastErr ? (
              <p className="break-all">
                <span className="font-semibold">Last error:</span>{" "}
                {lastErr.message}
              </p>
            ) : (
              <p className="opacity-70">No recent runtime error captured.</p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={sending}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? "Sending…" : "Send report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportProblemDialog;
