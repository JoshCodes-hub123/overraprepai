import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Wraps dynamic imports with automatic retry logic to withstand transient network drops
 * and Vite dev server compilation / restart blips.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  maxRetries = 3,
  delayMs = 900
): LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (retriesLeft: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            const isChunkOrFetch =
              /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
                error?.message || String(error)
              );

            if (retriesLeft <= 0) {
              if (isChunkOrFetch && typeof window !== "undefined") {
                const RELOAD_KEY = "lazy_route_auto_reload";
                const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
                if (Date.now() - last > 12_000) {
                  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
                  const url = new URL(window.location.href);
                  url.searchParams.set("_cb", Date.now().toString(36));
                  window.location.replace(url.toString());
                  return;
                }
              }
              reject(error);
              return;
            }

            setTimeout(() => {
              attempt(retriesLeft - 1);
            }, delayMs);
          });
      };
      attempt(maxRetries);
    })
  );
}

export default lazyWithRetry;
