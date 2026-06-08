import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumPageHeroProps {
  /** Tiny uppercase eyebrow above the title (e.g. "AUDIO LEARNING"). */
  eyebrow?: string;
  /** Big display title. */
  title: ReactNode;
  /** Supporting one-liner under the title. */
  subtitle?: ReactNode;
  /** Optional left icon shown in the rounded gold badge. */
  icon?: LucideIcon;
  /** Right-aligned actions / chips / buttons. */
  right?: ReactNode;
  /** Optional row of pill chips rendered above the title. */
  chips?: ReactNode;
  /** Optional CTA / content rendered below subtitle (buttons, stat row, etc.). */
  children?: ReactNode;
  /** Back-button behavior: hide, navigate(-1), or a target route. */
  back?: boolean | string;
  /** Visual size — sm for tight inner pages, md default, lg for marquee. */
  size?: "sm" | "md" | "lg";
  /** Extra class on the outer wrapper. */
  className?: string;
  /** Tone — gold (default) or ivory (softer/neutral). */
  tone?: "gold" | "ivory";
}

/**
 * Premium, mobile-first page hero used across the student app.
 * Soft gold gradient + decorative orb + animated entrance.
 *
 * Usage:
 *   <PremiumPageHero
 *     eyebrow="AUDIO LEARNING"
 *     title="Listen, learn, repeat"
 *     subtitle="Turn any document into focus-friendly audio."
 *     icon={Headphones}
 *     back
 *   />
 */
export const PremiumPageHero = ({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  right,
  chips,
  children,
  back,
  size = "md",
  className,
  tone = "gold",
}: PremiumPageHeroProps) => {
  const navigate = useNavigate();
  const pad = size === "lg" ? "p-5 sm:p-8" : size === "sm" ? "p-4 sm:p-5" : "p-5 sm:p-7";
  const titleSize =
    size === "lg"
      ? "text-2xl sm:text-4xl"
      : size === "sm"
      ? "text-lg sm:text-2xl"
      : "text-xl sm:text-3xl";

  const bg =
    tone === "ivory"
      ? "bg-gradient-to-br from-amber-50/70 via-white to-white"
      : "bg-gradient-to-br from-amber-100 via-amber-50 to-white";

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-amber-200/60",
        bg,
        className,
      )}
    >
      {/* Subtle radial highlights */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 20%, rgba(180,140,40,0.55) 0, transparent 42%), radial-gradient(circle at 82% 65%, rgba(217,169,40,0.55) 0, transparent 52%)",
        }}
      />
      {/* Decorative gold orb */}
      <motion.div
        aria-hidden
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute -top-14 -right-12 w-52 h-52 rounded-full bg-gradient-to-br from-amber-300/45 to-amber-500/15 blur-2xl pointer-events-none"
      />

      <div className={cn("relative", pad)}>
        {/* Top row: back + right actions */}
        {(back || right) && (
          <div className="flex items-center justify-between gap-2 mb-3">
            {back ? (
              typeof back === "string" ? (
                <Link
                  to={back}
                  aria-label="Back"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/85 backdrop-blur border border-amber-200 text-[12px] font-bold text-amber-800 hover:bg-white transition active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Link>
              ) : (
                <button
                  onClick={() => navigate(-1)}
                  aria-label="Back"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/85 backdrop-blur border border-amber-200 text-[12px] font-bold text-amber-800 hover:bg-white transition active:scale-95"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </button>
              )
            ) : <span />}
            {right && <div className="flex items-center gap-2 flex-wrap justify-end">{right}</div>}
          </div>
        )}

        <div className="flex items-start gap-3 sm:gap-4">
          {Icon && (
            <motion.div
              initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.05, ease: "backOut" }}
              className={cn(
                "shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center",
                size === "lg" ? "w-14 h-14" : size === "sm" ? "w-10 h-10" : "w-12 h-12",
              )}
            >
              <Icon
                className={cn(
                  size === "lg" ? "w-7 h-7" : size === "sm" ? "w-5 h-5" : "w-6 h-6",
                )}
                strokeWidth={2.2}
              />
            </motion.div>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 backdrop-blur border border-amber-200 mb-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-600" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-800">
                  {eyebrow}
                </span>
              </div>
            )}
            {chips && <div className="mb-2 flex flex-wrap gap-1.5">{chips}</div>}
            <h1
              className={cn(
                "font-display font-extrabold text-neutral-900 leading-tight tracking-tight",
                titleSize,
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[13px] sm:text-[14.5px] text-neutral-600 mt-2 leading-relaxed max-w-2xl">
                {subtitle}
              </p>
            )}
            {children && <div className="mt-4">{children}</div>}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default PremiumPageHero;
