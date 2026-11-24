import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Target } from "lucide-react";
import { getCoverImage } from "@/lib/courseCovers";

export interface SpotlightItem {
  id: string;
  kind: "material" | "quiz";
  title: string;
  courseId: string;
  courseCode?: string | null;
  metaLabel: string;
  to: string;
}

function SpotlightCard({ item, index }: { item: SpotlightItem; index: number }) {
  const initialCover = getCoverImage(
    item.kind === "quiz" ? "cbt" : "note",
    item.title,
    item.courseCode ?? undefined,
    index
  );
  const [src, setSrc] = useState(initialCover);
  const [failed, setFailed] = useState(false);

  const isQuiz = item.kind === "quiz";

  return (
    <Link
      to={item.to}
      className="group flex w-[268px] shrink-0 flex-col overflow-hidden rounded-3xl border border-[#E6E0D4] dark:border-border bg-white dark:bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37] shadow-[0_8px_22px_-12px_rgba(24,24,27,0.08)] hover:shadow-[0_14px_30px_-14px_rgba(212,175,55,0.28)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#18181B]">
        {!failed ? (
          <img
            src={src}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => {
              if (src !== "/images/courses/general.jpg") {
                setSrc("/images/courses/general.jpg");
              } else {
                setFailed(true);
              }
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#18181B] to-[#3f3112]">
            {isQuiz ? (
              <Target className="h-7 w-7 text-[#D4AF37]" aria-hidden />
            ) : (
              <FileText className="h-7 w-7 text-[#D4AF37]" aria-hidden />
            )}
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20"
          aria-hidden
        />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-[#18181B]/90 px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-[#F5D77F] border border-[#D4AF37]/40 backdrop-blur-md">
            {item.courseCode || (isQuiz ? "CBT" : "NOTE")}
          </span>
          <span
            className={
              isQuiz
                ? "rounded-md bg-[#D4AF37] px-2 py-0.5 text-[10px] font-extrabold text-[#18181B]"
                : "rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white border border-white/15 backdrop-blur-md"
            }
          >
            {isQuiz ? "CBT Exam" : "Handout"}
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between text-[11px] font-medium text-white/90">
          <span className="truncate font-mono tabular-nums">{item.metaLabel}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <h3 className="line-clamp-2 font-display text-[14.5px] font-bold leading-snug text-[#18181B] dark:text-foreground group-hover:text-[#996515] dark:group-hover:text-amber-400 transition-colors">
          {item.title}
        </h3>

        <div className="mt-3 flex items-center justify-between border-t border-[#EFECE6] dark:border-border/60 pt-2.5 text-xs font-bold text-[#996515] dark:text-amber-400">
          <span>{isQuiz ? "Start CBT Session" : "Open Study Material"}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export function StudySpotlightStrip({ items }: { items: SpotlightItem[] }) {
  if (!items.length) return null;

  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-4">
        {items.map((item, idx) => (
          <SpotlightCard key={`${item.kind}-${item.id}`} item={item} index={idx} />
        ))}
      </div>
    </div>
  );
}

export default StudySpotlightStrip;
