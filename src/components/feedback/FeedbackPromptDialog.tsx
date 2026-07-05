import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LATER_KEY = (uid: string) => `overra_feedback_later:${uid}`;
const DONE_KEY = (uid: string) => `overra_feedback_done:${uid}`;
const LATER_DAYS = 3;

/**
 * Lightweight app-rating prompt. Shows once per user after login (with a
 * 3-day "remind me later" cooldown). Writes to `user_feedback`. Non-blocking.
 */
export function FeedbackPromptDialog() {
  const { user, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(DONE_KEY(user.id))) return;
        const later = localStorage.getItem(LATER_KEY(user.id));
        if (later && Date.now() < Number(later)) return;

        // Confirm no server-side record either (in case they cleared storage)
        const { data } = await supabase
          .from("user_feedback")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (data) {
          localStorage.setItem(DONE_KEY(user.id), "1");
          return;
        }
        if (cancelled) return;
        // Small delay so it doesn't jump in front of the first paint
        setTimeout(() => !cancelled && setOpen(true), 2500);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user, isLoading]);

  const dismissLater = () => {
    if (user) localStorage.setItem(LATER_KEY(user.id), String(Date.now() + LATER_DAYS * 86400_000));
    setOpen(false);
  };

  const submit = async () => {
    if (!user || rating === 0) { toast.error("Tap a star to rate"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
        source: "in_app",
      });
      if (error) throw error;
      localStorage.setItem(DONE_KEY(user.id), "1");
      toast.success("Thanks! Your feedback helps us improve 💛");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not save feedback");
    } finally { setBusy(false); }
  };

  const shown = hover || rating;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismissLater(); else setOpen(v); }}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="mx-auto mb-1 h-11 w-11 rounded-full bg-amber-100 text-amber-600 grid place-items-center">
            <Heart className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <DialogTitle className="text-center">How's OverraPrep AI for you?</DialogTitle>
          <DialogDescription className="text-center">
            Genuine feedback makes us better. Rate the app and drop a comment — 30 seconds, promise.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex justify-center gap-2 mb-4">
            {[1,2,3,4,5].map((s) => (
              <button key={s} type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110 focus:outline-none">
                <Star className={cn("h-10 w-10 transition-colors",
                  s <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mb-4 h-5">
            {shown === 0 && "Tap a star"}
            {shown === 1 && "Not great — tell us why"}
            {shown === 2 && "Could be better"}
            {shown === 3 && "It's okay"}
            {shown === 4 && "Pretty good!"}
            {shown === 5 && "Love it! ⭐"}
          </p>
          <Textarea
            placeholder="What can we improve? What do you love? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={800}
          />
          <p className="text-[11px] text-muted-foreground text-right mt-1">{comment.length}/800</p>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={dismissLater} disabled={busy}>Remind me later</Button>
          <Button onClick={submit} disabled={busy || rating === 0}
            className="bg-amber-500 hover:bg-amber-600 text-white">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
