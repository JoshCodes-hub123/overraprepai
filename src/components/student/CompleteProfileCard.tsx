import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { UserCog, ArrowRight, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getProfileCompleteness } from "@/lib/profileCompleteness";

interface CompleteProfileCardProps {
  profile: any;
  onDismiss?: () => void;
}

export const CompleteProfileCard = ({ profile, onDismiss }: CompleteProfileCardProps) => {
  const navigate = useNavigate();

  const { missing, percent } = useMemo(() => getProfileCompleteness(profile), [profile]);
  // Persistent dismissal: once a user dismisses (or finishes), it never nags again.
  const dismissKey = profile?.id ? `complete-profile-dismissed:${profile.id}` : null;
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || !dismissKey) return false;
    return localStorage.getItem(dismissKey) === "1";
  });

  // Auto-mark as permanently dismissed once the profile is complete so we don't re-show
  // even if the user later clears a field.
  useEffect(() => {
    if (dismissKey && missing.length === 0) {
      localStorage.setItem(dismissKey, "1");
    }
  }, [dismissKey, missing.length]);

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, "1");
    setDismissed(true);
    onDismiss?.();
  };

  if (missing.length === 0 || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[28px] border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-6 md:p-7 shadow-[0_10px_30px_-18px_rgba(180,140,40,0.3)] mb-6"
    >
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />
      <button
        onClick={handleDismiss}
        aria-label="Dismiss reminder"
        title="Don't show this again"
        className="absolute top-4 right-4 p-1 rounded-full text-neutral-300 hover:text-neutral-600 hover:bg-white/60 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="relative flex items-start gap-4 pr-6">
        <div className="shrink-0 h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200/60">
          <UserCog className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-[17px] md:text-[19px] font-bold tracking-tight text-neutral-900 leading-tight">
            Complete your profile
          </h3>
          <p className="text-[12.5px] text-neutral-500 mt-1 leading-relaxed">
            Unlock tutor matching, leaderboards &amp; personalized recommendations.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-neutral-400">
                Progress
              </span>
              <span className="text-[11px] font-bold text-amber-700 tabular-nums">{percent}%</span>
            </div>
            <Progress value={percent} className="h-1.5" />
          </div>

          <ul className="mt-4 flex flex-wrap gap-1.5">
            {missing.slice(0, 5).map((f) => (
              <li
                key={f.key}
                className="text-[10.5px] px-2.5 py-1 rounded-full bg-white border border-amber-100 text-neutral-600 font-medium"
              >
                {f.label}
              </li>
            ))}
            {missing.length > 5 && (
              <li className="text-[10.5px] px-2.5 py-1 rounded-full bg-amber-100/60 border border-amber-200/70 text-amber-800 font-bold">
                +{missing.length - 5} more
              </li>
            )}
          </ul>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              onClick={() => navigate("/profile/edit")}
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200/50 hover:shadow-amber-300/60 rounded-xl font-bold transition-all"
            >
              Complete now
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <span className="text-[11px] text-neutral-500 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Takes ~2 minutes
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CompleteProfileCard;
