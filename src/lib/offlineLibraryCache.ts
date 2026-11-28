/**
 * Tiny IndexedDB wrapper to cache tutor-material blobs for offline access.
 * Keyed by material id. Survives reloads; works without service worker.
 */

import {
  fetchVerifiedPdfBlob,
  isHtmlOrJsonErrorBlob,
  isUploadedBinaryFile,
  isValidPdfBlob,
} from "@/lib/pdfResolver";

const DB_NAME = "overra-offline-library";
const STORE = "materials";
const VERSION = 1;

export interface CachedMaterial {
  id: string;
  title: string;
  mime: string;
  ext?: string;
  blob: Blob;
  cached_at: number;
  /** Optional course id this material belongs to — used by the offline manager to group per course. */
  course_id?: string | null;
  course_code?: string | null;
  source_url?: string | null;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheMaterialOffline(item: CachedMaterial): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getCachedMaterial(id: string): Promise<CachedMaterial | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => { db.close(); resolve((req.result as CachedMaterial) || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function listCachedMaterialIds(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => { db.close(); resolve((req.result as string[]) || []); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Full metadata for every cached blob — used by the Offline Downloads manager. */
export interface CachedSummary {
  id: string;
  title: string;
  mime: string;
  ext?: string;
  size: number;
  cached_at: number;
  course_id?: string | null;
  course_code?: string | null;
}

export async function listCachedMaterials(): Promise<CachedSummary[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      db.close();
      const rows = (req.result as CachedMaterial[]) || [];
      resolve(rows.map((r) => ({
        id: r.id, title: r.title, mime: r.mime, ext: r.ext,
        size: r.blob?.size ?? 0, cached_at: r.cached_at,
        course_id: r.course_id ?? null, course_code: r.course_code ?? null,
      })));
    };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Returns cached materials filtered to a single course. */
export async function listCachedMaterialsByCourse(courseId: string): Promise<CachedSummary[]> {
  const all = await listCachedMaterials();
  return all.filter((m) => m.course_id === courseId);
}

/** Convenience: cache a file by fetching it from a URL (verified against HTML/JSON error pages). */
export async function cacheMaterialFromUrl(input: {
  id: string; title: string; url: string;
  course_id?: string | null; course_code?: string | null;
  onProgress?: (loaded: number, total: number | null) => void;
}): Promise<void> {
  const ext = (input.url.split("?")[0].split(".").pop() || "").toLowerCase() || undefined;
  const expectPdf = !ext || ext === "pdf";

  let blob: Blob | null = null;
  try {
    const res = await fetch(input.url);
    if (res.ok) {
      const total = Number(res.headers.get("Content-Length")) || null;
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      if (reader) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) { chunks.push(value); loaded += value.length; input.onProgress?.(loaded, total); }
        }
      }
      const candidate = reader
        ? new Blob(chunks as BlobPart[], { type: res.headers.get("Content-Type") || "application/octet-stream" })
        : await res.blob();
      const isBad = await isHtmlOrJsonErrorBlob(candidate);
      if (!isBad && (!expectPdf || (await isValidPdfBlob(candidate)))) {
        blob = expectPdf ? new Blob([candidate], { type: "application/pdf" }) : candidate;
      }
    }
  } catch {
    // fall through to verified PDF resolver
  }

  if (!blob && expectPdf) {
    const verified = await fetchVerifiedPdfBlob({
      id: input.id,
      title: input.title,
      courseCode: input.course_code,
      fileUrl: input.url,
      allowGeneratedFallback: !isUploadedBinaryFile(input.url, ext),
    });
    blob = verified.blob;
    input.onProgress?.(blob.size, blob.size);
  }

  if (!blob) {
    throw new Error("Could not download a valid copy of this file");
  }

  await cacheMaterialOffline({
    id: input.id,
    title: input.title,
    mime: blob.type || (expectPdf ? "application/pdf" : "application/octet-stream"),
    ext: expectPdf ? "pdf" : ext,
    blob,
    cached_at: Date.now(),
    course_id: input.course_id ?? null,
    course_code: input.course_code ?? null,
    source_url: input.url,
  });
}

export async function clearAllCachedMaterials(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function removeCachedMaterial(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Open a cached blob in a new tab via object URL. */
export function openCachedBlob(item: CachedMaterial): void {
  const url = URL.createObjectURL(item.blob);
  const w = window.open(url, "_blank", "noopener");
  // Revoke later to allow the new tab to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!w) {
    // Popup blocked — trigger download instead.
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.title}.${item.ext || (item.mime.split("/")[1] || "bin")}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/* ---- Auto-save preference (per-device) ---- */
const AUTO_SAVE_KEY = "overra:autoSaveTutorMaterials";
export const getAutoSaveEnabled = (): boolean => {
  try { return localStorage.getItem(AUTO_SAVE_KEY) === "1"; } catch { return false; }
};
export const setAutoSaveEnabled = (v: boolean): void => {
  try { localStorage.setItem(AUTO_SAVE_KEY, v ? "1" : "0"); } catch { /* ignore */ }
};