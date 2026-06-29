import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Coins, Lock, Sparkles, Gift, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAIPricing } from "@/hooks/useAIPricing";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useQuizUnlock } from "@/hooks/useQuizUnlock";
import { usePremium } from "@/hooks/usePremium";
import { useEffect, useState } from "react";

/** Time until next 00:00 Africa/Lagos (UTC+1, no DST). */
function useTimeUntilLagosMidnight() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // Convert "now" to Lagos wall-clock by shifting UTC by +1h.
      const lagos = new Date(now.getTime() + 60 * 60 * 1000);
      const h = lagos.getUTCHours();
      const m = lagos.getUTCMinutes();
      const s = lagos.getUTCSeconds();
      const secsLeft = (23 - h) * 3600 + (59 - m) * 60 + (60 - s);
      const hh = Math.floor(secsLeft / 3600);
      const mm = Math.floor((secsLeft % 3600) / 60);
      const ss = secsLeft % 60;
      setLabel(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return label;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quizId: string;
  quizTitle?: string;
  onUnlocked?: () => void;
}

/**
 * Soft paywall for unlocking a tutor quiz. After unlock, the student
 * can replay the quiz forever for free.
 */
export function UnlockQuizSheet({ open, onOpenChange, quizId, quizTitle, onUnlocked }: Props) {
  const navigate = useNavigate();
  const { priceFor } = useAIPricing();
  const { balance } = useTokenBalance();
  const { freeLeft, dailyLimit } = usePremium();
  const { unlock } = useQuizUnlock(quizId);
  const [busy, setBusy] = useState(false);
  const resetIn = useTimeUntilLagosMidnight();

  const cost = priceFor("unlock_quiz");
  const hasFree = freeLeft > 0;
  const enough = hasFree || balance >= cost;

  const handleUnlock = async () => {
    setBusy(true);
    const res = await unlock();
    setBusy(false);
    if (res.ok) {
      onUnlocked?.();
      onOpenChange(false);
    } else if (res.reason === "insufficient") {
      onOpenChange(false);
      navigate("/wallet");
    }
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-t-4 border-amber-400 bg-white">
        <SheetHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 grid place-items-center">
            <Lock className="h-7 w-7 text-amber-700" />
          </div>
          <SheetTitle className="text-xl font-extrabold">Unlock this quiz</SheetTitle>
          <SheetDescription className="text-sm">
            {quizTitle ? <span className="font-semibold">{quizTitle}</span> : "This quiz"} · pay once, replay forever.
          </SheetDescription>
        </SheetHeader>

        {/* Live free-actions counter + reset timer — updates instantly */}
        <div className="mt-3 mx-auto flex flex-wrap items-center justify-center gap-2 w-fit">
          <div className="flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700">
            <Gift className={`h-3.5 w-3.5 ${hasFree ? "text-emerald-600" : "text-zinc-400"}`} />
            <span>
              Free actions: <span className={hasFree ? "text-emerald-700" : "text-zinc-500"}>{freeLeft}/{dailyLimit}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700" title="Free actions reset at midnight Lagos time">
            <Clock className="h-3.5 w-3.5" />
            <span>Resets in {resetIn}</span>
          </div>
        </div>

        <div className="mt-4 mx-auto max-w-sm">
          {hasFree ? (
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-semibold">Free unlock today</span>
              </div>
              <span className="font-extrabold text-sm text-emerald-700">{freeLeft}/{dailyLimit} left</span>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-semibold">Cost</span>
              </div>
              <span className="font-extrabold text-lg text-amber-700">{cost} tokens</span>
            </div>
          )}
          <div className="mt-2 text-center text-xs text-zinc-500">
            {hasFree
              ? <>Uses 1 of your {dailyLimit} daily free actions · wallet: <span className="font-bold">{balance} tokens</span></>
              : <>Free actions used up today · wallet: <span className="font-bold">{balance} tokens</span></>}
          </div>

          {enough ? (
            <Button onClick={handleUnlock} disabled={busy} className="mt-5 w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold">
              <Sparkles className="h-4 w-4 mr-2" />
              {busy ? "Unlocking…" : hasFree ? "Unlock free" : `Unlock for ${cost} tokens`}
            </Button>
          ) : (
            <Button onClick={() => { onOpenChange(false); navigate("/wallet"); }} className="mt-5 w-full h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Top up to unlock
            </Button>
          )}
          <p className="mt-3 text-center text-[11px] text-zinc-400">One-time unlock · saved to your account</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default UnlockQuizSheet;
