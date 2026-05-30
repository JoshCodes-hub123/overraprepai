import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Flame, Camera, Loader2, LogOut, GraduationCap, Coins } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucketWithVerification } from "@/lib/storageUpload";
import { toast } from "@/hooks/use-toast";
import { LevelSwitcherDialog } from "@/components/student/LevelSwitcherDialog";
import { useStudentLevel } from "@/hooks/useStudentLevel";
import { celebrateOncePerDay } from "@/lib/celebrate";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { usePremium } from "@/hooks/usePremium";
import { useMyActivityBadge } from "@/hooks/useMyActivityBadge";

/**
 * Mobile-first greeting header that mirrors the product mockup:
 *   [avatar (gold ring)]  Good morning,                  [bell + badge]
 *                         Welcome back, {name} 👋
 *                         Let's make today productive.
 *
 *   [🔥 On a N-day study streak! 🔥]
 *
 * Renders only on small screens (sm:hidden). Desktop continues to use the
 * existing sticky brand header.
 */
export const MobileGreetingHeader = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { level } = useStudentLevel();
  const { balance } = useTokenBalance();
  const { freeLeft, dailyLimit } = usePremium();
  const { data: myRank } = useMyActivityBadge();
  const [streak, setStreak] = useState<number>(0);
  const [unread, setUnread] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(() => {
    try {
      return localStorage.getItem("overra.avatar.last");
    } catch {
      return null;
    }
  });
  const [levelOpen, setLevelOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    try {
      const cached = localStorage.getItem(`overra.avatar.${user.id}`);
      if (cached) setLocalAvatar(cached);
    } catch { /* noop */ }
  }, [user?.id]);

  useEffect(() => {
    const url = profile?.avatar_url || (profile as any)?.profile_image_url;
    if (!url || !user) return;
    try {
      localStorage.setItem(`overra.avatar.${user.id}`, url);
      localStorage.setItem("overra.avatar.last", url);
    } catch { /* noop */ }
  }, [profile?.avatar_url, user?.id]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const sRes: any = await (supabase as any)
        .from("study_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      const nRes: any = await (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (cancelled) return;
      const s = sRes?.data?.current_streak ?? 0;
      setStreak(s);
      // Subtle gold burst on milestone days, once per local day per milestone.
      if ([3, 7, 14, 30, 60, 100].includes(s)) {
        celebrateOncePerDay(`streak-${s}`, s >= 30 ? "rich" : "soft");
      }
      setUnread(nRes?.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning,";
    if (h < 17) return "Good afternoon,";
    return "Good evening,";
  })();

  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const avatarSrc = localAvatar || profile?.avatar_url || undefined;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Image only", description: "Please pick an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Too large", description: "Keep it under 2MB.", variant: "destructive" });
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalAvatar(preview);
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/avatar.${ext}`;
      const { publicUrl } = await uploadToBucketWithVerification({ bucket: "tutor-profiles", path, file });
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl, profile_image_url: publicUrl } as any)
        .eq("id", user.id);
      setLocalAvatar(publicUrl);
      try {
        localStorage.setItem(`overra.avatar.${user.id}`, publicUrl);
        localStorage.setItem("overra.avatar.last", publicUrl);
      } catch { /* noop */ }
      await refreshProfile();
      toast({ title: "Profile picture updated" });
    } catch (err: any) {
      console.error(err);
      setLocalAvatar(null);
      toast({ title: "Upload failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      URL.revokeObjectURL(preview);
      setUploading(false);
    }
  };

  const dayName = new Date().toLocaleDateString(undefined, { weekday: "long" });

  const handleLogout = async () => {
    if (!confirm("Sign out of OverraPrep?")) return;
    await signOut();
    navigate("/auth");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sm:hidden mb-4"
      aria-label="Welcome"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
            className="relative rounded-full p-[2px] bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 shadow-[0_4px_12px_-4px_rgba(180,140,40,0.45)] active:scale-95 transition"
          >
            <Avatar className="h-12 w-12 ring-2 ring-white">
              <AvatarImage src={avatarSrc} alt={profile?.full_name || ""} />
              <AvatarFallback className="bg-gradient-to-br from-amber-100 to-amber-200 text-amber-800 font-bold">
                {firstName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-amber-500 ring-2 ring-white flex items-center justify-center shadow-md">
              {uploading ? (
                <Loader2 className="h-3 w-3 text-white animate-spin" />
              ) : (
                <Camera className="h-3 w-3 text-white" strokeWidth={2.5} />
              )}
            </span>
            <AnimatePresence>
              {uploading && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center"
                />
              )}
            </AnimatePresence>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-muted-foreground leading-tight">{greeting}</p>
          <h1 className="font-display text-[20px] font-extrabold tracking-tight text-foreground leading-tight truncate">
            Welcome back, {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5 truncate">
            Let's make today productive.
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            aria-label={`Updates${unread ? `, ${unread} unread` : ""}`}
            className="relative h-10 w-10 rounded-full bg-white border border-amber-100 shadow-sm flex items-center justify-center hover:bg-amber-50 active:scale-95 transition"
          >
            <Bell className="h-4 w-4 text-amber-700" strokeWidth={2} />
            {unread > 0 && (
              <span
                aria-hidden
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="h-10 w-10 rounded-full bg-white border border-amber-100 shadow-sm flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 active:scale-95 transition"
          >
            <LogOut className="h-4 w-4 text-rose-600" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Streak + Level pills */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => navigate("/challenges")}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-50 to-amber-100/60 text-amber-800 text-[12px] font-semibold shadow-[0_2px_8px_-4px_rgba(180,140,40,0.35)] hover:from-amber-100 hover:to-amber-200/70 active:scale-95 transition"
        >
          <Flame className="h-3.5 w-3.5 text-amber-600" />
          {streak > 0
            ? <>On a <span className="font-extrabold">{streak}-day</span> streak!</>
            : <>Start your streak today!</>}
        </button>
        <button
          type="button"
          onClick={() => setLevelOpen(true)}
          className="inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border border-amber-200 bg-white text-amber-800 text-[12px] font-semibold shadow-sm hover:bg-amber-50 active:scale-95 transition"
        >
          <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
          {level ? `${level} Level` : "Set level"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/wallet")}
          aria-label={`Tokens: ${balance} · ${freeLeft} of ${dailyLimit} free actions left today`}
          className={`inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border text-[12px] font-semibold shadow-sm active:scale-95 transition ${
            freeLeft === 0 && balance < 3
              ? "border-amber-400 bg-amber-100 text-amber-900 animate-pulse"
              : "border-amber-300/70 bg-white text-amber-800 hover:bg-amber-50"
          }`}
        >
          <Coins className="h-3.5 w-3.5 text-amber-600" />
          <span className="font-extrabold">{balance.toLocaleString()}</span>
          <span className="opacity-70">·</span>
          <span className="font-bold">{freeLeft}/{dailyLimit} free</span>
        </button>
        {myRank && myRank.rank > 0 && (() => {
          const { Icon, label, className } = myRank.badge;
          return (
            <button
              type="button"
              onClick={() => navigate("/leaderboard")}
              aria-label={`Rank ${myRank.rank} of ${myRank.total} · ${label}`}
              className={`inline-flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full border text-[12px] font-semibold shadow-sm active:scale-95 transition ${className}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="font-extrabold">#{myRank.rank}</span>
              <span className="opacity-80">· {label}</span>
            </button>
          );
        })()}
        <span className="ml-auto text-[11px] text-muted-foreground hidden">Happy {dayName}</span>
      </div>
      <LevelSwitcherDialog open={levelOpen} onOpenChange={setLevelOpen} />
    </motion.header>
  );
};

export default MobileGreetingHeader;
