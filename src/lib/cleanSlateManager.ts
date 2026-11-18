const CLEAN_SLATE_CUTOFF_KEY = "overra_clean_slate_cutoff_v1";
const AUTO_WIPE_EXECUTED_KEY = "overra_clean_slate_auto_wiped_v1";

/**
 * Baseline clean-slate timestamp corresponding to the clean-slate reset request.
 * Any pre-existing course, material, lecture note, topic, quiz, or question created
 * prior to this cutoff is excluded across all queries, while newly created records
 * pass through immediately.
 */
export const BASELINE_CLEAN_SLATE_ISO = "2026-11-18T02:20:00.000Z";

export function getCleanSlateCutoff(): string {
  if (typeof window === "undefined") {
    return BASELINE_CLEAN_SLATE_ISO;
  }
  try {
    const stored = localStorage.getItem(CLEAN_SLATE_CUTOFF_KEY);
    if (stored && stored > BASELINE_CLEAN_SLATE_ISO) {
      return stored;
    }
    localStorage.setItem(CLEAN_SLATE_CUTOFF_KEY, BASELINE_CLEAN_SLATE_ISO);
  } catch {
    // ignore storage access issues
  }
  return BASELINE_CLEAN_SLATE_ISO;
}

export function setCleanSlateCutoff(isoTimestamp: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLEAN_SLATE_CUTOFF_KEY, isoTimestamp);
  } catch {
    // ignore
  }
}

export function clearAllBrowserStudyCaches(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [
      "overra_offline_courses_v1",
      "overra_offline_pack",
      "overra_active_cbt_checkpoint",
      "overra_builtin_pack_hidden_courses",
      "overra_recently_opened_courses",
    ];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k.startsWith("cbt_quiz_") ||
          k.startsWith("cbt_checkpoint_") ||
          k.startsWith("offline_quiz_") ||
          k.startsWith("overra_rls_mirror_") ||
          k.startsWith("course_"))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }

  // Clear IndexedDB offline caches if present
  try {
    if (typeof indexedDB !== "undefined") {
      indexedDB.deleteDatabase("overra_offline_library_v1");
      indexedDB.deleteDatabase("overra_offline_quiz_db");
      indexedDB.deleteDatabase("overra-offline-quizzes");
    }
  } catch {
    // ignore
  }
}

/**
 * Executes a full clean-slate purge across:
 * 1. Express Server Store (`POST /api/materials/reset-all`)
 * 2. Supabase PostgreSQL tables (`quiz_questions`, `questions`, `quizzes`, `study_materials`, `lecture_notes`, `topics`, `student_courses`, `courses`)
 * 3. Browser localStorage & IndexedDB study/CBT caches
 * 4. Clean-slate cutoff timestamp (so any RLS/FK-protected legacy rows are also hidden immediately)
 */
export async function executeFullCleanSlateWipe(supabaseClient: any): Promise<{
  ok: boolean;
  cutoffIso: string;
}> {
  // Set cutoff 3 seconds before current time so newly created items right after reset pass `gte`
  const newCutoff = new Date(Date.now() - 3000).toISOString();
  setCleanSlateCutoff(newCutoff);
  clearAllBrowserStudyCaches();

  // 1. Wipe Express Server materials JSON + uploaded PDF files
  try {
    await fetch("/api/materials/reset-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cutoffIso: newCutoff }),
    });
  } catch (err) {
    console.warn("Server materials reset notice:", err);
  }

  // 2. Cascade delete across Supabase PostgreSQL tables
  const tablesInDeleteOrder = [
    "quiz_questions",
    "questions",
    "quizzes",
    "study_materials",
    "lecture_notes",
    "topics",
    "student_courses",
    "courses",
  ];

  for (const table of tablesInDeleteOrder) {
    try {
      await supabaseClient
        .from(table)
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
    } catch {
      // Continue cascade if RLS or FK constraint blocks physical delete on a row
    }
  }

  // Also soft-deactivate any courses or quizzes that had foreign key references
  try {
    await supabaseClient
      .from("courses")
      .update({ is_active: false })
      .lt("created_at", newCutoff);
  } catch {
    // ignore
  }

  try {
    await supabaseClient
      .from("quizzes")
      .update({ is_active: false })
      .lt("created_at", newCutoff);
  } catch {
    // ignore
  }

  return { ok: true, cutoffIso: newCutoff };
}

/**
 * Ensures the automatic one-time clean-slate wipe runs immediately on startup
 * so existing courses, materials, notes, and quizzes are purged automatically.
 */
export async function ensureAutoCleanSlateWipeOnStartup(supabaseClient: any): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const alreadyWiped = localStorage.getItem(AUTO_WIPE_EXECUTED_KEY);
    if (alreadyWiped === "done_v1") {
      return;
    }
    localStorage.setItem(AUTO_WIPE_EXECUTED_KEY, "done_v1");
    await executeFullCleanSlateWipe(supabaseClient);
  } catch (err) {
    console.warn("Auto clean-slate startup notice:", err);
  }
}

export type AcademicSemester = "1st" | "2nd";

const COURSE_SEMESTER_MAP_KEY = "overra_course_semester_map_v1";

export function setCourseSemester(courseId: string, semester: AcademicSemester): void {
  if (typeof window === "undefined" || !courseId) return;
  try {
    const raw = localStorage.getItem(COURSE_SEMESTER_MAP_KEY);
    const map: Record<string, AcademicSemester> = raw ? JSON.parse(raw) : {};
    map[courseId] = semester;
    localStorage.setItem(COURSE_SEMESTER_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

/**
 * Determines whether a course belongs to 1st Semester or 2nd Semester:
 * 1. Checks explicit admin assignment in localStorage or description tag (`[1st Semester]` / `[2nd Semester]`)
 * 2. Falls back to Nigerian university course code convention (odd last digit = 1st Semester, even last digit = 2nd Semester)
 */
export function resolveCourseSemester(course: {
  id?: string;
  code?: string | null;
  description?: string | null;
  semester?: string | null;
}): AcademicSemester {
  if (course.semester === "1st" || course.semester === "2nd") {
    return course.semester;
  }

  if (typeof window !== "undefined" && course.id) {
    try {
      const raw = localStorage.getItem(COURSE_SEMESTER_MAP_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        if (map[course.id] === "1st" || map[course.id] === "2nd") {
          return map[course.id];
        }
      }
    } catch {
      // ignore
    }
  }

  const desc = (course.description || "").toLowerCase();
  if (desc.includes("2nd semester") || desc.includes("second semester") || desc.includes("rain semester")) {
    return "2nd";
  }
  if (desc.includes("1st semester") || desc.includes("first semester") || desc.includes("harmattan semester")) {
    return "1st";
  }

  const code = (course.code || "").trim();
  const digitsMatch = code.match(/(\d)\D*$/);
  if (digitsMatch) {
    const lastDigit = parseInt(digitsMatch[1], 10);
    if (!isNaN(lastDigit)) {
      return lastDigit % 2 === 0 ? "2nd" : "1st";
    }
  }

  return "1st";
}

