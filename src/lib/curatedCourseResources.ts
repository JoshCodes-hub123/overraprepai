export interface CuratedFormulaItem {
  title: string;
  expression: string;
  applicationNote: string;
}

export interface CuratedStudyNote {
  id: string;
  title: string;
  topicName: string;
  readMinutes: number;
  summary: string;
  keyTakeaways: string[];
  examTrap: string;
}

export interface CuratedSyllabusTopic {
  id: string;
  name: string;
  summary: string;
  questionCount: number;
}

export interface CuratedPracticeQuestion {
  id: string;
  topic: string;
  question: string;
  formula?: string;
  options: { label: "A" | "B" | "C" | "D"; text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface CuratedCoursePack {
  disciplineLabel: string;
  formulas: CuratedFormulaItem[];
  notes: CuratedStudyNote[];
  topics: CuratedSyllabusTopic[];
  questions: CuratedPracticeQuestion[];
}

/**
 * Clean-Slate Curriculum Pack:
 * Returns 100% empty starter arrays so every course page shows only real
 * admin-uploaded PDFs, pasted lecture notes, syllabus topics, and CBT exams.
 */
export function getCuratedCoursePack(
  _courseCode?: string | null,
  _courseName?: string | null
): CuratedCoursePack {
  return {
    disciplineLabel: "Official Course Curriculum",
    formulas: [],
    notes: [],
    topics: [],
    questions: [],
  };
}

const HIDDEN_BUILTIN_PACKS_KEY = "overra_builtin_pack_hidden_courses";

export function getHiddenBuiltInPackCourseIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HIDDEN_BUILTIN_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isBuiltInPackHidden(courseId?: string | null): boolean {
  if (!courseId) return true;
  return true;
}

export function setBuiltInPackHidden(courseId: string, hidden: boolean): void {
  if (typeof window === "undefined" || !courseId) return;
  try {
    const current = new Set(getHiddenBuiltInPackCourseIds());
    if (hidden) {
      current.add(courseId);
    } else {
      current.delete(courseId);
    }
    localStorage.setItem(HIDDEN_BUILTIN_PACKS_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage errors
  }
}
