import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { BookOpen, Target, Check } from "lucide-react";
import type { CourseSnapshot } from "@/hooks/useCourseSnapshots";
import { getAutomaticCourseImage } from "@/lib/courseImages";
import { cn } from "@/lib/utils";

interface Props {
  course: CourseSnapshot;
  className?: string;
}

export function CourseCard({ course, className }: Props) {
  const unread = course.unread_updates || 0;
  const {
    imageUrl,
    fallbackUrl,
    category,
    displayTitle,
    displayDepartment,
    gradient,
  } = getAutomaticCourseImage(course);

  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [imgError, setImgError] = useState(false);

  const units = /101|102|201|202|301|302/i.test(course.code) ? "3 Units" : "2 Units";

  return (
    <Card
      className={cn(
        "group relative flex flex-col h-full overflow-hidden rounded-2xl border border-amber-200/80 dark:border-border/80 bg-card hover:border-amber-400 hover:shadow-[0_12px_28px_-10px_rgba(217,119,6,0.18)] transition-all select-none",
        className
      )}
    >
      {/* Automatic Real Photographic Header */}
      <div className="relative h-38 w-full overflow-hidden bg-neutral-900 shrink-0">
        {!imgError ? (
          <img
            src={currentSrc}
            alt={`${course.code} — ${displayTitle}`}
            onError={() => {
              if (currentSrc !== fallbackUrl) {
                setCurrentSrc(fallbackUrl);
              } else {
                setImgError(true);
              }
            }}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={cn("h-full w-full flex items-center justify-center p-4 bg-gradient-to-br", gradient)}>
            <span className="font-display text-base font-bold text-white/80 text-center">{category}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/25 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-black/65 text-amber-300 border border-white/15 backdrop-blur-md">
            {course.code}
          </span>
          {unread > 0 ? (
            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-500 text-slate-950">
              +{unread} new
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/95 text-white backdrop-blur-md">
              <Check className="w-2.5 h-2.5 stroke-[3]" /> Enrolled
            </span>
          )}
        </div>

        {/* Bottom image overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 z-10 pointer-events-none">
          <span className="truncate max-w-[70%] font-medium">{category}</span>
          <span className="text-[10px] bg-black/45 px-2 py-0.5 rounded-md text-white/95 font-semibold">
            {units}
          </span>
        </div>
      </div>

      {/* Body details */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-3">
        <div>
          <Link
            to={`/courses/${course.id}`}
            className="block group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors"
          >
            <h3 className="font-display font-bold text-[15px] leading-snug line-clamp-2 text-foreground">
              {displayTitle}
            </h3>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 truncate">
            <span className="font-medium">{displayDepartment}</span>
            {course.level && (
              <>
                <span aria-hidden="true" className="text-muted-foreground/50">·</span>
                <span>{course.level} Level</span>
              </>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-2.5 border-t border-border/60 flex items-center gap-2">
          <Link
            to={`/courses/${course.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold text-xs shadow-2xs transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Course</span>
          </Link>
          <Link
            to={`/practice?course=${course.id}`}
            className="inline-flex items-center justify-center gap-1 h-9 px-3 rounded-xl border border-amber-200 dark:border-border bg-amber-50/50 dark:bg-background hover:bg-amber-100/70 text-amber-900 dark:text-foreground text-xs font-semibold transition-colors"
            title="CBT Practice"
          >
            <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>CBT</span>
          </Link>
        </div>
      </div>
    </Card>
  );
}

export default CourseCard;