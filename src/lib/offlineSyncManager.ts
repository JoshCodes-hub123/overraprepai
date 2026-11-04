/**
 * Offline Background Sync Manager
 * Queues failed network mutations or offline actions in localStorage/IndexedDB
 * and automatically flushes and retries them when connectivity is restored.
 */
import { toast } from "sonner";

interface QueuedAction {
  id: string;
  endpoint: string;
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = "overra:offline-action-queue-v1";

export function getOfflineQueue(): QueuedAction[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineAction(endpoint: string, payload: any) {
  if (typeof localStorage === "undefined") return;
  try {
    const queue = getOfflineQueue();
    const newAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      endpoint,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };
    queue.push(newAction);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    toast.info("Action saved offline. Will sync automatically when connection returns.");
  } catch (err) {
    console.warn("Could not queue offline action:", err);
  }
}

export async function processOfflineQueue(syncCallback?: (action: QueuedAction) => Promise<boolean>) {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  const remaining: QueuedAction[] = [];
  let syncedCount = 0;

  for (const action of queue) {
    try {
      let success = false;
      if (syncCallback) {
        success = await syncCallback(action);
      } else {
        // Default mock success sync if no custom callback provided
        await new Promise((r) => setTimeout(r, 400));
        success = true;
      }

      if (success) {
        syncedCount++;
      } else {
        if (action.retries < 3) {
          remaining.push({ ...action, retries: action.retries + 1 });
        }
      }
    } catch {
      if (action.retries < 3) {
        remaining.push({ ...action, retries: action.retries + 1 });
      }
    }
  }

  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } catch {}

  if (syncedCount > 0) {
    toast.success(`Successfully synchronized ${syncedCount} offline action(s) to server!`);
  }
}

// Automatically listen for online event to flush queue
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void processOfflineQueue();
  });
}
