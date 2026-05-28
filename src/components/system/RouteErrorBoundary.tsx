import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, RotateCw } from "lucide-react";
import { logClientError } from "@/lib/analytics";

interface State { hasError: boolean; error: Error | null; isChunkError: boolean; }

const isChunkLoadError = (err: unknown): boolean => {
  const msg = (err as any)?.message ?? "";
  return (
    typeof msg === "string" &&
    /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg)
  );
};

/**
 * Per-route error boundary mounted INSIDE the app shell so a single failing
 * lazy import or render error doesn't tear down the navbar / bottom tabs.
 * - Chunk errors get a quiet "Reload" CTA (most often: post-deploy stale module).
 * - Render errors get a "Try again" that resets local state without a hard reload,
 *   so the user can keep navigating from where they are.
 */
export class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: string },
  State
> {
  state: State = { hasError: false, error: null, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isChunkError: isChunkLoadError(error) };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Auto-reset when the user navigates to a different route.
    if (this.state.hasError && prev.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, isChunkError: false });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[RouteErrorBoundary]", error, info);
    void logClientError({
      message: error.message || "Route error",
      stack: error.stack,
      component_stack: info.componentStack ?? undefined,
    });
  }

  reset = () => this.setState({ hasError: false, error: null, isChunkError: false });
  reload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("_cb", Date.now().toString(36));
    window.location.replace(url.toString());
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const { isChunkError } = this.state;
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          <h2 className="font-display text-xl font-bold mb-2">
            {isChunkError ? "Update available" : "This page hit a snag"}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {isChunkError
              ? "A new version of the app is ready. Reload to continue — nothing was lost."
              : "Something went wrong loading this screen. Try again, or head back home."}
          </p>
          <div className="flex gap-2 justify-center">
            {isChunkError ? (
              <>
                <Button onClick={this.reload}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Reload
                </Button>
                <Button variant="outline" onClick={() => { window.location.href = "/"; }}>
                  <Home className="w-4 h-4 mr-2" /> Go home
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={this.reset}>
                  <RotateCw className="w-4 h-4 mr-2" /> Try again
                </Button>
                <Button onClick={() => { window.location.href = "/"; }}>
                  <Home className="w-4 h-4 mr-2" /> Go home
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;