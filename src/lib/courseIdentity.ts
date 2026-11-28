import type { SupabaseClient } from "@supabase/supabase-js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

/**
 * Normalizes a course code or course slug (e.g. "course-mth-101", "mth101", "MTH  101")
 * into canonical uppercase spacing ("MTH 101").
 */
export function normalizeCourseCode(raw?: string | null): string {
  if (!raw) return "";
  const cleaned = String(raw)
    .trim()
    .replace(/^course[-_\s]+/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .toUpperCase();

  const alphaNumMatch = cleaned.match(/^([A-Z]{2,6})\s*(\d{3}[A-Z]?)$/);
  if (alphaNumMatch) {
    return `${alphaNumMatch[1]} ${alphaNumMatch[2]}`;
  }
  return cleaned;
}

/**
 * Produces a 100% deterministic, valid RFC-4122 UUID from a normalized course code
 * (e.g. "MTH 101" -> always the exact same UUID across Preview, Live Website, and every student device).
 * Used whenever a seeded course slug like "course-mth-101" has not yet been assigned a UUID in Supabase,
 * guaranteeing PostgreSQL UUID columns (`study_materials.course_id`, `lecture_notes.course_id`) never fail with 22P02.
 */
export function courseCodeToDeterministicUuid(rawCode?: string | null): string | null {
  const normalized = normalizeCourseCode(rawCode);
  if (!normalized) return null;

  const input = `overraprep:course:${normalized}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const words = seeds.map((seed, idx) => {
    let h = seed >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + idx * 31;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x7feb352d) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 0x846ca68b) >>> 0;
    h ^= h >>> 16;
    return h >>> 0;
  });

  const hex = words.map((w) => w.toString(16).padStart(8, "0")).join("");
  // Stamp RFC-4122 version 4 & variant 1 bits so strict UUID validators always accept it
  const part1 = hex.slice(0, 8);
  const part2 = hex.slice(8, 12);
  const part3 = `4${hex.slice(13, 16)}`;
  const variantNibble = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const part4 = `${variantNibble}${hex.slice(17, 20)}`;
  const part5 = hex.slice(20, 32);

  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}

/**
 * Collects all valid UUID candidates for a course (explicit UUID, Supabase DB UUID,
 * server UUID, and deterministic UUID derived from the course code) so `.in("course_id", ...)`
 * never receives a non-UUID slug and never misses documents uploaded via either path.
 */
export function collectCandidateCourseUuids(opts: {
  courseId?: string | null;
  courseMetaId?: string | null;
  srvCourseId?: string | null;
  courseCode?: string | null;
}): string[] {
  const out = new Set<string>();

  for (const candidate of [opts.courseId, opts.courseMetaId, opts.srvCourseId]) {
    if (isUuid(candidate)) {
      out.add(candidate.trim());
    }
  }

  const codeCandidates = [
    opts.courseCode,
    !isUuid(opts.courseId) ? opts.courseId : null,
    !isUuid(opts.srvCourseId) ? opts.srvCourseId : null,
  ];
  for (const code of codeCandidates) {
    const det = courseCodeToDeterministicUuid(code);
    if (det) out.add(det);
  }

  return Array.from(out);
}

/**
 * Resolves a guaranteed valid UUID for a course in Supabase:
 * 1. If `courseId` is already a valid UUID, returns it immediately.
 * 2. Searches Supabase `courses` by normalized code (e.g. "MTH 101" or "MTH101").
 * 3. If missing in Supabase `courses`, attempts to create the course row with a deterministic UUID
 *    so both Preview and the Live Website Link converge on the exact same UUID.
 * 4. Always returns a valid UUID (never a slug like "course-mth-101").
 */
export async function resolveCanonicalCourseUuid(
  supabaseClient: SupabaseClient<any>,
  opts: {
    courseId?: string | null;
    courseCode?: string | null;
    courseName?: string | null;
    department?: string | null;
    level?: string | null;
    description?: string | null;
    university?: string | null;
  }
): Promise<string> {
  if (isUuid(opts.courseId)) {
    return opts.courseId.trim();
  }

  const normalizedCode = normalizeCourseCode(opts.courseCode || opts.courseId);
  const compactCode = normalizedCode.replace(/\s+/g, "");

  if (normalizedCode) {
    try {
      const { data: exact } = await supabaseClient
        .from("courses")
        .select("id")
        .ilike("code", normalizedCode)
        .limit(1)
        .maybeSingle();
      if (isUuid(exact?.id)) {
        return exact.id;
      }

      if (compactCode && compactCode !== normalizedCode) {
        const { data: compact } = await supabaseClient
          .from("courses")
          .select("id")
          .ilike("code", compactCode)
          .limit(1)
          .maybeSingle();
        if (isUuid(compact?.id)) {
          return compact.id;
        }
      }
    } catch {
      // Fall through to deterministic UUID creation
    }
  }

  const deterministicId =
    courseCodeToDeterministicUuid(normalizedCode || opts.courseId) ||
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "00000000-0000-4000-8000-000000000001");

  // Best-effort ensure the course row exists in Supabase `courses` under this UUID
  if (normalizedCode) {
    try {
      await supabaseClient.from("courses").upsert(
        {
          id: deterministicId,
          code: normalizedCode,
          name: opts.courseName || normalizedCode,
          department: opts.department || "General Studies",
          level: opts.level ? String(opts.level).replace(/[^0-9]/g, "") || "100" : "100",
          description: opts.description || `${opts.courseName || normalizedCode} (${normalizedCode})`,
          university: opts.university || "FUTA",
          environment_type: "university",
          is_active: true,
        } as any,
        { onConflict: "id" }
      );
    } catch {
      // Non-fatal: study_materials & lecture_notes store course_id UUID without FK constraint
    }
  }

  return deterministicId;
}

export interface LiveCloudMaterialWriteParams {
  id: string;
  courseId: string;
  courseCode?: string | null;
  courseName?: string | null;
  department?: string | null;
  level?: string | null;
  university?: string | null;
  topicId?: string | null;
  title: string;
  description?: string | null;
  fileUrl: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  userId?: string | null;
  isPublished?: boolean;
}

export interface LiveCloudMaterialWriteResult {
  ok: boolean;
  courseUuid: string;
  savedToStudyMaterials: boolean;
  savedToLectureNotes: boolean;
  error?: string;
}

/**
 * Writes a material directly to live Supabase PostgreSQL (`study_materials` and `lecture_notes`)
 * bypassing any localStorage fake-201 fallback, so Preview and Live Website Link ALWAYS share the exact row.
 */
export async function persistMaterialToLiveSupabase(
  supabaseClient: SupabaseClient<any>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  params: LiveCloudMaterialWriteParams
): Promise<LiveCloudMaterialWriteResult> {
  const courseUuid = await resolveCanonicalCourseUuid(supabaseClient, {
    courseId: params.courseId,
    courseCode: params.courseCode,
    courseName: params.courseName,
    department: params.department,
    level: params.level,
    university: params.university,
  });

  const { data: sessionData } = await supabaseClient.auth.getSession();
  const accessToken = sessionData?.session?.access_token || "";
  const authUid = sessionData?.session?.user?.id || params.userId || null;

  if (!accessToken || !authUid) {
    return {
      ok: false,
      courseUuid,
      savedToStudyMaterials: false,
      savedToLectureNotes: false,
      error: "Please sign in with your Admin or Tutor account before publishing to the live website.",
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${accessToken}`,
    Prefer: "resolution=merge-duplicates,return=representation",
    "x-overra-direct": "1",
  };

  const validTopicId = isUuid(params.topicId) ? params.topicId.trim() : null;
  const isPublished = params.isPublished !== false;
  const errors: string[] = [];

  let savedToStudyMaterials = false;
  let savedToLectureNotes = false;

  // 1. Insert/upsert into `study_materials` (exact schema columns only)
  try {
    const smPayload: Record<string, any> = {
      id: params.id,
      course_id: courseUuid,
      owner_id: authUid,
      title: params.title,
      description: params.description ?? null,
      file_url: params.fileUrl,
      file_path: params.filePath,
      file_type: params.fileType || "pdf",
      file_size: Math.max(0, Math.round(Number(params.fileSize) || 0)),
      visibility: isPublished ? "public" : "private",
    };
    if (validTopicId) smPayload.topic_id = validTopicId;

    const smRes = await fetch(`${supabaseUrl}/rest/v1/study_materials`, {
      method: "POST",
      headers,
      body: JSON.stringify(smPayload),
    });

    if (smRes.ok) {
      savedToStudyMaterials = true;
    } else {
      const errText = await smRes.text().catch(() => `HTTP ${smRes.status}`);
      errors.push(`study_materials: ${errText.slice(0, 180)}`);
    }
  } catch (err: any) {
    errors.push(`study_materials: ${err?.message || "network error"}`);
  }

  // 2. Insert/upsert into `lecture_notes` (exact schema columns only)
  try {
    const lnPayload: Record<string, any> = {
      id: params.id,
      course_id: courseUuid,
      tutor_id: authUid,
      title: params.title,
      description: params.description ?? null,
      file_url: params.fileUrl,
      file_path: params.filePath,
      file_type: params.fileType || "pdf",
      file_size_bytes: Math.max(0, Math.round(Number(params.fileSize) || 0)),
      is_published: isPublished,
    };
    if (validTopicId) lnPayload.topic_id = validTopicId;

    const lnRes = await fetch(`${supabaseUrl}/rest/v1/lecture_notes`, {
      method: "POST",
      headers,
      body: JSON.stringify(lnPayload),
    });

    if (lnRes.ok) {
      savedToLectureNotes = true;
    } else {
      const errText = await lnRes.text().catch(() => `HTTP ${lnRes.status}`);
      errors.push(`lecture_notes: ${errText.slice(0, 180)}`);
    }
  } catch (err: any) {
    errors.push(`lecture_notes: ${err?.message || "network error"}`);
  }

  const ok = savedToStudyMaterials || savedToLectureNotes;
  return {
    ok,
    courseUuid,
    savedToStudyMaterials,
    savedToLectureNotes,
    error: ok ? undefined : errors.join(" | "),
  };
}

/**
 * Reads back material IDs that genuinely exist in live Supabase PostgreSQL (bypassing localStorage mirror).
 */
export async function fetchDirectCloudMaterialIds(
  supabaseClient: SupabaseClient<any>,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<Set<string>> {
  const cloudIds = new Set<string>();
  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const token = sessionData?.session?.access_token || supabaseAnonKey;
    const headers: Record<string, string> = {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      "x-overra-direct": "1",
    };

    const [smRes, lnRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/study_materials?select=id&limit=500`, { headers }).catch(
        () => null
      ),
      fetch(`${supabaseUrl}/rest/v1/lecture_notes?select=id&limit=500`, { headers }).catch(
        () => null
      ),
    ]);

    for (const res of [smRes, lnRes]) {
      if (res && res.ok) {
        const rows = await res.json().catch(() => []);
        if (Array.isArray(rows)) {
          for (const r of rows) {
            if (r?.id) cloudIds.add(String(r.id));
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return cloudIds;
}

