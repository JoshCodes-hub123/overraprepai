import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardCheck,
  FileText,
  Wallet,
  Megaphone,
  Calendar,
  GraduationCap,
  Bell,
  Sparkles,
  ArrowRight,
  LogOut,
  Heart,
  TrendingUp,
  School as SchoolIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { RoleSidebarMenu } from "@/components/layout/RoleSidebarMenu";

interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: string;
  created_at: string;
  school?: { name: string | null } | null;
}

const QUICK_ACTIONS = [
  { icon: ClipboardCheck, label: "Attendance", to: "/school/attendance", tint: "from-emerald-400/20 to-emerald-600/10 text-emerald-700" },
  { icon: FileText, label: "Results", to: "/school/results", tint: "from-blue-400/20 to-blue-600/10 text-blue-700" },
  { icon: Wallet, label: "Fees", to: "/school/fees", tint: "from-rose-400/20 to-rose-600/10 text-rose-700" },
  { icon: Calendar, label: "Timetable", to: "/school/timetable", tint: "from-purple-400/20 to-purple-600/10 text-purple-700" },
];

const formatRelative = (iso: string) => {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const [news, setNews] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("school_announcements")
        .select("id,title,body,audience,created_at,school:schools(name)")
        .in("audience", ["all", "parents"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (active) {
        setNews((data as any) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const firstName = useMemo(() => {
    const n = profile?.full_name?.split(" ")[0];
    return n || "there";
  }, [profile]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      <SEO title="Parent Dashboard" description="School news, results, attendance and fees — all in one place." noindex url="/parent/dashboard" />
      <div
        className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-20 w-[22rem] h-[22rem] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -top-10 -left-16 w-[18rem] h-[18rem] rounded-full bg-amber-300/20 blur-3xl" />
          </div>

          <div className="relative max-w-2xl mx-auto px-5 pt-5 pb-6">
            {/* Top row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <RoleSidebarMenu role="parent" />
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/70 backdrop-blur-xl border border-primary/20">
                  <Heart className="w-3.5 h-3.5 text-primary fill-primary/30" />
                  <span className="text-[11px] font-bold tracking-wide text-foreground">Parent Hub</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/notifications")}
                  className="p-2 rounded-full bg-white/60 backdrop-blur-md border border-border/50 hover:bg-white transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-foreground" />
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full bg-white/60 backdrop-blur-md border border-border/50 hover:bg-white transition"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Greeting */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-1">
                {greeting}
              </p>
              <h1 className="font-display text-[26px] sm:text-[30px] font-bold leading-tight tracking-tight">
                Hi <span className="bg-gradient-to-r from-primary to-amber-600 bg-clip-text text-transparent">{firstName}</span> 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Here's what's happening at your child's school.
              </p>
            </motion.div>

            {/* Highlight card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mt-5 relative rounded-3xl p-5 bg-gradient-to-br from-primary via-amber-500 to-amber-600 text-primary-foreground shadow-xl shadow-primary/30 overflow-hidden"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">Today</p>
                  <p className="font-bold text-base leading-tight">Stay in the loop, every day</p>
                  <p className="text-[12px] opacity-90 mt-0.5">
                    School notices, results and fees — all in one place.
                  </p>
                </div>
                <Sparkles className="w-5 h-5 opacity-80 shrink-0" />
              </div>
            </motion.div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 space-y-7">
          {/* Quick actions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-[15px] font-bold">Quick actions</h2>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_ACTIONS.map((a, i) => (
                <motion.button
                  key={a.to}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.35 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(a.to)}
                  className="group flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center", a.tint)}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{a.label}</span>
                </motion.button>
              ))}
            </div>
          </section>

          {/* School News feed */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary" />
                <h2 className="font-display text-[15px] font-bold">School news</h2>
              </div>
              <button
                onClick={() => navigate("/school/announcements")}
                className="text-[11px] font-semibold text-primary hover:text-amber-700 flex items-center gap-0.5"
              >
                See all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-2xl bg-muted/40 animate-pulse" />
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-primary/30 bg-card/50 p-7 text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Megaphone className="w-5 h-5 text-primary" />
                </div>
                <p className="font-semibold text-sm">No news yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When the school posts an announcement, you'll see it here first.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {news.map((n, i) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i, duration: 0.35 }}
                  >
                    <button
                      onClick={() => navigate("/school/announcements")}
                      className="group w-full text-left p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:shadow-md active:scale-[0.99] transition-all flex gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-amber-300/15 border border-primary/20 flex items-center justify-center shrink-0">
                        <SchoolIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            {n.school?.name || "School"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">·</span>
                          <span className="text-[10px] text-muted-foreground">{formatRelative(n.created_at)}</span>
                        </div>
                        <p className="font-semibold text-[13.5px] text-foreground leading-tight truncate">
                          {n.title}
                        </p>
                        <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </section>

          {/* More */}
          <section>
            <h2 className="font-display text-[15px] font-bold mb-3">More for you</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/school/results")}
                className="group p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-700/5 border border-blue-500/20 hover:shadow-md transition text-left"
              >
                <GraduationCap className="w-5 h-5 text-blue-700 mb-2" />
                <p className="font-bold text-[13px] leading-tight">Latest results</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">CA, exam scores & grades</p>
              </button>
              <button
                onClick={() => navigate("/school/fees")}
                className="group p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-rose-700/5 border border-rose-500/20 hover:shadow-md transition text-left"
              >
                <Wallet className="w-5 h-5 text-rose-700 mb-2" />
                <p className="font-bold text-[13px] leading-tight">Fees status</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">View & pay outstanding</p>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
