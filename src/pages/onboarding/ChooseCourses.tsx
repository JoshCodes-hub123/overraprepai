import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, Loader2, Lock, Search, Sparkles, X } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_COURSES = 12;

type CourseRow = {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  university: string | null;
};

/**
 * Final onboarding step: pick this semester's courses (max 12).
 * Saves to profiles.academic_metadata.selected_courses so no migration is required.
 * Robust to network failures (retry CTA) and empty result sets (manual code entry).
 */
export default function ChooseCourses() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const university = (profile as any)?.university as string | undefined;
  const department = (profile as any)?.department as string | undefined;
  const level = (profile as any)?.level as string | undefined;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("__mine__");
  const [selected, setSelected] = useState<Record<string, CourseRow>>({});
  const [saving, setSaving] = useState(false);

  // Hydrate previously chosen courses if the student is editing.
  useEffect(() => {
    const meta = (profile as any)?.academic_metadata;
    const prev: CourseRow[] = Array.isArray(meta?.selected_courses) ? meta.selected_courses : [];
    if (prev.length) {
      const map: Record<string, CourseRow> = {};
      prev.forEach((c) => { if (c?.id) map[c.id] = c; });
      setSelected(map);
    }
  }, [profile]);

  // Hard-guard the flow so a refreshed user never lands here without context.
  useEffect(() => {
    if (!profile) return;
    if (!university) { navigate("/onboarding/university", { replace: true }); return; }
    if (!(profile as any)?.faculty) { navigate("/onboarding/faculty", { replace: true }); return; }
    if (!department) { navigate("/onboarding/department", { replace: true }); return; }
    if (!level) { navigate("/onboarding/level", { replace: true }); return; }
  }, [profile, university, department, level, navigate]);

  const loadCourses = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let q = supabase
        .from("courses")
        .select("id, code, name, department, level, university")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(400);
      if (university) q = q.eq("university", university);
      if (level) q = q.eq("level", level);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data as CourseRow[]) ?? []);
    } catch (e: any) {
      setLoadError(e?.message ?? "We couldn't load your courses. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (university && level) void loadCourses(); }, [university, level]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.department && set.add(r.department));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (deptFilter === "__mine__" && department && r.department !== department) return false;
      if (deptFilter !== "__mine__" && deptFilter !== "__all__" && r.department !== deptFilter) return false;
      if (!q) return true;
      return (
        r.code?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        (r.department?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, query, deptFilter, department]);

  const selectedCount = Object.keys(selected).length;
  const atLimit = selectedCount >= MAX_COURSES;

  const toggle = (course: CourseRow) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[course.id]) { delete next[course.id]; return next; }
      if (Object.keys(next).length >= MAX_COURSES) {
        toast.message(`You can pick up to ${MAX_COURSES} courses`, {
          description: "Remove one to add another. You can always update this later.",
        });
        return prev;
      }
      next[course.id] = course;
      return next;
    });
  };

  const finish = async () => {
    if (!user) return;
    if (selectedCount === 0) {
      toast.error("Pick at least one course to continue.");
      return;
    }
    setSaving(true);
    try {
      const existingMeta = ((profile as any)?.academic_metadata as Record<string, any>) ?? {};
      const payload = Object.values(selected).map((c) => ({
        id: c.id, code: c.code, name: c.name, department: c.department, level: c.level,
      }));
      const { error } = await supabase
        .from("profiles")
        .update({
          academic_metadata: { ...existingMeta, selected_courses: payload, selected_courses_at: new Date().toISOString() },
          onboarding_completed: true,
        })
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("You're all set", { description: "We've personalised your dashboard around these courses." });
      navigate("/onboarding/match");
    } catch (e: any) {
      toast.error("Couldn't save your courses", { description: e?.message ?? "Please retry." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SEO title="Choose your courses" description="Pick the courses you're taking this semester so OverraPrep can tailor everything to you." noindex />
      <main className="min-h-screen bg-background pb-40">
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-amber-700 mb-2 font-semibold">Final step</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold">What are you taking this semester?</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Pick up to {MAX_COURSES} courses. We'll line up past questions, AI tutors and study packs around them.
            </p>
          </motion.div>

          {/* Counter pill */}
          <div className="sticky top-2 z-20 mb-4 flex justify-center">
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full border bg-white/95 backdrop-blur px-4 py-2 shadow-sm transition-colors",
              atLimit ? "border-amber-500 text-amber-700" : "border-amber-200 text-foreground",
            )}>
              {atLimit ? <Lock className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-amber-500" />}
              <span className="text-sm font-semibold">{selectedCount} / {MAX_COURSES} selected</span>
              {atLimit && <span className="text-xs text-amber-700/80">— remove one to swap</span>}
            </div>
          </div>

          {/* Chips of selected */}
          <AnimatePresence>
            {selectedCount > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {Object.values(selected).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggle(c)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold pl-2.5 pr-1.5 py-1 hover:bg-amber-100 transition-colors"
                    >
                      {c.code}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search + dept filter */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by code or course title (e.g. MTH 101)"
                className="pl-9 h-11 rounded-xl"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-11 rounded-xl border bg-white px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="__mine__">My department</option>
              <option value="__all__">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Results */}
          {loading ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500 mx-auto mb-2" />
              Loading courses for {level} level…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-8 text-center">
              <p className="text-sm font-semibold text-amber-900 mb-1">We couldn't load courses</p>
              <p className="text-xs text-amber-900/70 mb-4">{loadError}</p>
              <Button variant="outline" onClick={loadCourses}>Try again</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-8 text-center">
              <p className="text-sm font-semibold mb-1">No courses match that filter</p>
              <p className="text-xs text-muted-foreground">
                Try switching to <button onClick={() => setDeptFilter("__all__")} className="underline">all departments</button> or clearing your search.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2.5">
              {filtered.map((c, i) => {
                const isSelected = !!selected[c.id];
                const disabled = !isSelected && atLimit;
                return (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(0.02 * i, 0.4) }}
                    onClick={() => !disabled && toggle(c)}
                    disabled={disabled}
                    className={cn(
                      "group relative text-left rounded-xl border bg-white p-4 transition-all",
                      isSelected
                        ? "border-amber-500 bg-amber-50/60 shadow-sm"
                        : disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:border-amber-400 hover:shadow-sm",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center border transition-colors",
                        isSelected ? "bg-amber-500 border-amber-500 text-white" : "bg-amber-50 border-amber-200/70 text-amber-600",
                      )}>
                        {isSelected ? <Check className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm tracking-tight">{c.code}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.name}</p>
                        {c.department && (
                          <p className="text-[10px] uppercase tracking-wider text-amber-700/70 mt-1">{c.department}</p>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sticky continue */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur md:bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {selectedCount === 0
                ? "Pick at least 1 course to continue."
                : `${selectedCount} course${selectedCount === 1 ? "" : "s"} ready.`}
            </p>
            <Button
              onClick={finish}
              disabled={saving || selectedCount === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl px-6 h-11"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
