/**
 * LoadingState — a smarter loader for slow networks.
 *
 * After `slowAfterMs` (default 8s) it surfaces a "Still loading… tap to
 * retry" affordance so students on flaky 2G/3G aren't stuck staring at a
 * spinner forever. Pair with React Query's `refetch` or any retry fn.
 *
 * Usage:
 *   if (isLoading) return <LoadingState onRetry={() => refetch()} />;
 *   if (error) return <LoadingState error onRetry={() => refetch()} />;
 */
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  /** Show error state instead of spinner. */
  error?: boolean;
  /** Optional retry callback. Renders a Retry button when present. */
  onRetry?: () => void;
  /** Skeleton variant for content shape — default just shows spinner. */
  variant?: "spinner" | "card" | "list" | "hero";
  /** Custom label under the spinner. */
  label?: string;
  /** ms before showing the "still loading… tap to retry" hint. Default 8000. */
  slowAfterMs?: number;
  className?: string;
}

export function LoadingState({
  error,
  onRetry,
  variant = "spinner",
  label = "Loading…",
  slowAfterMs = 8000,
  className,
}: Props) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (error) return;
    const t = window.setTimeout(() => setSlow(true), slowAfterMs);
    return () => window.clearTimeout(t);
  }, [error, slowAfterMs]);

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-10 text-center", className)}>
        <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Couldn't load this</p>
          <p className="text-xs text-muted-foreground mt-0.5">Check your connection and try again.</p>
        </div>
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </Button>
        )}
      </div>
    );
  }

  const skeleton =
    variant === "card" ? (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ) : variant === "list" ? (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    ) : variant === "hero" ? (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <p className="text-xs">{label}</p>
      </div>
    );

  return (
    <div className={cn("relative", className)}>
      {skeleton}
      {slow && (
        <div className="mt-4 flex flex-col items-center gap-2 text-center">
          <p className="text-xs text-muted-foreground">
            Still loading… your network may be slow.
          </p>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={() => { setSlow(false); onRetry(); }} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Tap to retry
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default LoadingState;
