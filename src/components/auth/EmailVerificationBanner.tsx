import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Mail, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global banner that warns signed-in users when their email address is not
 * yet verified. Onboarding & most app features depend on a confirmed email,
 * so we surface this prominently with a one-click "Resend" action.
 */
export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const location = useLocation();
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;
  if ((user as any).email_confirmed_at || (user as any).confirmed_at) return null;
  // Don't double-up on the /auth screen — that page has its own messaging.
  if (location.pathname.startsWith("/auth")) return null;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth?reason=verified` },
    });
    setSending(false);
    if (error) toast.error(error.message || "Could not resend email");
    else toast.success(`Verification email sent to ${user.email}`);
  };

  return (
    <div
      role="status"
      className="w-full bg-amber-50 border-b border-amber-300 text-amber-900 px-3 py-2 text-xs sm:text-sm flex flex-wrap items-center gap-2 justify-center"
    >
      <Mail className="w-4 h-4 shrink-0" />
      <span>
        Your email <strong className="font-semibold">{user.email}</strong> isn't verified yet.
        Onboarding stays locked until you confirm.
      </span>
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="font-semibold underline underline-offset-2 disabled:opacity-50 inline-flex items-center gap-1"
      >
        {sending && <Loader2 className="w-3 h-3 animate-spin" />}
        Resend verification email
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="ml-1 text-amber-700 hover:text-amber-900"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}