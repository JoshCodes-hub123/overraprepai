import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  showText?: boolean;
  color?: "auto" | "emerald" | "amber" | "rose" | "indigo";
  className?: string;
}

export function CircularProgressGauge({
  percentage,
  size = 96,
  strokeWidth = 8,
  label,
  sublabel,
  showText = true,
  color = "auto",
  className,
}: CircularProgressGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Smooth transition from 0 to percentage
    const timer = setTimeout(() => {
      setAnimatedValue(Math.min(100, Math.max(0, percentage)));
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedValue / 100) * circumference;

  const getColorClass = () => {
    if (color !== "auto") {
      switch (color) {
        case "emerald":
          return "text-emerald-500 stroke-emerald-500";
        case "amber":
          return "text-amber-500 stroke-amber-500";
        case "rose":
          return "text-rose-500 stroke-rose-500";
        case "indigo":
          return "text-indigo-500 stroke-indigo-500";
      }
    }
    if (percentage >= 75) return "text-emerald-500 stroke-emerald-500";
    if (percentage >= 50) return "text-amber-500 stroke-amber-500";
    return "text-rose-500 stroke-rose-500";
  };

  const getTrackClass = () => {
    if (percentage >= 75) return "stroke-emerald-100 dark:stroke-emerald-950/40";
    if (percentage >= 50) return "stroke-amber-100 dark:stroke-amber-950/40";
    return "stroke-rose-100 dark:stroke-rose-950/40";
  };

  return (
    <div className={cn("relative inline-flex flex-col items-center justify-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] transform transition-transform"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className={cn("fill-none transition-colors", getTrackClass())}
          />
          {/* Animated Indicator Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset,
              transition: "stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className={cn("fill-none transition-colors", getColorClass())}
          />
        </svg>

        {showText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display font-extrabold text-lg sm:text-xl text-neutral-950 dark:text-white leading-none">
              {Math.round(animatedValue)}%
            </span>
            {sublabel && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mt-0.5">
                {sublabel}
              </span>
            )}
          </div>
        )}
      </div>

      {label && (
        <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-2 text-center">
          {label}
        </span>
      )}
    </div>
  );
}

export default CircularProgressGauge;
