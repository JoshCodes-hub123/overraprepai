import { Link } from "react-router-dom";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { useQuizzes } from "@/hooks/useQuizzes";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { QuizCard, QuizCardSkeleton } from "@/components/quizzes/QuizCard";


/**
 * Dashboard preview of quizzes — shows up to 6 (trending + newest) and links
 * to /quizzes for the full grouped library.
 */
export default function QuizzesPreviewRail() {
  const { data, isLoading } = useQuizzes({ limit: 60 });

  const items = (() => {
    if (!data) return [];
    const seen = new Set<string>();
    const out: typeof data.trending = [];
    for (const list of [data.trending, data.newest]) {
      for (const q of list) {
        if (seen.has(q.id)) continue;
        seen.add(q.id);
        out.push(q);
        if (out.length === 6) return out;
      }
    }
    return out;
  })();

  return (
    <section aria-labelledby="sec-quizzes" className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-amber-700 uppercase flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5" /> Quizzes
            <Sparkles className="h-3.5 w-3.5 ml-1 text-amber-500" />
          </p>
          <h2 id="sec-quizzes" className="text-lg sm:text-xl font-bold mt-0.5">Practice quizzes for you</h2>
          <p className="text-xs text-muted-foreground">Tap any card to start. New & trending picks first.</p>
        </div>
        <Link
          to="/quizzes"
          className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"
        >
          See all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <QuizCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <>
          {/* Mobile: horizontal snap rail */}
          <div className="sm:hidden -mx-3 px-3 overflow-x-auto snap-x snap-mandatory flex gap-3 pb-2 scrollbar-none">
            {items.map((q) => (
              <div key={q.id} className="snap-start shrink-0 w-[78%]">
                <QuizCard quiz={q} />
              </div>
            ))}
            <Link
              to="/quizzes"
              className="snap-start shrink-0 w-[40%] rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/60 flex flex-col items-center justify-center text-amber-700 font-semibold text-sm gap-1"
            >
              See all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {/* Desktop: grid */}
          <div className="hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((q) => <QuizCard key={q.id} quiz={q} />)}
          </div>
        </>
      )}

      {!isLoading && items.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center">
          <p className="text-sm text-muted-foreground">No quizzes yet — check back soon.</p>
        </div>
      )}
    </section>
  );
}
