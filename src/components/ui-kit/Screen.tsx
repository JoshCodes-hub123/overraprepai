import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScreenProps {
  children: ReactNode;
  className?: string;
  /** Removes horizontal gutters for edge-to-edge content (rails, media). */
  bleed?: boolean;
}

/**
 * Unified responsive screen container:
 * - Mobile (<md): clean 16px gutters + safe bottom dock clearance
 * - Tablet (md..lg): 24px gutters up to max-w-4xl
 * - Desktop (lg+): full balanced workspace width up to max-w-7xl
 */
export function Screen({ children, className, bleed }: ScreenProps) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-2xl md:max-w-4xl lg:max-w-7xl pb-24 md:pb-12",
          bleed ? "px-0" : "px-4 sm:px-6 lg:px-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default Screen;
