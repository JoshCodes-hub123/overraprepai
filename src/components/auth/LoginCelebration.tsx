import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { celebrateGold } from "@/lib/celebrate";

/**
 * Fires a one-shot welcome celebration immediately after a fresh sign-in.
 * Reads the `overra_fresh_login` flag set in AuthProvider.signIn so it
 * never replays on tab refreshes.
 */
export const LoginCelebration = () => {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState<string>("there");

  useEffect(() => {
    if (!user) return;
    try {
      const fresh = sessionStorage.getItem("overra_fresh_login") === "1";
      if (!fresh) return;
      sessionStorage.removeItem("overra_fresh_login");
    } catch { return; }

    const name = (profile?.full_name || "there").split(" ")[0];
    setFirstName(name);
    setOpen(true);

    // Respect prefers-reduced-motion for confetti
    const reduced = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      try { celebrateGold("rich"); } catch { /* noop */ }
    }

    // Flash and go — dashboard should be usable immediately.
    const t = setTimeout(() => setOpen(false), 1100);
    const dismiss = () => setOpen(false);
    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("scroll", dismiss, { once: true, passive: true });
    window.addEventListener("keydown", dismiss, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, [user, profile]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="login-celeb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <motion.div
            initial={{ scale: 0.85, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="rounded-3xl border border-amber-200 bg-white/95 backdrop-blur px-8 py-6 shadow-[0_22px_60px_-20px_rgba(180,140,40,0.55)] text-center"
          >
            <div className="text-4xl mb-2">🔥</div>
            <p className="font-display text-lg font-extrabold text-neutral-900">
              Welcome back, {firstName}!
            </p>
            <p className="text-xs text-amber-700 font-semibold mt-1 tracking-wide">
              Let’s make today legendary.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginCelebration;