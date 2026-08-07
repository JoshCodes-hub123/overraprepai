import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Loader2, Search, Plus, Building2, Send, X } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Uni = {
  code: string;
  name: string;
  short_name: string | null;
  city: string | null;
  state: string | null;
  type: "federal" | "state" | "private";
};

export default function ChooseUniversity() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [universities, setUniversities] = useState<Uni[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("universities")
        .select("code, name, short_name, city, state, type")
        .eq("is_active", true)
        .order("type", { ascending: true })
        .order("name", { ascending: true });
      if (error) {
        toast.error("Couldn't load universities. Please retry.");
      } else {
        setUniversities((data as Uni[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q) ||
      (u.short_name?.toLowerCase().includes(q) ?? false) ||
      (u.city?.toLowerCase().includes(q) ?? false) ||
      (u.state?.toLowerCase().includes(q) ?? false),
    );
  }, [query, universities]);

  const choose = async (u: Uni) => {
    if (!user) return;
    setSavingCode(u.code);
    const { error } = await supabase
      .from("profiles")
      .update({
        environment_type: "university",
        academic_path: "university",
        university: u.code,
        faculty: null,
        department: null,
        is_pending_verification: false,
      } as any)
      .eq("id", user.id);
    if (error) { setSavingCode(null); toast.error(error.message); return; }
    // Defensive: ensure a student role row exists (older accounts may have
    // signed up before the handle_new_user trigger, leaving RLS-gated reads
    // silently failing). Idempotent — onConflict ignores duplicates.
    await (supabase as any)
      .from("user_roles")
      .upsert({ user_id: user.id, role: "student" }, { onConflict: "user_id,role", ignoreDuplicates: true });
    setSavingCode(null);
    try { sessionStorage.removeItem("pending_environment"); } catch { /* noop */ }
    await refreshProfile();
    navigate("/onboarding/faculty");
  };

  return (
    <>
      <SEO title="Choose your university" description="Pick your university so OverraPrep can scope courses, tutors and study material to you." noindex />
      <main className="min-h-screen bg-background pb-32 px-4 pt-8">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Step 1 of 4</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Which university are you at?</h1>
            <p className="text-sm text-muted-foreground mt-2">Every Nigerian university is here. We tailor courses, tutors and material to your campus.</p>
          </motion.div>

          <div className="relative mb-4 sticky top-2 z-10">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, city or state…"
              className="pl-9 h-11 rounded-xl bg-white shadow-sm"
            />
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
              Loading every Nigerian university…
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {filtered.map((u, i) => (
                  <motion.button
                    key={u.code}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.4) }}
                    onClick={() => choose(u)}
                    disabled={!!savingCode}
                    className={cn(
                      "group relative text-left rounded-xl border bg-white p-4 transition-all",
                      "hover:border-amber-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400",
                      savingCode && savingCode !== u.code && "opacity-50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-amber-600" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold tracking-tight truncate">{u.short_name || u.code}</span>
                          {savingCode === u.code && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                          <span className={cn(
                            "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ml-auto",
                            u.type === "federal" && "bg-amber-100 text-amber-800",
                            u.type === "state" && "bg-emerald-100 text-emerald-800",
                            u.type === "private" && "bg-violet-100 text-violet-800",
                          )}>{u.type}</span>
                        </div>
                        <p className="text-xs font-medium text-foreground mt-0.5 line-clamp-1">{u.name}</p>
                        {u.city && <p className="text-[10px] text-muted-foreground mt-0.5">{u.city}{u.state ? `, ${u.state}` : ""}</p>}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* "School not listed" request CTA */}
              <button
                onClick={() => setRequestOpen(true)}
                className="mt-6 w-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50 p-4 flex items-center gap-3 text-left transition-colors"
              >
                <span className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 text-amber-700" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">My school isn't listed</p>
                  <p className="text-xs text-muted-foreground">Tell us about it — we'll add it within 24 hours. You can keep using the app in the meantime.</p>
                </div>
              </button>
            </>
          )}
        </div>
      </main>

      <RequestUniversitySheet
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSubmitted={async () => {
          setRequestOpen(false);
          await refreshProfile();
          navigate("/onboarding/faculty");
        }}
      />
    </>
  );
}

function RequestUniversitySheet({
  open, onClose, onSubmitted,
}: { open: boolean; onClose: () => void; onSubmitted: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) return;
    const trimmed = name.trim();
    if (trimmed.length < 4) { toast.error("Please enter your school's full name"); return; }
    setBusy(true);
    try {
      // Save the request
      const { error: reqErr } = await (supabase as any).from("university_requests").insert({
        requested_by: user.id,
        name: trimmed,
        city: city.trim() || null,
        website: website.trim() || null,
      });
      if (reqErr) throw reqErr;

      // Mark profile as pending verification so the user can still use the app.
      // We stash the requested school name on profiles.university so downstream
      // screens (dashboard, faculty picker) have a label to show.
      await supabase.from("profiles").update({
        university: trimmed.slice(0, 64),
        is_pending_verification: true,
      } as any).eq("id", user.id);

      toast.success("Got it! We'll add your school within 24h.", {
        description: "You can keep onboarding and using the app right now.",
      });
      onSubmitted();
    } catch (e: any) {
      toast.error(e?.message || "Couldn't send your request. Please retry.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-amber-100 overflow-hidden"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
            <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 h-9 w-9 rounded-full bg-white/80 border border-amber-100 hover:bg-amber-50 flex items-center justify-center">
              <X className="h-4 w-4 text-amber-700" />
            </button>
            <div className="px-6 pt-7 pb-6">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-amber-700" />
              </div>
              <h2 className="mt-4 font-display text-xl font-extrabold text-center">Tell us about your school</h2>
              <p className="mt-1 text-sm text-muted-foreground text-center">We'll add it to OverraPrep, usually within 24 hours.</p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">University name <span className="text-amber-600">*</span></label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Federal University Lokoja" className="mt-1 h-11" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">City</label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lokoja" className="mt-1 h-11" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Website (optional)</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="mt-1 h-11" />
                </div>
              </div>

              <Button
                onClick={submit}
                disabled={busy}
                className="mt-5 w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Send className="w-4 h-4 mr-2" /> Send request & continue</>)}
              </Button>
              <p className="text-[11px] text-center text-muted-foreground mt-2">
                You'll get full app access right away while we verify.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
