import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScreenProps {
  children: ReactNode;
  className?: string;
  /** Removes horizontal gutters for edge-to-edge content (rails, media). */
  bleed?: boolean;
}

/**
 * The single mobile screen container. Safe areas, one max width, one rhythm.
 * No decoration lives here — screens stay calm by default.
 */
export function Screen({ children, className, bleed }: ScreenProps) {
  return (
    <div
      className="min-h-screen bg-brand-surface text-brand-ink"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-2xl lg:max-w-5xl pb-28 md:pb-14",
          bleed ? "px-0" : "px-5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Screen;
