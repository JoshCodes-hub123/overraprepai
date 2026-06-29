import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Flame, Sparkles, BookOpen, ArrowLeft, FolderOpen, Folder, ChevronDown, X } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import AppScreen from "@/components/app-shell/AppScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QuizCard, QuizCardSkeleton, type QuizCardData } from "@/components/quizzes/QuizCard";
import { useQuizzes } from "@/hooks/useQuizzes";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { cn } from "@/lib/utils";

type Tab = "trending" | "newest" | "courses";

export default function AllQuizzes() {
  const { data, isLoading } = useQuizzes();
  const { data: progress } = useQuizProgress();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("trending");
  const [activeCourses, setActiveCourses] = useState<Set<string>>(new Set());
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  const toggleCourse = (code: string) =>
    setActiveCourses((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });

  const toggleFolder = (id: string) =>
    setOpenFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const matchesText = (s?: string | null) =>
    !q.trim() || (s ?? "").toLowerCase().includes(q.trim().toLowerCase());

  const courseFilter = (c?: { code?: string | null } | null) =>
    activeCourses.size === 0 || (!!c?.code && activeCourses.has(c.code));

  const filtered = useMemo(() => {
    if (!data) return null;
    const passQuiz = (x: QuizCardData) =>
      (matchesText(x.title) || matchesText(x.course?.code) || matchesText(x.course?.name)) &&
      courseFilter(x.course);
    return {
      ...data,
      trending: data.trending.filter(passQuiz),
      newest: data.newest.filter(passQuiz),
      byCourse: data.byCourse
        .map((g) => ({ ...g, quizzes: g.quizzes.filter(passQuiz) }))
        .filter((g) => g.quizzes.length > 0 && (activeCourses.size === 0 || activeCourses.has(g.code))),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q, activeCourses]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "trending", label: "Trending", icon: <Flame className="h-3.5 w-3.5" />, count: filtered?.trending.length ?? 0 },
    { id: "newest", label: "Newest", icon: <Sparkles className="h-3.5 w-3.5" />, count: filtered?.newest.length ?? 0 },
    { id: "courses", label: "By course", icon: <FolderOpen className="h-3.5 w-3.5" />, count: filtered?.byCourse.length ?? 0 },
  ];

  return (
    <>
      <SEO title="All Quizzes" description="Browse every quiz on OverraPrep AI — grouped by course, with what's trending and brand new." noindex />
      <AppScreen title="Quizzes" subtitle="Pick a course, jump in, level up.">
        <div className="relative min-h-[60vh]">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4 sm:p-6 mb-4"
          >
            <div className="flex items-start gap-2">
              <Link to="/student/dashboard" aria-label="Back" className="md:hidden p-2 rounded-full hover:bg-amber-100 -ml-1">
                <ArrowLeft className="h-5 w-5 text-amber-700" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">All Quizzes</p>
                <h1 className="text-xl sm:text-3xl font-extrabold leading-tight">
                  Find your next <span className="text-amber-600">win</span>.
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                  {data?.total ?? 0} quizzes · {data?.byCourse.length ?? 0} courses
                </p>
              </div>
            </div>

            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-700" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title or course (MTS 102)…"
                className="pl-9 h-11 rounded-xl border-amber-300 bg-white focus-visible:ring-amber-400"
              />
            </div>
          </motion.div>

          {/* Tabs */}
          <div role="tablist" aria-label="Quiz views" className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-2 transition shrink-0",
                  tab === t.id
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow"
                    : "bg-white text-amber-800 border-amber-200 hover:border-amber-400"
                )}
              >
                {t.icon}
                {t.label}
                <span className={cn("ml-0.5 rounded-full px-1.5 text-[10px]", tab === t.id ? "bg-white/20" : "bg-amber-100")}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Course chips */}
          {data && data.byCourse.length > 0 && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
              {activeCourses.size > 0 && (
                <button
                  onClick={() => setActiveCourses(new Set())}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold shrink-0"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
              {data.byCourse.map((g) => {
                const on = activeCourses.has(g.code);
                return (
                  <button
                    key={g.courseId}
                    onClick={() => toggleCourse(g.code)}
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold tracking-wider uppercase whitespace-nowrap border transition shrink-0",
                      on
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
                    )}
                  >
                    {g.code}
                  </button>
                );
              })}
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {Array.from({ length: 6 }).map((_, i) => <QuizCardSkeleton key={i} />)}
            </div>
          )}

          {!isLoading && filtered && (
            <div className="mt-4 space-y-4">
              {tab === "trending" && (
                <Grid quizzes={filtered.trending} progress={progress} empty="Nothing trending yet — be the first!" />
              )}
              {tab === "newest" && (
                <Grid quizzes={filtered.newest} progress={progress} empty="No new quizzes match your filters." />
              )}
              {tab === "courses" && (
                <div className="space-y-3">
                  {filtered.byCourse.length === 0 && <Empty text="No courses match your filters." onClear={() => { setQ(""); setActiveCourses(new Set()); }} />}
                  {filtered.byCourse.map((g) => {
                    const open = openFolders.has(g.courseId) || activeCourses.size > 0 || !!q.trim();
                    const doneCount = g.quizzes.filter((x) => progress?.[x.id]?.status === "completed").length;
                    return (
                      <div key={g.courseId} className="rounded-2xl border-2 border-amber-200 bg-card overflow-hidden">
                        <button
                          onClick={() => toggleFolder(g.courseId)}
                          className="w-full flex items-center gap-3 p-3 sm:p-4 text-left hover:bg-amber-50/60 transition"
                          aria-expanded={open}
                        >
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white grid place-items-center shadow">
                            {open ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-extrabold text-amber-700">{g.code}</span>
                              <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground truncate">{g.name}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {g.quizzes.length} quiz{g.quizzes.length === 1 ? "" : "zes"}
                              {doneCount > 0 && <> · <span className="text-emerald-700 font-semibold">{doneCount} done</span></>}
                            </p>
                          </div>
                          <ChevronDown className={cn("h-5 w-5 text-amber-700 transition-transform shrink-0", open && "rotate-180")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 sm:p-4 pt-0 border-t border-amber-100 bg-amber-50/30">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-3">
                                  {g.quizzes.map((x) => (
                                    <QuizCard key={x.id} quiz={x} progress={progress?.[x.id]} />
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </AppScreen>
    </>
  );
}

function Grid({
  quizzes,
  progress,
  empty,
}: {
  quizzes: QuizCardData[];
  progress?: Record<string, any>;
  empty: string;
}) {
  if (quizzes.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-10">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {quizzes.map((x) => <QuizCard key={x.id} quiz={x} progress={progress?.[x.id]} />)}
    </div>
  );
}

function Empty({ text, onClear }: { text: string; onClear: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">{text}</p>
      <Button variant="outline" className="mt-3 border-amber-300" onClick={onClear}>Clear filters</Button>
    </div>
  );
}

import { BookOpen as _BookOpen } from "lucide-react";
void _BookOpen;
