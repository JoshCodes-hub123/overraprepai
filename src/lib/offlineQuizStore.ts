// Lightweight IndexedDB store for offline CBT sets + pending attempt sync.
// One DB, three stores: "sets" (metadata), "questions" (per set), and
// "pending_attempts" (completed offline runs waiting to upload).

const DB_NAME = "overaprep-offline";
const DB_VERSION = 2;
const SET_STORE = "sets";
const Q_STORE = "questions";
const PENDING_STORE = "pending_attempts";

export interface OfflineQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  image_url: string | null;
  course_name?: string | null;
}

export interface OfflineSet {
  id: string; // local set id
  title: string;
  source: "recommended" | "weak-area" | "manual";
  course_name?: string | null;
  question_count: number;
  downloaded_at: number;
  user_id: string;
}

/** A finished offline quiz attempt queued for upload when back online. */
export interface PendingAttempt {
  id: string;                // local uuid
  user_id: string;
  quiz_id: string;           // real quizzes.id (only set when set was a real quiz)
  mode: "practice" | "simulation";
  total_questions: number;
  correct_answers: number;
  score: number;             // percentage 0-100
  time_spent_seconds: number;
  started_at: string;        // ISO
  completed_at: string;      // ISO
  queued_at: number;
  attempts: number;          // upload retry count
  last_error?: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SET_STORE)) {
        const s = db.createObjectStore(SET_STORE, { keyPath: "id" });
        s.createIndex("user_id", "user_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(Q_STORE)) {
        const q = db.createObjectStore(Q_STORE, { keyPath: ["set_id", "id"] });
        q.createIndex("set_id", "set_id", { unique: false });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        const p = db.createObjectStore(PENDING_STORE, { keyPath: "id" });
        p.createIndex("user_id", "user_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Pending attempts ----------

export async function queuePendingAttempt(att: Omit<PendingAttempt, "id" | "queued_at" | "attempts">): Promise<PendingAttempt> {
  const db = await openDb();
  const full: PendingAttempt = {
    ...att,
    id: (crypto as any).randomUUID?.() ?? `pa_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    queued_at: Date.now(),
    attempts: 0,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).put(full);
    tx.oncomplete = () => resolve(full);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPendingAttempts(userId: string): Promise<PendingAttempt[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readonly");
    const req = tx.objectStore(PENDING_STORE).index("user_id").getAll(userId);
    req.onsuccess = () => resolve((req.result as PendingAttempt[]).sort((a, b) => a.queued_at - b.queued_at));
    req.onerror = () => reject(req.error);
  });
}

export async function countPendingAttempts(userId: string): Promise<number> {
  const list = await listPendingAttempts(userId);
  return list.length;
}

export async function removePendingAttempt(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    tx.objectStore(PENDING_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function markPendingAttemptFailure(id: string, message: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_STORE, "readwrite");
    const store = tx.objectStore(PENDING_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const cur = getReq.result as PendingAttempt | undefined;
      if (cur) {
        cur.attempts = (cur.attempts ?? 0) + 1;
        cur.last_error = message.slice(0, 240);
        store.put(cur);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


export async function saveOfflineSet(set: OfflineSet, questions: OfflineQuestion[]) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readwrite");
    tx.objectStore(SET_STORE).put(set);
    const qStore = tx.objectStore(Q_STORE);
    questions.forEach((q) => qStore.put({ ...q, set_id: set.id }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listOfflineSets(userId: string): Promise<OfflineSet[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SET_STORE, "readonly");
    const idx = tx.objectStore(SET_STORE).index("user_id");
    const req = idx.getAll(userId);
    req.onsuccess = () => resolve((req.result as OfflineSet[]).sort((a, b) => b.downloaded_at - a.downloaded_at));
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineSet(setId: string): Promise<{ set: OfflineSet | null; questions: OfflineQuestion[] }> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readonly");
    const setReq = tx.objectStore(SET_STORE).get(setId);
    const qReq = tx.objectStore(Q_STORE).index("set_id").getAll(setId);
    let set: OfflineSet | null = null;
    let questions: OfflineQuestion[] = [];
    setReq.onsuccess = () => (set = setReq.result || null);
    qReq.onsuccess = () => (questions = (qReq.result as any[]).map(({ set_id, ...rest }) => rest));
    tx.oncomplete = () => resolve({ set, questions });
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteOfflineSet(setId: string) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SET_STORE, Q_STORE], "readwrite");
    tx.objectStore(SET_STORE).delete(setId);
    const idx = tx.objectStore(Q_STORE).index("set_id");
    const req = idx.openCursor(setId);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
