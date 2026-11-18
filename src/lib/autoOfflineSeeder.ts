import { getCuratedCoursePack } from "@/lib/curatedCourseResources";
import { saveOfflineSet, type OfflineQuestion } from "@/lib/offlineQuizStore";

export interface CachedCourseMetadata {
  id: string;
  code: string;
  name: string;
  department?: string | null;
  level?: string | null;
  formulaCount: number;
  noteCount: number;
  questionCount: number;
  cachedAt: number;
}

export interface ActiveCbtCheckpoint {
  quizId: string;
  courseId?: string;
  courseCode: string;
  title: string;
  answeredCount: number;
  totalQuestions: number;
  timeLeftSeconds: number;
  updatedAt: number;
}

const OFFLINE_COURSES_KEY = "overra_offline_courses_v1";
const ACTIVE_CHECKPOINT_KEY = "overra_active_cbt_checkpoint";
const OFFLINE_SUPPORT_QUEUE_KEY = "overra_offline_support_queue";

/**
 * Expanded offline question generator per course using curated discipline questions
 * plus high-yield syllabus variations so every enrolled course has a full 15-question
 * offline CBT pack ready with 0 network required.
 */
export function generateOfflineQuestionsForCourse(
  courseCode?: string | null,
  courseName?: string | null
): OfflineQuestion[] {
  const code = (courseCode || "COURSE 101").toUpperCase().trim();
  const title = courseName || "University Foundation Course";
  const pack = getCuratedCoursePack(code, title);

  const baseQuestions: OfflineQuestion[] = pack.questions.map((q, idx) => {
    const optA = q.options.find((o) => o.label === "A")?.text || "Option A";
    const optB = q.options.find((o) => o.label === "B")?.text || "Option B";
    const optC = q.options.find((o) => o.label === "C")?.text || "Option C";
    const optD = q.options.find((o) => o.label === "D")?.text || "Option D";
    const correct = q.options.find((o) => o.isCorrect)?.label || "A";

    return {
      id: `offline_${code.replace(/\s+/g, "_")}_q_${idx + 1}`,
      question_text: q.question,
      option_a: optA,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      correct_option: correct,
      explanation: q.explanation,
      image_url: null,
      course_name: `${code} — ${title}`,
    };
  });

  // Add formula-application and syllabus-mastery questions from the course's formulas & notes
  const formulaQuestions: OfflineQuestion[] = pack.formulas.map((f, idx) => ({
    id: `offline_${code.replace(/\s+/g, "_")}_f_${idx + 1}`,
    question_text: `In ${code} (${title}), which core expression or rule correctly represents "${f.title}"?`,
    option_a: f.expression,
    option_b: "None of the standard syllabus expressions apply",
    option_c: "It only holds when all variables equal zero",
    option_d: "The inverse ratio with negative constant offset",
    correct_option: "A",
    explanation: `${f.title} is defined by: ${f.expression}. Application note: ${f.applicationNote}`,
    image_url: null,
    course_name: `${code} — ${title}`,
  }));

  const takeawayQuestions: OfflineQuestion[] = pack.notes.flatMap((note, nIdx) =>
    note.keyTakeaways.map((takeaway, tIdx) => ({
      id: `offline_${code.replace(/\s+/g, "_")}_n_${nIdx + 1}_${tIdx + 1}`,
      question_text: `Regarding ${note.topicName} in ${code}, which of the following statements is accurate for semester CBT examinations?`,
      option_a: takeaway,
      option_b: "This principle is never tested in objective CBT papers",
      option_c: "The opposite relationship holds under standard conditions",
      option_d: "All variables are independent of boundary conditions",
      correct_option: "A",
      explanation: `${takeaway} (Exam Trap Reminder: ${note.examTrap})`,
      image_url: null,
      course_name: `${code} — ${title}`,
    }))
  );

  return [...baseQuestions, ...formulaQuestions, ...takeawayQuestions];
}

/**
 * Automatically caches all enrolled courses (Notes, Formulas, and CBT Question Packs)
 * into localStorage and IndexedDB so the student can study and take CBT exams
 * even when mobile data or campus Wi-Fi drops completely.
 */
export async function autoSeedEnrolledCoursesOffline(
  userId: string | undefined,
  courses: Array<{
    id: string;
    code: string;
    name: string;
    department?: string | null;
    level?: string | null;
  }>
): Promise<CachedCourseMetadata[]> {
  if (!courses || courses.length === 0) {
    return getOfflineCachedCourses();
  }

  const savedMeta: CachedCourseMetadata[] = [];

  for (const c of courses) {
    const pack = getCuratedCoursePack(c.code, c.name);
    const offlineQuestions = generateOfflineQuestionsForCourse(c.code, c.name);
    const offlineQuizId = `offline_${c.id}`;

    // 1. Save ready-to-run CBT bundle in localStorage for instant synchronous hydration in CBTSimulation
    try {
      const existingCache = localStorage.getItem(`cbt_quiz_${offlineQuizId}`);
      if (!existingCache) {
        localStorage.setItem(
          `cbt_quiz_${offlineQuizId}`,
          JSON.stringify({
            quiz: {
              id: offlineQuizId,
              title: `${c.code} Offline CBT Simulation Pack`,
              duration_minutes: 25,
              course: {
                code: c.code,
                name: c.name,
              },
            },
            questions: offlineQuestions,
            cachedAt: Date.now(),
          })
        );
      }
    } catch {
      // ignore storage quota errors
    }

    // 2. Also save into IndexedDB offlineQuizStore if userId is available
    if (userId) {
      try {
        await saveOfflineSet(
          {
            id: offlineQuizId,
            title: `${c.code} — ${c.name} (Auto-Saved Offline Pack)`,
            source: "recommended",
            course_name: `${c.code} · ${c.name}`,
            question_count: offlineQuestions.length,
            downloaded_at: Date.now(),
            user_id: userId,
          },
          offlineQuestions
        );
      } catch {
        // IndexedDB optional fallback
      }
    }

    savedMeta.push({
      id: c.id,
      code: c.code,
      name: c.name,
      department: c.department,
      level: c.level,
      formulaCount: pack.formulas.length,
      noteCount: pack.notes.length,
      questionCount: offlineQuestions.length,
      cachedAt: Date.now(),
    });
  }

  try {
    localStorage.setItem(OFFLINE_COURSES_KEY, JSON.stringify(savedMeta));
    localStorage.setItem("overra_offline_pack", "1");
  } catch {
    // ignore
  }

  return savedMeta;
}

export function getOfflineCachedCourses(): CachedCourseMetadata[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_COURSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Builds or retrieves a complete CBT quiz + questions bundle when offline or when
 * a course does not yet have a database quiz row.
 */
export function buildOfflineQuizBundle(
  quizId: string,
  fallbackCourseCode?: string,
  fallbackCourseName?: string
) {
  // Check direct localStorage cache first
  try {
    const direct = localStorage.getItem(`cbt_quiz_${quizId}`);
    if (direct) {
      const parsed = JSON.parse(direct);
      if (parsed?.quiz && Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Check if quizId matches `offline_${courseId}` in cached courses
  const courseId = quizId.startsWith("offline_") ? quizId.replace(/^offline_/, "") : quizId;
  const cachedCourses = getOfflineCachedCourses();
  const matchedCourse = cachedCourses.find((c) => c.id === courseId);

  const code = matchedCourse?.code || fallbackCourseCode || "MTH 101";
  const name = matchedCourse?.name || fallbackCourseName || "University Semester Course";
  const questions = generateOfflineQuestionsForCourse(code, name);

  const bundle = {
    quiz: {
      id: quizId,
      title: `${code} Standard CBT Examination`,
      duration_minutes: 25,
      course: {
        code,
        name,
      },
    },
    questions,
    cachedAt: Date.now(),
  };

  try {
    localStorage.setItem(`cbt_quiz_${quizId}`, JSON.stringify(bundle));
  } catch {
    // ignore
  }

  return bundle;
}

/**
 * Active CBT Exam Checkpoint management so students never lose an interrupted exam.
 */
export function saveActiveCbtCheckpoint(checkpoint: ActiveCbtCheckpoint) {
  try {
    localStorage.setItem(ACTIVE_CHECKPOINT_KEY, JSON.stringify(checkpoint));
  } catch {
    // ignore
  }
}

export function getActiveCbtCheckpoint(): ActiveCbtCheckpoint | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CHECKPOINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCbtCheckpoint;
    // Expire checkpoints older than 24 hours
    if (Date.now() - parsed.updatedAt > 1000 * 60 * 60 * 24) {
      localStorage.removeItem(ACTIVE_CHECKPOINT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveCbtCheckpoint(quizId?: string) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!quizId) {
      localStorage.removeItem(ACTIVE_CHECKPOINT_KEY);
      return;
    }
    const current = getActiveCbtCheckpoint();
    if (!current || current.quizId === quizId) {
      localStorage.removeItem(ACTIVE_CHECKPOINT_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Offline-resilient Student Support report queue
 */
export interface QueuedSupportReport {
  id: string;
  category: string;
  message: string;
  path: string;
  createdAt: string;
  userId?: string | null;
}

export function queueOfflineSupportReport(report: Omit<QueuedSupportReport, "id" | "createdAt">) {
  try {
    const existingRaw = localStorage.getItem(OFFLINE_SUPPORT_QUEUE_KEY);
    const list: QueuedSupportReport[] = existingRaw ? JSON.parse(existingRaw) : [];
    list.push({
      ...report,
      id: `sr_${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_SUPPORT_QUEUE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getQueuedSupportReports(): QueuedSupportReport[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SUPPORT_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearQueuedSupportReports() {
  try {
    localStorage.removeItem(OFFLINE_SUPPORT_QUEUE_KEY);
  } catch {
    // ignore
  }
}
