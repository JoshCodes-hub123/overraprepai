import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "ready" | "already" | "invalid" | "done" | "error">("loading");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${SUPA_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: ANON },
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.ok && d?.valid) { setEmail(d.email ?? null); setState("ready"); }
        else if (d?.status === "already_unsubscribed") setState("already");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${SUPA_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON },
        body: JSON.stringify({ token }),
      });
      setState(r.ok ? "done" : "error");
    } catch { setState("error"); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">Email preferences</h1>
        {state === "loading" && <div className="flex justify-center py-6"><Loader2 className="animate-spin" /></div>}
        {state === "ready" && (
          <>
            <p className="text-muted-foreground">{email ? `Unsubscribe ${email}` : "Unsubscribe this email"} from OverraPrep AI app emails?</p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Confirm unsubscribe
            </Button>
            <Link to="/" className="block text-sm text-muted-foreground underline">Cancel</Link>
          </>
        )}
        {state === "done" && (
          <div className="space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <p>You've been unsubscribed. You can still receive essential account emails.</p>
            <Link to="/" className="text-sm underline">Back to home</Link>
          </div>
        )}
        {state === "already" && <p className="text-muted-foreground">This email is already unsubscribed.</p>}
        {state === "invalid" && (
          <div className="space-y-3"><XCircle className="mx-auto h-10 w-10 text-destructive" /><p>This link is invalid or expired.</p></div>
        )}
        {state === "error" && <p className="text-destructive">Something went wrong. Please try again.</p>}
      </Card>
    </main>
  );
}
