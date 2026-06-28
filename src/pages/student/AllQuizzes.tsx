import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Flame, Sparkles, BookOpen, ArrowLeft } from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import AppScreen from "@/components/app-shell/AppScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QuizCard, QuizCardSkeleton } from "@/components/quizzes/QuizCard";
import { useQuizzes } from "@/hooks/useQuizzes";

export default function AllQuizzes() {
  const { data, isLoading } = useQuizzes();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!data) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return data;
    const match = (s?: string | null) => (s ?? "").toLowerCase().includes(needle);
    return {
      ...data,
      trending: data.trending.filter((x) => match(x.title) || match(x.course?.code) || match(x.course?.name)),
      newest: data.newest.filter((x) => match(x.title) || match(x.course?.code) || match(x.course?.name)),
      byCourse: data.byCourse
        .map((g) => ({
          ...g,
          quizzes: g.quizzes.filter((x) => match(x.title) || match(g.code) || match(g.name)),
        }))
        .filter((g) => g.quizzes.length > 0),
    };
  }, [data, q]);

  return (
    <>
      <SEO title="All Quizzes" description="Browse every quiz on OverraPrep AI — grouped by course, with what's trending and brand new." noindex />
      <AppScreen title="Quizzes" subtitle="Pick a course, jump in, level up.">
        <div className="relative min-h-[60vh]">
          <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 rounded-full bg-amber-200/40 blur-3xl" />

          {/* Hero header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-5 sm:p-6 mb-5"
          >
            <div className="flex items-start gap-3">
              <Link to="/student/dashboard" aria-label="Back" className="md:hidden p-2 rounded-full hover:bg-amber-100">
                <ArrowLeft className="h-5 w-5 text-amber-700" />
              </Link>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold tracking-wider text-amber-700 uppercase">All Quizzes</p>
                <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                  Find your next <span className="text-amber-600">win</span>.
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data?.total ?? 0} quizzes across {data?.byCourse.length ?? 0} courses. Practice today. Excel tomorrow.
                </p>
              </div>
            </div>

            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-700" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by course code (e.g. MTS 102), title…"
                className="pl-9 h-11 rounded-xl border-amber-300 bg-white focus-visible:ring-amber-400"
              />
            </div>
          </motion.div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <QuizCardSkeleton key={i} />)}
            </div>
          )}

          {!isLoading && filtered && (
            <div className="space-y-8">
              {filtered.trending.length > 0 && (
                <Section icon={<Flame className="h-4 w-4" />} eyebrow="Trending now" title="Hottest this week">
                  <Grid quizzes={filtered.trending} />
                </Section>
              )}

              {filtered.newest.length > 0 && (
                <Section icon={<Sparkles className="h-4 w-4" />} eyebrow="Fresh" title="Newest quizzes">
                  <Grid quizzes={filtered.newest} />
                </Section>
              )}

              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-amber-700" />
                  <p className="text-xs font-bold tracking-wider text-amber-700 uppercase">By course</p>
                </div>
                {filtered.byCourse.map((g) => (
                  <div key={g.courseId} className="space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h2 className="text-lg sm:text-xl font-bold">
                        <span className="text-amber-600">{g.code}</span>
                        <span className="text-muted-foreground font-medium"> · {g.name}</span>
                      </h2>
                      <span className="text-xs text-muted-foreground">{g.quizzes.length} quiz{g.quizzes.length === 1 ? "" : "zes"}</span>
                    </div>
                    <Grid quizzes={g.quizzes} />
                  </div>
                ))}
              </div>

              {filtered.byCourse.length === 0 && filtered.trending.length === 0 && filtered.newest.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No quizzes match "{q}".</p>
                  <Button variant="outline" className="mt-3 border-amber-300" onClick={() => setQ("")}>Clear search</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </AppScreen>
    </>
  );
}

function Section({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-amber-700">
        {icon}
        <p className="text-xs font-bold tracking-wider uppercase">{eyebrow}</p>
        <span className="text-foreground/80 font-semibold text-sm">· {title}</span>
      </div>
      {children}
    </section>
  );
}

function Grid({ quizzes }: { quizzes: ReturnType<typeof useQuizzes>["data"] extends infer T ? any : never }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {quizzes.map((q: any) => <QuizCard key={q.id} quiz={q} />)}
    </div>
  );
}
