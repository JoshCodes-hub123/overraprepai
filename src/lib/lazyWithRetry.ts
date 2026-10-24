import { lazy, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Wraps dynamic imports with automatic retry logic to withstand transient network drops
 * and Vite dev server compilation / restart blips.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  maxRetries = 2,
  delayMs = 800
): LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (retriesLeft: number) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            if (retriesLeft <= 0) {
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
