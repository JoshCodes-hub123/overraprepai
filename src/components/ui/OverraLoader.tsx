import React from "react";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export interface OverraLoaderProps {
  /**
   * Sizing scale:
   * - 'xs': 18px (ideal for button icons and tiny badges)
   * - 'sm': 28px (compact cards / mobile tables)
   * - 'md': 36px (default OverraPrep standard, 28-40px on mobile)
   * - 'lg': 48px (spacious cards / modal headers)
   * - 'xl': 60px (page-level states)
   * - number: custom pixel dimension
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;

  /**
   * Layout presentation:
   * - 'inline': compact inline element for buttons and text lines
   * - 'block': centered in a content section/card without full-screen cover
   * - 'page': spacious page-level state that preserves headers/navbars
   * - 'fullscreen': fixed backdrop for full app loading
   */
  variant?: "inline" | "block" | "page" | "fullscreen";

  /** Optional accessible status label or secondary caption */
  label?: string;

  /** Additional container styling */
  className?: string;

  /** Color accent tone */
  tone?: "gold" | "white" | "muted" | "auto";

  /** Hide the animated orbit ring (show only the pulsing mark) */
  hideOrbit?: boolean;
}

const SIZE_MAP: Record<string, { container: number; icon: number; stroke: number }> = {
  xs: { container: 18, icon: 13, stroke: 1.5 },
  sm: { container: 28, icon: 19, stroke: 1.8 },
  md: { container: 36, icon: 24, stroke: 2.0 },
  lg: { container: 48, icon: 32, stroke: 2.2 },
  xl: { container: 60, icon: 40, stroke: 2.5 },
};

/**
 * OverraLoader - Authentic OverraPrep AI Minimalist Loading Indicator
 *
 * Visual anatomy:
 *  1. Centered authentic OverraPrep logo emblem with gentle gold breathing pulse
 *  2. Fine metallic gold orbit ring tracing smoothly around it
 *  3. Subtle golden ambient halo
 *  4. Fast 100-150ms fade-in/fade-out
 *  5. Full screen-reader accessibility and reduced-motion support
 */
export const OverraLoader: React.FC<OverraLoaderProps> = ({
  size = "md",
  variant = "block",
  label,
  className,
  tone = "auto",
  hideOrbit = false,
}) => {
  const dimensions =
    typeof size === "number"
      ? { container: size, icon: Math.round(size * 0.68), stroke: 2 }
      : SIZE_MAP[size] || SIZE_MAP.md;

  const { container: containerSize, icon: iconSize, stroke } = dimensions;

  // The central emblem and orbit ring
  const loaderElement = (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0 select-none",
        className
      )}
      style={{ width: containerSize, height: containerSize }}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      {/* 1. Ambient soft gold halo */}
      <div
        className="absolute inset-0 rounded-full bg-primary/15 blur-[6px] pointer-events-none overra-pulse-subtle"
        aria-hidden="true"
      />

      {/* 2. Fine golden orbit ring (SVG trace) */}
      {!hideOrbit && (
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 overra-spin-smooth pointer-events-none"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Subtle track background */}
          <circle
            cx="50"
            cy="50"
            r={50 - stroke * 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke * 1.2}
            className={cn(
              tone === "white"
                ? "text-white/15"
                : "text-primary/15 dark:text-primary/20"
            )}
          />

          {/* Active moving gold orbit head */}
          <circle
            cx="50"
            cy="50"
            r={50 - stroke * 2}
            fill="none"
            stroke="url(#overraOrbitGradient)"
            strokeWidth={stroke * 1.3}
            strokeLinecap="round"
            strokeDasharray="280"
            strokeDashoffset="180"
            className="transition-all duration-300"
          />

          <defs>
            <linearGradient id="overraOrbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.1" />
              <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#F5D77F" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* 3. Authentic OverraPrep Eagle-in-Orbit Logo Emblem */}
      <img
        src={logo}
        alt=""
        width={iconSize}
        height={iconSize}
        className={cn(
          "relative object-contain select-none pointer-events-none overra-breathe",
          tone === "white" && "brightness-125"
        )}
        style={{
          width: iconSize,
          height: iconSize,
          filter: "drop-shadow(0 1px 4px rgba(212, 175, 55, 0.35))",
        }}
        draggable={false}
      />

      {/* Accessible screen reader label */}
      <span className="sr-only">{label || "Loading"}</span>
    </div>
  );

  // Variant 1: Pure inline (buttons, table rows, badges)
  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-2 align-middle">
        {loaderElement}
        {label && (
          <span className="text-xs font-medium text-muted-foreground animate-pulse">
            {label}
          </span>
        )}
      </span>
    );
  }

  // Variant 2: Block (cards, tabs, sub-panels)
  if (variant === "block") {
    return (
      <div className="flex flex-col items-center justify-center p-6 sm:p-8 w-full gap-2.5 transition-opacity duration-150 animate-in fade-in-50">
        {loaderElement}
        {label && (
          <p className="text-xs font-medium text-muted-foreground tracking-wide text-center">
            {label}
          </p>
        )}
      </div>
    );
  }

  // Variant 3: Page (subtle route/page loading without covering entire screen)
  if (variant === "page") {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center w-full transition-opacity duration-150 animate-in fade-in-50">
        {loaderElement}
        <p className="mt-3 text-xs font-medium tracking-wider uppercase text-muted-foreground">
          {label || "Loading"}
        </p>
      </div>
    );
  }

  // Variant 4: Fullscreen (modal/boot blocking overlay)
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/90 backdrop-blur-xs transition-opacity duration-150 animate-in fade-in-50"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading OverraPrep"}
    >
      <div className="flex flex-col items-center justify-center gap-3">
        {loaderElement}
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          {label || "Loading…"}
        </p>
      </div>
    </div>
  );
};

export default OverraLoader;
