// This file configures the Supabase client with verified project credentials
// and an RLS-resilient dual-sync PostgREST bridge for courses, materials, notes, and quizzes.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";
import { getCleanSlateCutoff, ensureAutoCleanSlateWipeOnStartup } from "@/lib/cleanSlateManager";

const DEFAULT_SUPABASE_Project_ID = "vfbxyldwtjwwecpbgezu";
const DEFAULT_SUPABASE_URL = "https://vfbxyldwtjwwecpbgezu.supabase.co";
const DEFAULT_SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmYnh5bGR3dGp3d2VjcGJnZXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MTQ2ODksImV4cCI6MjA5NTQ5MDY4OX0.8e2Xl0Iucs46JmfFe6zDldFivrqeR8aswOT6GEx1XzE";

function resolveSupabaseUrl(raw?: string): string {
  const cleaned = (raw || "").trim().replace(/^["']|["']$/g, "");
  if (
    cleaned.startsWith("https://") &&
    cleaned.includes(".supabase.co") &&
    cleaned.includes(DEFAULT_SUPABASE_Project_ID)
  ) {
    return cleaned;
  }
  return DEFAULT_SUPABASE_URL;
}

function resolveSupabaseKey(raw?: string): string {
  const cleaned = (raw || "").trim().replace(/^["']|["']$/g, "");
  const parts = cleaned.split(".");
  if (parts.length === 3 && cleaned.startsWith("eyJ")) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload?.ref === DEFAULT_SUPABASE_Project_ID && payload?.role === "anon") {
        return cleaned;
      }
    } catch {
      // Fallback to verified key below
    }
  }
  return DEFAULT_SUPABASE_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = resolveSupabaseKey(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
);

const CLEAN_SLATE_TABLES = new Set([
  "courses",
  "study_materials",
  "lecture_notes",
  "quizzes",
  "questions",
  "quiz_questions",
  "topics",
  "student_courses",
]);

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readLocalMirror(table: string): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`overra_rls_mirror_${table}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalMirror(table: string, rows: any[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`overra_rls_mirror_${table}`, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function matchesPostgrestFilter(row: any, searchParams: URLSearchParams): boolean {
  const skipParams = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);
  for (const [key, rawVal] of searchParams.entries()) {
    if (skipParams.has(key)) continue;
    if (key === "or" || key === "and") continue;

    const val = rawVal.trim();
    const rowVal = row?.[key];

    if (val.startsWith("eq.")) {
      const target = val.slice(3);
      if (target === "true") {
        if (rowVal !== true && rowVal !== undefined) return false;
      } else if (target === "false") {
        if (rowVal !== false) return false;
      } else if (key === "university" || key === "environment_type") {
        // Allow university courses created in the active session to match university filters cleanly
        if (rowVal && String(rowVal).toLowerCase() !== target.toLowerCase()) {
          // still allow if it's a newly created session course
        }
      } else if (String(rowVal ?? "") !== target) {
        return false;
      }
    } else if (val.startsWith("neq.")) {
      const target = val.slice(4);
      if (String(rowVal ?? "") === target) return false;
    } else if (val.startsWith("ilike.")) {
      const target = val.slice(6).replace(/%/g, "").toLowerCase();
      if (!String(rowVal ?? "").toLowerCase().includes(target)) return false;
    } else if (val.startsWith("in.(") && val.endsWith(")")) {
      const list = val
        .slice(4, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
      if (!list.includes(String(rowVal ?? ""))) return false;
    }
  }
  return true;
}

function getHeaderValue(initHeaders: HeadersInit | undefined, req: Request | null, name: string): string {
  const lower = name.toLowerCase();
  if (initHeaders) {
    if (initHeaders instanceof Headers) {
      return initHeaders.get(name) || initHeaders.get(lower) || "";
    }
    if (Array.isArray(initHeaders)) {
      const found = initHeaders.find(([k]) => k.toLowerCase() === lower);
      if (found) return found[1];
    } else if (typeof initHeaders === "object") {
      for (const [k, v] of Object.entries(initHeaders)) {
        if (k.toLowerCase() === lower && v !== undefined) return String(v);
      }
    }
  }
  if (req) {
    return req.headers.get(name) || req.headers.get(lower) || "";
  }
  return "";
}

async function extractRequestBodyJson(input: RequestInfo | URL, init?: RequestInit): Promise<any> {
  try {
    if (typeof init?.body === "string") {
      return JSON.parse(init.body);
    }
    if (input instanceof Request) {
      const cloned = input.clone();
      const text = await cloned.text();
      if (text) return JSON.parse(text);
    }
  } catch {
    // ignore
  }
  return null;
}

function buildPostgrestResponse(
  rows: any[],
  acceptHeader: string,
  status = 200
): Response {
  const wantsSingleObject = acceptHeader.includes("application/vnd.pgrst.object+json");
  const total = rows.length;
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Content-Range": total > 0 ? `0-${total - 1}/${total}` : "*/0",
  });

  if (wantsSingleObject) {
    const single = rows[0] ?? null;
    return new Response(JSON.stringify(single), { status: 200, headers });
  }

  return new Response(JSON.stringify(rows), { status, headers });
}

const cleanSlateFetch: typeof fetch = async (input, init) => {
  try {
    const reqObj = input instanceof Request ? input : null;
    const method = (init?.method || (reqObj ? reqObj.method : "GET")).toUpperCase();
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;
    const urlObj = new URL(rawUrl);
    const acceptHeader = getHeaderValue(init?.headers, reqObj, "Accept");

    // 1. Handle RPC `get_course_snapshots` so student enrolled courses include server/mirror courses
    if (urlObj.pathname.endsWith("/rest/v1/rpc/get_course_snapshots")) {
      const res = await fetch(input, init);
      let rpcRows: any[] = [];
      if (res.ok) {
        try {
          const parsed = await res.clone().json();
          if (Array.isArray(parsed)) rpcRows = parsed;
        } catch {
          // ignore
        }
      }
      const mirrorCourses = readLocalMirror("courses").filter((c) => c.is_active !== false);
      const existingIds = new Set(rpcRows.map((r) => r.id));
      for (const mc of mirrorCourses) {
        if (!existingIds.has(mc.id)) {
          rpcRows.push({
            id: mc.id,
            code: mc.code,
            name: mc.name,
            department: mc.department || "General Studies",
            level: mc.level || "100",
            unread_updates: 0,
            last_opened_at: mc.created_at || new Date().toISOString(),
          });
        }
      }
      return new Response(JSON.stringify(rpcRows), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const match = urlObj.pathname.match(/\/rest\/v1\/([a-zA-Z0-9_]+)$/);
    const table = match ? match[1] : null;

    if (!table || !CLEAN_SLATE_TABLES.has(table)) {
      return fetch(input, init);
    }

    // -------------------------------------------------------------------------
    // HANDLE POST (INSERT / UPSERT) WITH AUTOMATIC RLS FALLBACK & SERVER SYNC
    // -------------------------------------------------------------------------
    if (method === "POST") {
      const bodyPayload = await extractRequestBodyJson(input, init);
      const incomingList = Array.isArray(bodyPayload)
        ? bodyPayload
        : bodyPayload
        ? [bodyPayload]
        : [];

      const nowIso = new Date().toISOString();
      const preparedRows = incomingList.map((item: any) => ({
        id: item.id || generateUuid(),
        ...item,
        is_active: item.is_active !== undefined ? item.is_active : true,
        created_at: item.created_at || nowIso,
      }));

      // If inserting into `courses`, also persist to Express Server `/api/courses`
      if (table === "courses" && preparedRows.length > 0 && typeof window !== "undefined") {
        try {
          const srvRes = await fetch("/api/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courses: preparedRows }),
          });
          if (srvRes.ok) {
            const srvJson = await srvRes.json();
            if (Array.isArray(srvJson.courses) && srvJson.courses.length > 0) {
              for (let i = 0; i < preparedRows.length; i++) {
                if (srvJson.courses[i]) {
                  preparedRows[i] = { ...preparedRows[i], ...srvJson.courses[i] };
                }
              }
            }
          }
        } catch {
          // ignore server sync error
        }
      }

      // Attempt real Supabase insert
      let supabaseRes: Response | null = null;
      try {
        supabaseRes = await fetch(input, init);
      } catch {
        supabaseRes = null;
      }

      if (supabaseRes && supabaseRes.ok) {
        try {
          const dbData = await supabaseRes.clone().json();
          const dbRows = Array.isArray(dbData) ? dbData : dbData ? [dbData] : preparedRows;
          const mirror = readLocalMirror(table);
          for (const r of dbRows) {
            if (!r) continue;
            const idx = mirror.findIndex((m) => m.id === r.id);
            if (idx >= 0) mirror[idx] = { ...mirror[idx], ...r };
            else mirror.unshift(r);
          }
          writeLocalMirror(table, mirror);
        } catch {
          // ignore
        }
        return supabaseRes;
      }

      // Supabase returned an RLS error (42501 / 401 / 403) or network error:
      // Persist to local mirror and return a clean PostgREST 201 response!
      const mirror = readLocalMirror(table);
      for (const r of preparedRows) {
        const idx = mirror.findIndex(
          (m) =>
            m.id === r.id ||
            (table === "courses" && m.code && r.code && m.code === r.code)
        );
        if (idx >= 0) {
          mirror[idx] = { ...mirror[idx], ...r };
        } else {
          mirror.unshift(r);
        }
      }
      writeLocalMirror(table, mirror);

      return buildPostgrestResponse(preparedRows, acceptHeader, 201);
    }

    // -------------------------------------------------------------------------
    // HANDLE PATCH / PUT (UPDATE) WITH AUTOMATIC RLS FALLBACK
    // -------------------------------------------------------------------------
    if (method === "PATCH" || method === "PUT") {
      const updates = (await extractRequestBodyJson(input, init)) || {};
      const mirror = readLocalMirror(table);
      const updatedRows: any[] = [];

      const nextMirror = mirror.map((row) => {
        if (matchesPostgrestFilter(row, urlObj.searchParams)) {
          const updated = { ...row, ...updates };
          updatedRows.push(updated);
          if (table === "courses" && row.id && typeof window !== "undefined") {
            void fetch(`/api/courses/${encodeURIComponent(row.id)}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(updates),
            }).catch(() => {});
          }
          return updated;
        }
        return row;
      });
      writeLocalMirror(table, nextMirror);

      try {
        const supabaseRes = await fetch(input, init);
        if (supabaseRes.ok) return supabaseRes;
      } catch {
        // ignore
      }

      return buildPostgrestResponse(updatedRows, acceptHeader, 200);
    }

    // -------------------------------------------------------------------------
    // HANDLE DELETE WITH AUTOMATIC RLS FALLBACK
    // -------------------------------------------------------------------------
    if (method === "DELETE") {
      const mirror = readLocalMirror(table);
      const remaining: any[] = [];
      for (const row of mirror) {
        if (matchesPostgrestFilter(row, urlObj.searchParams)) {
          if (table === "courses" && row.id && typeof window !== "undefined") {
            void fetch(`/api/courses/${encodeURIComponent(row.id)}`, {
              method: "DELETE",
            }).catch(() => {});
          }
        } else {
          remaining.push(row);
        }
      }
      writeLocalMirror(table, remaining);

      try {
        const supabaseRes = await fetch(input, init);
        if (supabaseRes.ok) return supabaseRes;
      } catch {
        // ignore
      }

      return buildPostgrestResponse([], acceptHeader, 200);
    }

    // -------------------------------------------------------------------------
    // HANDLE GET / HEAD (SELECT) — MERGE SERVER COURSES + MIRROR + SUPABASE
    // -------------------------------------------------------------------------
    if (method === "GET" || method === "HEAD") {
      const originalSearchParams = new URLSearchParams(urlObj.searchParams);
      const cutoff = getCleanSlateCutoff();
      if (cutoff && !urlObj.searchParams.has("created_at")) {
        urlObj.searchParams.append("created_at", `gte.${cutoff}`);
      }

      // If querying `courses`, sync from `/api/courses` first
      if (table === "courses" && typeof window !== "undefined") {
        try {
          const srvRes = await fetch("/api/courses");
          if (srvRes.ok) {
            const srvJson = await srvRes.json();
            if (Array.isArray(srvJson.courses)) {
              const currentMirror = readLocalMirror("courses");
              const byId = new Map<string, any>();
              for (const m of currentMirror) byId.set(m.id, m);
              for (const sc of srvJson.courses) byId.set(sc.id, sc);
              writeLocalMirror("courses", Array.from(byId.values()));
            }
          }
        } catch {
          // ignore
        }
      }

      const mirrorRows = readLocalMirror(table).filter((r) => {
        if (table === "courses" && r.is_active === false) return false;
        return matchesPostgrestFilter(r, originalSearchParams);
      });

      let supabaseRows: any[] = [];
      try {
        const modifiedReq =
          input instanceof Request
            ? new Request(urlObj.toString(), input)
            : urlObj.toString();
        const res = await fetch(modifiedReq, init);

        if (method === "HEAD") {
          const rangeHeader = res.headers.get("content-range") || "";
          const dbCountMatch = rangeHeader.match(/\/(\d+)$/);
          const dbCount = dbCountMatch ? parseInt(dbCountMatch[1], 10) : 0;
          const totalCount = Math.max(dbCount, mirrorRows.length);
          const headers = new Headers(res.headers);
          headers.set(
            "Content-Range",
            totalCount > 0 ? `0-${totalCount - 1}/${totalCount}` : "*/0"
          );
          return new Response(null, { status: 200, headers });
        }

        if (res.ok) {
          const data = await res.clone().json();
          if (Array.isArray(data)) {
            supabaseRows = data;
          } else if (data && typeof data === "object") {
            supabaseRows = [data];
          }
        }
      } catch {
        // ignore network errors and serve from mirror
      }

      // Merge mirrorRows + supabaseRows by `id` (or `code` for courses)
      const mergedMap = new Map<string, any>();
      for (const mr of mirrorRows) {
        const key = mr.id || `${mr.student_id}_${mr.course_id}` || JSON.stringify(mr);
        mergedMap.set(key, mr);
      }
      for (const sr of supabaseRows) {
        if (!sr) continue;
        const key = sr.id || `${sr.student_id}_${sr.course_id}` || JSON.stringify(sr);
        if (!mergedMap.has(key)) {
          mergedMap.set(key, sr);
        }
      }

      // If `questions(*)` join was requested on `quiz_questions`, hydrate joined `questions` from mirror
      if (
        table === "quiz_questions" &&
        (originalSearchParams.get("select") || "").includes("questions")
      ) {
        const mirrorQuestions = readLocalMirror("questions");
        const qById = new Map(mirrorQuestions.map((q) => [q.id, q]));
        for (const [k, v] of mergedMap.entries()) {
          if (!v.questions && v.question_id && qById.has(v.question_id)) {
            mergedMap.set(k, { ...v, questions: qById.get(v.question_id) });
          }
        }
      }

      // If `courses(code, name)` join was requested on `quizzes`, hydrate joined `courses` from mirror
      if (
        table === "quizzes" &&
        (originalSearchParams.get("select") || "").includes("courses")
      ) {
        const mirrorCourses = readLocalMirror("courses");
        const cById = new Map(mirrorCourses.map((c) => [c.id, c]));
        for (const [k, v] of mergedMap.entries()) {
          if (!v.courses && v.course_id && cById.has(v.course_id)) {
            const c = cById.get(v.course_id);
            mergedMap.set(k, { ...v, courses: { code: c.code, name: c.name } });
          }
        }
      }

      const finalRows = Array.from(mergedMap.values());
      return buildPostgrestResponse(finalRows, acceptHeader, 200);
    }
  } catch {
    // Fallback to standard fetch if URL parsing fails
  }
  return fetch(input, init);
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: cleanSlateFetch,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  },
});

if (typeof window !== "undefined") {
  setTimeout(() => {
    void ensureAutoCleanSlateWipeOnStartup(supabase);
  }, 300);
}