import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const KEY = "install-nudge-dismissed-at";
const HIDE_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // @ts-ignore
  if (window.navigator.standalone) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

/**
 * Slim gold banner that nudges non-installed users to install the app.
 * Auto-hides for 7 days after dismissal. Never shown on /install, /auth,
 * or when the app is already running standalone.
 */
export default function InstallNudge() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (pathname.startsWith("/install") || pathname.startsWith("/auth") || pathname === "/splash") return;
    try {
      const last = localStorage.getItem(KEY);
      if (last) {
        const age = Date.now() - Number(last);
        if (age < HIDE_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {/* ignore */}
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [pathname]);

  const dismiss = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed top-0 inset-x-0 z-[60] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-amber-950 shadow-md"
        >
          <div className="max-w-5xl mx-auto px-3 py-2 flex items-center gap-3 text-xs sm:text-sm">
            <Download className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium truncate">
              <span className="hidden sm:inline">Install OverraPrep for offline access, push notifications and faster opens.</span>
              <span className="sm:hidden">Install OverraPrep — faster & offline.</span>
            </span>
            <Link
              to="/install"
              onClick={dismiss}
              className="rounded-full bg-amber-950 text-amber-50 px-3 py-1 font-semibold hover:bg-amber-900 transition-colors"
            >
              Get the app
            </Link>
            <button
              aria-label="Dismiss"
              onClick={dismiss}
              className="p-1 rounded-full hover:bg-amber-600/30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
