import { Link } from "react-router-dom";
import { Star, GraduationCap } from "lucide-react";
import type { RecommendedTutor } from "@/hooks/useRecommendedTutors";

/**
 * Tutors who teach the student's own courses, ordered by where the student
 * needs the most help. Horizontal, calm, image-led.
 */
export function TutorStrip({ items }: { items: RecommendedTutor[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3">
        {items.map((t) => {
          const avatar = t.profile_image_url ?? t.avatar_url;
          return (
            <Link
              key={`${t.tutor_id}-${t.course_id}`}
              to={`/u/${t.tutor_id}`}
              className="flex w-[220px] shrink-0 flex-col rounded-3xl border border-brand-line bg-brand-surface p-4 transition-all hover:-translate-y-0.5 hover:bg-brand-soft"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-env-soft">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={t.full_name ?? "Tutor"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-env" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[15px] font-semibold tracking-tight text-brand-ink">
                    {t.full_name ?? "Tutor"}
                  </span>
                  <span className="block truncate text-[12.5px] text-brand-ink-soft">
                    {t.course_code ?? t.department ?? "Tutor"}
                  </span>
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-[13px] leading-snug text-brand-ink-soft">{t.reason}</p>
              {t.rating_count > 0 && (
                <p className="mt-2 flex items-center gap-1 text-[12.5px] font-semibold text-brand-ink">
                  <Star className="h-3.5 w-3.5 fill-env text-env" aria-hidden />
                  {t.avg_rating.toFixed(1)}
                  <span className="font-medium text-brand-ink-soft">({t.rating_count})</span>
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default TutorStrip;
