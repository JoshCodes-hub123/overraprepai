import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NextStepHeroProps {
  eyebrow?: string;
  kicker?: string;
  title: string;
  context?: string;
  cta: string;
  to: string;
  coverImage?: string;
  fallbackImage?: string;
  secondaryCta?: {
    label: string;
    to: string;
  };
  className?: string;
}

/**
 * The hero card that answers "what should I study next?".
 *
 * When provided a photographic `coverImage`, renders a cinematic cover banner
 * with a measured dark-charcoal-to-gold contrast scrim. Falls back cleanly to
 * the signature dark-zinc card with a gold accent line.
 */
export function NextStepHero({
  eyebrow = "Your next step",
  kicker,
  title,
  context,
  cta,
  to,
  coverImage,
  fallbackImage,
  secondaryCta,
  className,
}: NextStepHeroProps) {
  const navigate = useNavigate();
  const [imgSrc, setImgSrc] = useState<string | undefined>(coverImage);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgSrc(coverImage);
    setImgFailed(false);
  }, [coverImage]);

  const showPhoto = Boolean(imgSrc && !imgFailed);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(to);
        }
      }}
      className={cn(
        "group relative flex w-full flex-col justify-end overflow-hidden rounded-3xl bg-[#18181B] p-6 sm:p-7 text-left text-white shadow-[0_18px_42px_-18px_rgba(24,24,27,0.55)] transition-all duration-200 hover:shadow-[0_24px_48px_-16px_rgba(212,175,55,0.32)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]",
        showPhoto ? "min-h-[220px] sm:min-h-[240px]" : "",
        className,
      )}
      aria-label={`${eyebrow}: ${title}`}
    >
      {/* Full-bleed Photographic Course Cover Backdrop */}
      {showPhoto && (
        <>
          <img
            src={imgSrc}
            alt={`${title} course cover`}
            referrerPolicy="no-referrer"
            onError={() => {
              if (fallbackImage && imgSrc !== fallbackImage) {
                setImgSrc(fallbackImage);
              } else {
                setImgFailed(true);
              }
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121215]/95 via-[#18181B]/82 to-[#18181B]/45"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121215]/90 via-transparent to-black/30"
            aria-hidden
          />
        </>
      )}

      {/* Gold accent line at the top */}
      <div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F5D77F] to-[#B8860B]"
        aria-hidden
      />

      <div className="relative z-10 flex flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#F5D77F]">
            <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden />
            {eyebrow}
          </span>
          {kicker && (
            <span className="rounded-lg border border-[#D4AF37]/35 bg-black/55 px-2.5 py-1 font-mono text-[11px] font-bold text-[#F5D77F] backdrop-blur-md">
              {kicker}
            </span>
          )}
        </div>

        <h2 className="max-w-2xl font-display text-[22px] sm:text-[26px] font-extrabold leading-[1.15] tracking-tight text-white [text-wrap:balance]">
          {title}
        </h2>

        {context && (
          <p className="mt-2 max-w-xl line-clamp-2 text-[14px] leading-relaxed text-white/80">
            {context}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(to);
            }}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] px-4 py-2 text-[13px] font-extrabold text-[#18181B] shadow-md transition-all hover:brightness-105 cursor-pointer whitespace-nowrap"
          >
            <span>{cta}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>

          {secondaryCta && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(secondaryCta.to);
              }}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20 cursor-pointer whitespace-nowrap"
            >
              <Target className="h-4 w-4 text-[#F5D77F]" aria-hidden />
              <span>{secondaryCta.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NextStepHero;

