import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  X,
  FolderUp,
  Database,
  Plus,
  Trash2,
  Pencil,
  Eye,
  RefreshCw,
  Search,
  BookOpen,
  ClipboardList,
  Check,
  Calendar,
  ArrowRight,
  Sparkles,
  Download,
  Layers,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  supabase,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";
import {
  executeFullCleanSlateWipe,
  executeMaterialsOnlyWipe,
  resolveCourseSemester,
  setCourseSemester,
  type AcademicSemester,
} from "@/lib/cleanSlateManager";
import {
  uploadLargeFileChunked,
  formatBytesReadable,
} from "@/lib/chunkedFileUploader";
import { InAppDocViewer } from "@/components/viewer/InAppDocViewer";
import {
  uploadFileToSupabaseStorage,
  verifyMaterialAccessible,
} from "@/lib/pdfResolver";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";
import {
  resolveCanonicalCourseUuid,
  persistMaterialToLiveSupabase,
  fetchDirectCloudMaterialIds,
  courseCodeToDeterministicUuid,
  normalizeCourseCode,
} from "@/lib/courseIdentity";

interface CourseRecord {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  description?: string | null;
  university?: string | null;
  semester: AcademicSemester;
}

interface QueuedFileItem {
  id: string;
  file: File;
  title: string;
  description: string;
  sizeLabel: string;
  ext: string;
  status: "pending" | "uploading" | "success" | "error";
  progressPercent?: number;
  progressLabel?: string;
  errorMessage?: string;
  verifiedBucket?: string;
  verifiedBytes?: number;
  publishedRow?: ManagedMaterialRow;
}

export interface ManagedMaterialRow {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  semester: AcademicSemester;
  level: string;
  title: string;
  description: string | null;
  file_url: string;
  file_path?: string | null;
  file_type: string;
  file_size: number;
  source: "supabase+server" | "supabase" | "server";
  created_at: string;
}

export interface ParsedQuestionItem {
  id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface ManagedQuizRow {
  id: string;
  course_id: string;
  course_code: string;
  course_name: string;
  semester: AcademicSemester;
  level: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
  created_at: string;
  source: "supabase+server" | "supabase" | "server";
  questions: ParsedQuestionItem[];
}

interface UploadedCsvBatchFile {
  id: string;
  filename: string;
  questionCount: number;
  questions: ParsedQuestionItem[];
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Parses either CSV lines (`question,option_a,option_b,option_c,option_d,correct_option,explanation`)
 * or structured plain text blocks (`Q: ... A) ... B) ... C) ... D) ... ANS: B`)
 */
export function parseQuestionsInput(raw: string): ParsedQuestionItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const results: ParsedQuestionItem[] = [];

  if (
    /^(?:Q\d*[:.)]|Question\s*\d*[:.)]|\d+[.)]\s+)/im.test(trimmed) &&
    /\b(?:ANS|ANSWER|CORRECT)\s*[:=\-]/i.test(trimmed)
  ) {
    const blocks = trimmed.split(/\n\s*\n+/);
    for (const block of blocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 3) continue;

      let question_text = "";
      let option_a = "";
      let option_b = "";
      let option_c = "";
      let option_d = "";
      let correct_option: "A" | "B" | "C" | "D" = "A";
      let explanation = "";

      for (const line of lines) {
        const optMatch = line.match(/^([A-D])[).:\-\s]+\s*(.+)$/i);
        const ansMatch = line.match(/^(?:ANS|ANSWER|CORRECT)\s*[:=\-]\s*([A-D])/i);
        const expMatch = line.match(/^(?:EXP|EXPLANATION|SOLUTION)\s*[:=\-]\s*(.+)$/i);

        if (ansMatch) {
          correct_option = ansMatch[1].toUpperCase() as "A" | "B" | "C" | "D";
        } else if (expMatch) {
          explanation = expMatch[1].trim();
        } else if (optMatch) {
          const letter = optMatch[1].toUpperCase();
          const val = optMatch[2].trim();
          if (letter === "A") option_a = val;
          if (letter === "B") option_b = val;
          if (letter === "C") option_c = val;
          if (letter === "D") option_d = val;
        } else if (!question_text) {
          question_text = line
            .replace(/^(?:Q\d*|Question\s*\d*|\d+)[).:\-\s]+/i, "")
            .trim();
        }
      }

      if (question_text && option_a && option_b) {
        results.push({
          question_text,
          option_a,
          option_b,
          option_c: option_c || "None of the above",
          option_d: option_d || "All of the above",
          correct_option,
          explanation: explanation || "Verified syllabus solution.",
        });
      }
    }
    if (results.length > 0) return results;
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i]
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((cell) => cell.trim().replace(/^"|"$/g, ""));

    if (row.length < 5) continue;
    if (i === 0 && /question/i.test(row[0]) && /option/i.test(row[1])) continue;

    const [qText, a, b, c, d, ansRaw, expRaw] = row;
    const ansClean = (ansRaw || "A").trim().toUpperCase();
    const validAns: "A" | "B" | "C" | "D" =
      ansClean === "B" || ansClean === "C" || ansClean === "D" ? ansClean : "A";

    if (qText && a && b) {
      results.push({
        question_text: qText,
        option_a: a,
        option_b: b,
        option_c: c || "Option C",
        option_d: d || "Option D",
        correct_option: validAns,
        explanation: expRaw || "Standard syllabus solution.",
      });
    }
  }

  return results;
}

export const QuickResourceUpload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const adminEnv = useAdminEnvironment();
  const activeInstitution = adminEnv.current.institution || "FUTA";

  // Step 1: Academic Session Semester ("1st" or "2nd") & Level Filter
  const urlSem = searchParams.get("semester");
  const [activeSemester, setActiveSemester] = useState<AcademicSemester>(
    urlSem === "2nd" ? "2nd" : "1st"
  );
  const [activeLevel, setActiveLevel] = useState<string>("all");

  useEffect(() => {
    const semParam = searchParams.get("semester");
    if (semParam === "1st" || semParam === "2nd") {
      setActiveSemester(semParam);
    }
  }, [searchParams]);

  // Step 2: Courses & Selected Course State
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [, setLoadingCourses] = useState(false);

  // Quick Create Course Inline Form State
  const [showNewCourseForm, setShowNewCourseForm] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseDept, setNewCourseDept] = useState("General Studies");
  const [newCourseLevel, setNewCourseLevel] = useState("100");
  const [newCourseSemester, setNewCourseSemester] = useState<AcademicSemester>("1st");
  const [creatingCourse, setCreatingCourse] = useState(false);

  useEffect(() => {
    setNewCourseSemester(activeSemester);
  }, [activeSemester]);

  // Step 3: 3-Mode Uploader Tabs: "pdf" | "note" | "questions"
  const [uploadMode, setUploadMode] = useState<"pdf" | "note" | "questions">("pdf");

  // Mode 1: PDF / Document Batch Queue
  const [fileQueue, setFileQueue] = useState<QueuedFileItem[]>([]);
  const [isPublishingFiles, setIsPublishingFiles] = useState(false);

  // Mode 2: Paste Summary Notes & Formulas
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSummary, setNoteSummary] = useState("");
  const [noteFormulas, setNoteFormulas] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Mode 3: Bulk CBT Quiz Studio (Multi-file CSV/TXT + Bulk Copy-Paste + AI Note-to-Quiz + Auto-Split)
  const [quizInputMethod, setQuizInputMethod] = useState<"csv" | "paste" | "ai">("csv");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDuration, setQuizDuration] = useState("25");
  const [quizPackagingMode, setQuizPackagingMode] = useState<"single" | "split">("single");
  const [quizSplitSize, setQuizSplitSize] = useState<number>(25);

  const [csvBatchFiles, setCsvBatchFiles] = useState<UploadedCsvBatchFile[]>([]);
  const [questionsRawText, setQuestionsRawText] = useState("");
  const [aiStagedQuestions, setAiStagedQuestions] = useState<ParsedQuestionItem[]>([]);
  const [removedStagedIndices, setRemovedStagedIndices] = useState<Set<number>>(new Set());
  const [showStagedPreview, setShowStagedPreview] = useState(true);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  // AI Note-to-Quiz Generator State
  const [selectedSourceNoteId, setSelectedSourceNoteId] = useState<string>("custom");
  const [customAiNoteText, setCustomAiNoteText] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(10);
  const [isGeneratingAiQuiz, setIsGeneratingAiQuiz] = useState(false);

  // Step 4: Dual-Tab Inventory Manager ("materials" | "quizzes")
  const [inventoryTab, setInventoryTab] = useState<"materials" | "quizzes">("materials");
  const [materials, setMaterials] = useState<ManagedMaterialRow[]>([]);
  const [quizzesList, setQuizzesList] = useState<ManagedQuizRow[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [managerSemesterFilter, setManagerSemesterFilter] = useState<"all" | AcademicSemester>(
    "all"
  );
  const [managerCourseFilter, setManagerCourseFilter] = useState<string>("all");
  const [managerSearch, setManagerSearch] = useState("");
  const [previewRow, setPreviewRow] = useState<ManagedMaterialRow | null>(null);
  const [replacingRow, setReplacingRow] = useState<ManagedMaterialRow | null>(null);
  const [replacingBusyId, setReplacingBusyId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, { ok: boolean; label: string }>>({});
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Material Dialog State
  const [editingItem, setEditingItem] = useState<ManagedMaterialRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCourseId, setEditCourseId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Inspect / Preview Published Quiz Questions Modal State
  const [inspectingQuiz, setInspectingQuiz] = useState<ManagedQuizRow | null>(null);
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false);

  // Edit Published Quiz Modal State
  const [editingQuiz, setEditingQuiz] = useState<ManagedQuizRow | null>(null);
  const [editQuizTitle, setEditQuizTitle] = useState("");
  const [editQuizDuration, setEditQuizDuration] = useState("25");
  const [editQuizCourseId, setEditQuizCourseId] = useState("");
  const [savingQuizEdit, setSavingQuizEdit] = useState(false);

  // Confirm Wipe Dialog States
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false);
  const [isWipingAll, setIsWipingAll] = useState(false);
  const [confirmMaterialsWipeOpen, setConfirmMaterialsWipeOpen] = useState(false);
  const [isWipingMaterials, setIsWipingMaterials] = useState(false);

  // Database Sync Stats
  const [dbStats, setDbStats] = useState({
    coursesCount: 0,
    supabaseMaterialsCount: 0,
    serverMaterialsCount: 0,
    quizzesCount: 0,
    questionsCount: 0,
  });
  const [syncingDb, setSyncingDb] = useState(false);

  // Filter courses matching Step 1 (Semester + optional Level)
  const semesterCourses = useMemo(() => {
    return courses.filter((c) => {
      if (c.semester !== activeSemester) return false;
      if (activeLevel !== "all" && String(c.level || "").replace(/\D/g, "") !== activeLevel) {
        return false;
      }
      return true;
    });
  }, [courses, activeSemester, activeLevel]);

  const firstSemCoursesCount = useMemo(
    () => courses.filter((c) => c.semester === "1st").length,
    [courses]
  );
  const secondSemCoursesCount = useMemo(
    () => courses.filter((c) => c.semester === "2nd").length,
    [courses]
  );

  useEffect(() => {
    if (semesterCourses.length > 0) {
      if (!semesterCourses.some((c) => c.id === selectedCourseId)) {
        setSelectedCourseId(semesterCourses[0].id);
      }
    } else {
      setSelectedCourseId("");
    }
  }, [semesterCourses, selectedCourseId]);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  );

  // Notes uploaded for the currently selected course (for AI Quiz Generator dropdown)
  const selectedCourseNotes = useMemo(() => {
    if (!selectedCourseId) return [];
    return materials.filter(
      (m) =>
        m.course_id === selectedCourseId &&
        (Boolean(m.description && m.description.trim().length > 20) ||
          m.file_type === "markdown" ||
          m.file_type === "pdf")
    );
  }, [materials, selectedCourseId]);

  // Auto-select first note if available when switching to AI generator
  useEffect(() => {
    if (selectedCourseNotes.length > 0 && selectedSourceNoteId === "custom") {
      setSelectedSourceNoteId(selectedCourseNotes[0].id);
    }
  }, [selectedCourseNotes, selectedSourceNoteId]);

  // 1. Load Courses from Server Store (/api/courses) + Supabase
  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const mergedById = new Map<string, CourseRecord>();

      try {
        const srvRes = await fetch("/api/courses");
        if (srvRes.ok) {
          const srvJson = await srvRes.json();
          if (Array.isArray(srvJson.courses)) {
            for (const row of srvJson.courses) {
              if (row && row.is_active !== false) {
                mergedById.set(row.id, {
                  id: row.id,
                  code: row.code,
                  name: row.name,
                  department: row.department || "General Studies",
                  level: row.level || "100",
                  description: row.description,
                  university: row.university,
                  semester: resolveCourseSemester(row),
                });
              }
            }
          }
        }
      } catch {
        // ignore
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, code, name, department, level, description, university")
        .eq("is_active", true)
        .order("code", { ascending: true })
        .limit(400);

      if (!error && Array.isArray(data)) {
        for (const row of data as any[]) {
          if (!mergedById.has(row.id)) {
            mergedById.set(row.id, {
              id: row.id,
              code: row.code,
              name: row.name,
              department: row.department,
              level: row.level,
              description: row.description,
              university: row.university,
              semester: resolveCourseSemester(row),
            });
          }
        }
      }

      setCourses(
        Array.from(mergedById.values()).sort((a, b) => a.code.localeCompare(b.code))
      );
    } catch (err) {
      console.warn("Could not load courses:", err);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  // 2. Load All Current Materials & Published Quizzes (Supabase + Server Store)
  const loadMaterialsAndStats = useCallback(async () => {
    setLoadingMaterials(true);
    try {
      const courseMap = new Map<string, CourseRecord>();
      courses.forEach((c) => {
        courseMap.set(c.id, c);
        const detUuid = courseCodeToDeterministicUuid(c.code);
        if (detUuid && !courseMap.has(detUuid)) {
          courseMap.set(detUuid, c);
        }
        const normCode = normalizeCourseCode(c.code);
        if (normCode && !courseMap.has(normCode)) {
          courseMap.set(normCode, c);
        }
      });

      const resolveCourseMeta = (cid?: string | null, rawCode?: string | null) => {
        if (cid && courseMap.has(cid)) return courseMap.get(cid);
        const norm = normalizeCourseCode(rawCode || cid);
        if (norm && courseMap.has(norm)) return courseMap.get(norm);
        const det = courseCodeToDeterministicUuid(rawCode || cid);
        if (det && courseMap.has(det)) return courseMap.get(det);
        return undefined;
      };

      let serverList: any[] = [];
      let serverQuizzes: any[] = [];

      await Promise.allSettled([
        fetch("/api/materials")
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json && Array.isArray(json.materials)) serverList = json.materials;
          }),
        fetch("/api/quizzes")
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json && Array.isArray(json.quizzes)) serverQuizzes = json.quizzes;
          }),
      ]);

      const [smRes, lnRes, dbQuizzesRes, qCountRes, directCloudIds] = await Promise.all([
        supabase
          .from("study_materials")
          .select("id, course_id, title, description, file_url, file_path, file_type, file_size, created_at")
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("lecture_notes")
          .select(
            "id, course_id, title, description, file_url, file_path, file_type, file_size_bytes, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(300),
        supabase
          .from("quizzes")
          .select(
            "id, course_id, title, description, duration_minutes, question_count, is_active, created_at"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(300),
        supabase.from("questions").select("id", { count: "exact", head: true }),
        fetchDirectCloudMaterialIds(supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY),
      ]);

      const dbStudyMats = smRes.data || [];
      const dbLectureNotes = lnRes.data || [];
      const dbQuizzes = dbQuizzesRes.data || [];

      // Merge Materials
      const mergedMats = new Map<string, ManagedMaterialRow>();

      for (const m of serverList) {
        const cObj = resolveCourseMeta(m.course_id, m.course_code);
        const code = m.course_code || cObj?.code || "COURSE";
        mergedMats.set(m.id, {
          id: m.id,
          course_id: m.course_id,
          course_code: code,
          course_name: cObj?.name || "University Course",
          semester: cObj?.semester || resolveCourseSemester({ id: m.course_id, code }),
          level: cObj?.level ? `${String(cObj.level).replace(/\D/g, "")}L` : "100L",
          title: m.title,
          description: m.description ?? null,
          file_url: m.file_url || "",
          file_path: m.file_path ?? null,
          file_type: m.file_type || "pdf",
          file_size: m.file_size || 0,
          source: directCloudIds.has(m.id) ? "supabase+server" : "server",
          created_at: m.created_at || new Date().toISOString(),
        });
      }

      for (const m of dbStudyMats as any[]) {
        const cObj = resolveCourseMeta(m.course_id, m.course_code);
        const existing = mergedMats.get(m.id);
        const code = cObj?.code || existing?.course_code || "COURSE";
        const isLiveInCloud = directCloudIds.has(m.id);
        mergedMats.set(m.id, {
          id: m.id,
          course_id: m.course_id,
          course_code: code,
          course_name: cObj?.name || existing?.course_name || "University Course",
          semester: cObj?.semester || resolveCourseSemester({ id: m.course_id, code }),
          level: cObj?.level ? `${String(cObj.level).replace(/\D/g, "")}L` : "100L",
          title: m.title,
          description: m.description ?? null,
          file_url: m.file_url || existing?.file_url || "",
          file_path: m.file_path ?? existing?.file_path ?? null,
          file_type: m.file_type || "pdf",
          file_size: m.file_size || 0,
          source: isLiveInCloud ? (existing ? "supabase+server" : "supabase") : "server",
          created_at: m.created_at || new Date().toISOString(),
        });
      }

      for (const ln of dbLectureNotes as any[]) {
        const existing = mergedMats.get(ln.id);
        const isLiveInCloud = directCloudIds.has(ln.id);
        if (!existing) {
          const cObj = resolveCourseMeta(ln.course_id, ln.course_code);
          const code = cObj?.code || "COURSE";
          mergedMats.set(ln.id, {
            id: ln.id,
            course_id: ln.course_id,
            course_code: code,
            course_name: cObj?.name || "University Course",
            semester: cObj?.semester || resolveCourseSemester({ id: ln.course_id, code }),
            level: cObj?.level ? `${String(cObj.level).replace(/\D/g, "")}L` : "100L",
            title: ln.title,
            description: ln.description ?? null,
            file_url: ln.file_url || "",
            file_path: ln.file_path ?? null,
            file_type: ln.file_type || "pdf",
            file_size: ln.file_size_bytes || 0,
            source: isLiveInCloud ? "supabase" : "server",
            created_at: ln.created_at || new Date().toISOString(),
          });
        } else if (isLiveInCloud && existing.source === "server") {
          existing.source = "supabase+server";
        }
      }

      const allMatRows = Array.from(mergedMats.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setMaterials(allMatRows);

      // Merge Quizzes (Server Store + Supabase)
      const mergedQuizzes = new Map<string, ManagedQuizRow>();

      for (const sq of serverQuizzes) {
        const cObj = courseMap.get(sq.course_id);
        const code = sq.course_code || cObj?.code || "COURSE";
        const qList = Array.isArray(sq.questions) ? sq.questions : [];
        mergedQuizzes.set(sq.id, {
          id: sq.id,
          course_id: sq.course_id,
          course_code: code,
          course_name: sq.course_name || cObj?.name || "University Course",
          semester:
            sq.semester === "1st" || sq.semester === "2nd"
              ? sq.semester
              : cObj?.semester || resolveCourseSemester({ id: sq.course_id, code }),
          level: cObj?.level ? `${String(cObj.level).replace(/\D/g, "")}L` : sq.level || "100L",
          title: sq.title,
          description: sq.description ?? null,
          duration_minutes: Number(sq.duration_minutes) || 25,
          question_count: qList.length || Number(sq.question_count) || 0,
          created_at: sq.created_at || new Date().toISOString(),
          source: "server",
          questions: qList,
        });
      }

      for (const dq of dbQuizzes as any[]) {
        const cObj = courseMap.get(dq.course_id);
        const existing = mergedQuizzes.get(dq.id);
        const code = cObj?.code || existing?.course_code || "COURSE";
        mergedQuizzes.set(dq.id, {
          id: dq.id,
          course_id: dq.course_id,
          course_code: code,
          course_name: cObj?.name || existing?.course_name || "University Course",
          semester:
            cObj?.semester ||
            existing?.semester ||
            resolveCourseSemester({ id: dq.course_id, code, description: dq.description }),
          level: cObj?.level ? `${String(cObj.level).replace(/\D/g, "")}L` : "100L",
          title: dq.title,
          description: dq.description ?? existing?.description ?? null,
          duration_minutes: Number(dq.duration_minutes) || existing?.duration_minutes || 25,
          question_count:
            Number(dq.question_count) || existing?.question_count || existing?.questions.length || 0,
          created_at: dq.created_at || existing?.created_at || new Date().toISOString(),
          source: existing ? "supabase+server" : "supabase",
          questions: existing?.questions || [],
        });
      }

      const allQuizRows = Array.from(mergedQuizzes.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setQuizzesList(allQuizRows);

      const serverQuestionTotal = allQuizRows.reduce((sum, q) => sum + (q.question_count || 0), 0);

      setDbStats({
        coursesCount: courses.length,
        supabaseMaterialsCount: dbStudyMats.length + dbLectureNotes.length,
        serverMaterialsCount: serverList.length,
        quizzesCount: allQuizRows.length,
        questionsCount: Math.max(qCountRes.count ?? 0, serverQuestionTotal),
      });
    } catch (err) {
      console.warn("Failed loading materials & quizzes manager:", err);
    } finally {
      setLoadingMaterials(false);
    }
  }, [courses]);

  useEffect(() => {
    void loadCourses();
  }, [loadCourses]);

  useEffect(() => {
    void loadMaterialsAndStats();
  }, [loadMaterialsAndStats]);

  // Quick Create Course in Server Store (`/api/courses`) + Supabase `courses` with explicit 1st / 2nd Semester assignment
  const handleCreateCourse = async () => {
    const code = newCourseCode.trim().toUpperCase();
    const name = newCourseName.trim();
    if (!code || !name) {
      toast.error(
        "Please enter both Course Code (e.g. MTH 101) and Course Title (e.g. Elementary Mathematics I)."
      );
      return;
    }

    setCreatingCourse(true);
    try {
      const semLabel =
        newCourseSemester === "1st" ? "1st Semester (Harmattan)" : "2nd Semester (Rain)";
      const generatedId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const coursePayload = {
        id: generatedId,
        code,
        name,
        department: newCourseDept.trim() || "General Studies",
        level: newCourseLevel,
        semester: newCourseSemester,
        description: `[${semLabel}] ${name} (${code})`,
        university: activeInstitution,
        environment_type: "university",
        is_active: true,
      };

      // 1. Persist directly to Server Store (`/api/courses`)
      let finalCourse: any = coursePayload;
      try {
        const srvRes = await fetch("/api/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(coursePayload),
        });
        if (srvRes.ok) {
          const srvJson = await srvRes.json();
          if (srvJson.course) {
            finalCourse = srvJson.course;
          }
        }
      } catch {
        // non-fatal
      }

      // 2. Sync with Supabase (automatically bridged via RLS-resilient client if RLS is active)
      try {
        const { data } = await (supabase as any)
          .from("courses")
          .insert({
            id: finalCourse.id,
            code: finalCourse.code,
            name: finalCourse.name,
            department: finalCourse.department,
            level: finalCourse.level,
            description: finalCourse.description,
            university: finalCourse.university,
            environment_type: "university",
            is_active: true,
          })
          .select("id, code, name, department, level, description, university")
          .single();

        if (data && data.id) {
          finalCourse = { ...finalCourse, ...data };
        }
      } catch {
        // Handled by server store + local mirror
      }

      setCourseSemester(finalCourse.id, newCourseSemester);
      const created: CourseRecord = {
        id: finalCourse.id,
        code: finalCourse.code,
        name: finalCourse.name,
        department: finalCourse.department,
        level: finalCourse.level,
        description: finalCourse.description,
        university: finalCourse.university,
        semester: newCourseSemester,
      };

      setCourses((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setActiveSemester(newCourseSemester);
      setSelectedCourseId(created.id);
      setShowNewCourseForm(false);
      setNewCourseCode("");
      setNewCourseName("");
      void queryClient.invalidateQueries();
      toast.success(
        `Added "${created.code} — ${created.name}" under ${semLabel}! Ready to upload materials or quizzes.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not create course.");
    } finally {
      setCreatingCourse(false);
    }
  };

  // Helper: Resolve a guaranteed valid Supabase UUID for a course (never returns a non-UUID slug)
  const resolveSupabaseCourseUuid = async (
    courseId: string,
    courseCode: string,
    courseMeta?: { name?: string | null; department?: string | null; level?: string | null }
  ): Promise<string> => {
    return resolveCanonicalCourseUuid(supabase, {
      courseId,
      courseCode,
      courseName: courseMeta?.name || selectedCourse?.name,
      department: courseMeta?.department || selectedCourse?.department,
      level: courseMeta?.level || selectedCourse?.level,
      university: activeInstitution,
    });
  };

  // Helper: Persist a verified material directly to live Supabase PostgreSQL (`study_materials` & `lecture_notes`) + Server mirror
  const persistMaterialDualSync = async (params: {
    id?: string;
    courseId: string;
    courseCode: string;
    courseName?: string | null;
    department?: string | null;
    level?: string | null;
    title: string;
    description: string;
    fileUrl: string;
    filePath?: string | null;
    storageBucket?: string | null;
    verified?: boolean;
    fileType: string;
    fileSize: number;
  }): Promise<{ id: string; courseUuid: string; cloudSynced: boolean; cloudError?: string }> => {
    const matId =
      params.id ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `mat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    let authUid = user?.id ?? null;
    if (!authUid) {
      try {
        const { data } = await supabase.auth.getUser();
        authUid = data?.user?.id ?? null;
      } catch {
        authUid = null;
      }
    }

    const dbCourseId = await resolveSupabaseCourseUuid(params.courseId, params.courseCode, {
      name: params.courseName,
      department: params.department,
      level: params.level,
    });
    const safeFilePath =
      params.filePath ||
      `${authUid || "admin"}/${dbCourseId}/${Date.now()}_${params.title.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    // 1. Direct write to live Supabase PostgreSQL (bypasses localStorage fake-201 mirror)
    const cloudWrite = await persistMaterialToLiveSupabase(
      supabase,
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        id: matId,
        courseId: dbCourseId,
        courseCode: params.courseCode,
        courseName: params.courseName || selectedCourse?.name,
        department: params.department || selectedCourse?.department,
        level: params.level || selectedCourse?.level,
        university: activeInstitution,
        title: params.title,
        description: params.description,
        fileUrl: params.fileUrl,
        filePath: safeFilePath,
        fileType: params.fileType,
        fileSize: params.fileSize,
        userId: authUid,
        isPublished: true,
      }
    );

    // 2. Non-fatal mirror to local Express server store for Preview fast-cache
    try {
      await fetch(`/api/courses/${encodeURIComponent(cloudWrite.courseUuid)}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: matId,
          course_id: cloudWrite.courseUuid,
          course_code: params.courseCode,
          title: params.title,
          description: params.description,
          file_url: params.fileUrl,
          file_path: safeFilePath,
          storage_bucket: params.storageBucket ?? null,
          verified: Boolean(params.verified),
          file_type: params.fileType,
          file_size: params.fileSize,
          visibility: "public",
        }),
      });
    } catch {
      // non-fatal
    }

    return {
      id: matId,
      courseUuid: cloudWrite.courseUuid,
      cloudSynced: cloudWrite.ok,
      cloudError: cloudWrite.error,
    };
  };

  // Mode 1 Handler: Select PDFs/Docs (Supports bulk multi-file selection with live cloud verification)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const semTag = activeSemester === "1st" ? "1st Semester" : "2nd Semester";
    const items: QueuedFileItem[] = Array.from(rawFiles).map((file, idx) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
      return {
        id: `${Date.now()}_${idx}`,
        file,
        title: `${selectedCourse?.code ? `${selectedCourse.code} — ` : ""}${cleanName}`,
        description: `[${semTag}] Official ${selectedCourse?.code || "Course"} lecture handout and study material.`,
        sizeLabel: formatBytesReadable(file.size),
        ext,
        status: "pending",
        progressPercent: 0,
      };
    });

    setFileQueue((prev) => [...prev, ...items]);
    e.target.value = "";
  };

  // Mode 1 Publish: Verifiable Permanent Cloud Upload Route (uploads to Supabase Storage -> reads back & verifies %PDF- bytes -> writes directly to live Supabase DB)
  const handlePublishFiles = async () => {
    if (!selectedCourseId || !selectedCourse) {
      toast.error("Please select or create a course in Step 2 first.");
      return;
    }
    if (fileQueue.length === 0) {
      toast.error("Please choose at least one PDF or document file first.");
      return;
    }

    setIsPublishingFiles(true);
    let publishedCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < fileQueue.length; i++) {
        const item = fileQueue[i];
        if (item.status === "success") continue;

        setFileQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "uploading",
                  errorMessage: undefined,
                  progressPercent: 15,
                  progressLabel: `Uploading & verifying in cloud storage… (${q.sizeLabel})`,
                }
              : q
          )
        );

        // 1. Upload to permanent Supabase Cloud Storage AND verify readback bytes (%PDF- check)
        const cloudResult = await uploadFileToSupabaseStorage(item.file, {
          courseId: selectedCourseId,
          userId: user?.id ?? null,
        });

        if (!cloudResult.ok || !cloudResult.fileUrl || !cloudResult.filePath) {
          failedCount++;
          const errMsg = cloudResult.error || "Cloud upload verification failed.";
          setFileQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: "error",
                    progressPercent: 0,
                    errorMessage: errMsg,
                  }
                : q
            )
          );
          continue;
        }

        setFileQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  progressPercent: 75,
                  progressLabel: `Verified ${formatBytesReadable(cloudResult.verifiedBytes || item.file.size)} in cloud · Saving to live website database…`,
                }
              : q
          )
        );

        // 2. Optional local server cache mirror (non-fatal if skipped; cloud storage is canonical)
        try {
          await uploadLargeFileChunked(item.file);
        } catch {
          // non-fatal
        }

        const syncResult = await persistMaterialDualSync({
          courseId: selectedCourseId,
          courseCode: selectedCourse.code,
          courseName: selectedCourse.name,
          department: selectedCourse.department,
          level: selectedCourse.level,
          title: item.title.trim() || item.file.name,
          description: item.description.trim(),
          fileUrl: cloudResult.fileUrl,
          filePath: cloudResult.filePath,
          storageBucket: cloudResult.bucket || null,
          verified: true,
          fileType: item.ext,
          fileSize: cloudResult.verifiedBytes || item.file.size,
        });

        if (!syncResult.cloudSynced) {
          failedCount++;
          const errMsg =
            syncResult.cloudError ||
            "File uploaded to storage, but saving to the live website database failed. Please ensure you are signed in as Admin or Tutor.";
          setFileQueue((prev) =>
            prev.map((q, idx) =>
              idx === i
                ? {
                    ...q,
                    status: "error",
                    progressPercent: 0,
                    errorMessage: errMsg,
                  }
                : q
            )
          );
          continue;
        }

        const publishedRow: ManagedMaterialRow = {
          id: syncResult.id,
          course_id: syncResult.courseUuid,
          course_code: selectedCourse.code,
          course_name: selectedCourse.name,
          semester: selectedCourse.semester,
          level: selectedCourse.level ? `${String(selectedCourse.level).replace(/\D/g, "")}L` : "100L",
          title: item.title.trim() || item.file.name,
          description: item.description.trim(),
          file_url: cloudResult.fileUrl,
          file_path: cloudResult.filePath,
          file_type: item.ext,
          file_size: cloudResult.verifiedBytes || item.file.size,
          source: "supabase+server",
          created_at: new Date().toISOString(),
        };

        publishedCount++;
        setFileQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "success",
                  progressPercent: 100,
                  verifiedBucket: cloudResult.bucket,
                  verifiedBytes: cloudResult.verifiedBytes || item.file.size,
                  publishedRow,
                }
              : q
          )
        );
      }

      if (publishedCount > 0 && failedCount === 0) {
        toast.success(
          `Verified & published ${publishedCount} document(s) to the live website for ${selectedCourse.code}! Students on the live link can open and download them immediately.`
        );
      } else if (publishedCount > 0 && failedCount > 0) {
        toast.warning(
          `Published ${publishedCount} document(s) to the live website, while ${failedCount} file(s) failed verification (see error details below).`
        );
      } else if (failedCount > 0) {
        toast.error(
          `Live publish failed for ${failedCount} file(s). See the error message below and ensure you are signed in as Admin or Tutor.`
        );
      }

      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      void queryClient.invalidateQueries({ queryKey: ["material-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-materials-meta"] });
      await loadMaterialsAndStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed uploading one or more files.");
    } finally {
      setIsPublishingFiles(false);
    }
  };

  // Mode 2 Publish: Save Pasted Summary Note & Formulas directly to Live Cloud
  const handlePublishPastedNote = async () => {
    if (!selectedCourseId || !selectedCourse) {
      toast.error("Please select or create a course in Step 2 first.");
      return;
    }
    if (!noteTitle.trim() || !noteSummary.trim()) {
      toast.error("Please enter both a Note Title and Summary Content.");
      return;
    }

    setIsSavingNote(true);
    try {
      const semLabel =
        selectedCourse.semester === "1st" ? "1st Semester" : "2nd Semester";
      const fullContent = [
        `# ${noteTitle.trim()}`,
        `Course: ${selectedCourse.code} — ${selectedCourse.name} (${semLabel})`,
        "",
        noteSummary.trim(),
        noteFormulas.trim() ? `\n## Key Formulas & Rules\n${noteFormulas.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const safeFilename = `${selectedCourse.code.replace(/\s+/g, "_")}_${noteTitle
        .trim()
        .slice(0, 30)
        .replace(/[^a-zA-Z0-9]+/g, "_")}.md`;

      // Upload markdown file to Supabase Storage so the live website link has a permanent cloud URL
      let permanentUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(fullContent)}`;
      let permanentPath: string | null = null;
      try {
        const mdFile = new File([fullContent], safeFilename, { type: "text/markdown" });
        const cloudMd = await uploadFileToSupabaseStorage(mdFile, {
          courseId: selectedCourseId,
          userId: user?.id ?? null,
        });
        if (cloudMd.ok && cloudMd.fileUrl && cloudMd.filePath) {
          permanentUrl = cloudMd.fileUrl;
          permanentPath = cloudMd.filePath;
        }
      } catch {
        // Fallback to portable inline data URI (works on live website too)
      }

      const syncResult = await persistMaterialDualSync({
        courseId: selectedCourseId,
        courseCode: selectedCourse.code,
        courseName: selectedCourse.name,
        department: selectedCourse.department,
        level: selectedCourse.level,
        title: noteTitle.trim(),
        description: fullContent,
        fileUrl: permanentUrl,
        filePath: permanentPath,
        fileType: "markdown",
        fileSize: fullContent.length,
      });

      if (!syncResult.cloudSynced) {
        throw new Error(
          syncResult.cloudError ||
            "Could not save note to the live website database. Make sure you are signed in as Admin or Tutor."
        );
      }

      setNoteTitle("");
      setNoteSummary("");
      setNoteFormulas("");
      toast.success(
        `Published note "${noteTitle.trim()}" live to ${selectedCourse.code} (${semLabel})!`
      );
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      void queryClient.invalidateQueries({ queryKey: ["material-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-materials-meta"] });
      await loadMaterialsAndStats();
    } catch (err: any) {
      toast.error(err?.message || "Could not save pasted note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // =========================================================================
  // MODE 3: BULK CBT QUIZ STUDIO HANDLERS (CSV + PASTE + AI + AUTO-SPLIT)
  // =========================================================================

  // Combine questions from Multi-CSV files + Raw Text Paste + AI Generated Questions
  const allCombinedStagedQuestions = useMemo(() => {
    const fromCsv = csvBatchFiles.flatMap((f) => f.questions);
    const fromText = parseQuestionsInput(questionsRawText);
    const merged = [...fromCsv, ...fromText, ...aiStagedQuestions];
    return merged.filter((_, idx) => !removedStagedIndices.has(idx));
  }, [csvBatchFiles, questionsRawText, aiStagedQuestions, removedStagedIndices]);

  // Compute how the staged questions will be packaged (Single Paper vs. Auto-Split CBT Sets)
  const plannedQuizPackages = useMemo(() => {
    const total = allCombinedStagedQuestions.length;
    if (total === 0) return [];

    const semLabel =
      (selectedCourse?.semester || activeSemester) === "1st"
        ? "1st Semester"
        : "2nd Semester";
    const baseTitle =
      quizTitle.trim() ||
      `${selectedCourse?.code || "COURSE"} ${semLabel} CBT Practice Exam`;
    const baseDuration = Math.max(5, parseInt(quizDuration, 10) || 25);

    if (quizPackagingMode === "single" || total <= quizSplitSize) {
      return [
        {
          partIndex: 1,
          title: baseTitle,
          duration_minutes: baseDuration,
          questions: allCombinedStagedQuestions,
        },
      ];
    }

    const chunks: Array<{
      partIndex: number;
      title: string;
      duration_minutes: number;
      questions: ParsedQuestionItem[];
    }> = [];

    const totalParts = Math.ceil(total / quizSplitSize);
    for (let i = 0; i < totalParts; i++) {
      const slice = allCombinedStagedQuestions.slice(
        i * quizSplitSize,
        (i + 1) * quizSplitSize
      );
      const proportionalDuration = Math.max(
        10,
        Math.round((slice.length / quizSplitSize) * baseDuration)
      );
      chunks.push({
        partIndex: i + 1,
        title: `${baseTitle} — Part ${i + 1} (${slice.length} Qs)`,
        duration_minutes: proportionalDuration,
        questions: slice,
      });
    }
    return chunks;
  }, [
    allCombinedStagedQuestions,
    quizPackagingMode,
    quizSplitSize,
    quizTitle,
    quizDuration,
    selectedCourse,
    activeSemester,
  ]);

  // 1-Click Download Sample CSV Template
  const handleDownloadCsvTemplate = () => {
    const code = selectedCourse?.code || (activeSemester === "1st" ? "MTH101" : "MTH102");
    const csvRows = [
      "question,option_a,option_b,option_c,option_d,correct_option,explanation",
      `"In ${code}, if a finite set A has 4 elements, how many subsets does A possess?","8","16","15","12","B","A set with n elements has 2^n subsets; therefore 2^4 = 16."`,
      `"Evaluate the limit as x approaches 0 of sin(5x) / x:","5","1/5","0","1","A","Using the fundamental trigonometric limit lim(x->0) sin(kx)/x = k, the result is 5."`,
      `"Which of the following is a vector quantity?","Mass","Temperature","Displacement","Speed","C","Displacement has both magnitude and direction, whereas mass, temperature, and speed are scalars."`,
    ].join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${code.replace(/\s+/g, "_")}_CBT_Bulk_Template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded sample CSV template! Open in Excel or Google Sheets.");
  };

  // Multi-File CSV / TXT Selection Handler
  const handleMultiCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const addedBatches: UploadedCsvBatchFile[] = [];
    let totalLoaded = 0;

    for (const file of Array.from(rawFiles)) {
      const text = await file.text();
      const parsed = parseQuestionsInput(text);
      totalLoaded += parsed.length;
      addedBatches.push({
        id: `csv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        filename: file.name,
        questionCount: parsed.length,
        questions: parsed,
      });
    }

    setCsvBatchFiles((prev) => [...prev, ...addedBatches]);
    setRemovedStagedIndices(new Set());

    if (!quizTitle && selectedCourse && addedBatches[0]) {
      const cleanName = addedBatches[0].filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ");
      setQuizTitle(`${selectedCourse.code} — ${cleanName}`);
    }

    if (totalLoaded > 0) {
      toast.success(
        `Loaded ${totalLoaded} CBT question(s) across ${addedBatches.length} file(s)!`
      );
    } else {
      toast.error(
        "Could not detect formatted questions in the selected file(s). Download the CSV template to see the required columns."
      );
    }
    e.target.value = "";
  };

  const handleLoadSampleQuestions = () => {
    const code = selectedCourse?.code || (activeSemester === "1st" ? "MTH 101" : "MTH 102");
    if (!quizTitle) {
      setQuizTitle(
        `${code} ${activeSemester === "1st" ? "1st Semester" : "2nd Semester"} CBT Practice Paper`
      );
    }
    setQuestionsRawText(
      `Q1: In ${code}, if a finite set A contains 4 elements, how many subsets does A have?\nA) 8\nB) 16\nC) 15\nD) 12\nANS: B\nEXP: A set with n elements has 2^n subsets; 2^4 = 16.\n\nQ2: Evaluate lim (x -> 0) [sin(4x) / x]:\nA) 4\nB) 1/4\nC) 0\nD) 1\nANS: A\nEXP: By the standard trigonometric limit lim(x->0) sin(kx)/x = k, the limit is 4.\n\nQ3: If f(x) = 3x^2 - 5x + 2, find the derivative f'(2):\nA) 7\nB) 12\nC) 9\nD) 5\nANS: A\nEXP: f'(x) = 6x - 5, so f'(2) = 6(2) - 5 = 7.`
    );
    setRemovedStagedIndices(new Set());
    toast.success("Inserted 3 sample CBT questions into the editor.");
  };

  // 1-Click AI Quiz Generator from Course Notes
  const handleGenerateAiQuestions = async () => {
    if (!selectedCourse) {
      toast.error("Please select or create a course in Step 2 first.");
      return;
    }

    const chosenNote = selectedCourseNotes.find((n) => n.id === selectedSourceNoteId);
    const sourceText =
      selectedSourceNoteId === "custom"
        ? customAiNoteText.trim()
        : `${chosenNote?.title || ""}\n\n${chosenNote?.description || ""}`.trim();

    if (!sourceText || sourceText.length < 15) {
      toast.error(
        "Please pick an uploaded course note or paste at least a short paragraph of lecture notes."
      );
      return;
    }

    setIsGeneratingAiQuiz(true);
    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_code: selectedCourse.code,
          course_name: selectedCourse.name,
          semester: selectedCourse.semester,
          level: selectedCourse.level ? `${selectedCourse.level}L` : "100L",
          note_title: chosenNote?.title || `${selectedCourse.code} Syllabus Notes`,
          note_content: sourceText,
          question_count: aiQuestionCount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok || !Array.isArray(json.questions)) {
        throw new Error(json.error || "Failed to generate questions");
      }

      setAiStagedQuestions((prev) => [...prev, ...json.questions]);
      setRemovedStagedIndices(new Set());

      if (!quizTitle) {
        setQuizTitle(
          `${selectedCourse.code} — ${
            chosenNote?.title || "Syllabus"
          } CBT Practice (${json.questions.length} Qs)`
        );
      }

      toast.success(
        `Generated ${json.questions.length} university CBT questions from "${
          chosenNote?.title || "Lecture Notes"
        }"! Review them below and click Save & Publish.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not generate CBT questions from notes.");
    } finally {
      setIsGeneratingAiQuiz(false);
    }
  };

  // Publish Single or Auto-Split Bulk CBT Quizzes to Server Store + Supabase + Local Cache
  const handlePublishQuestions = async () => {
    if (!selectedCourseId || !selectedCourse) {
      toast.error("Please select or create a course in Step 2 first.");
      return;
    }
    if (plannedQuizPackages.length === 0 || allCombinedStagedQuestions.length === 0) {
      toast.error(
        "No questions staged yet. Drop a CSV file, paste questions, or generate from notes first."
      );
      return;
    }

    setIsSavingQuestions(true);
    try {
      const semLabel =
        selectedCourse.semester === "1st" ? "1st Semester" : "2nd Semester";
      const createdServerPayloads: any[] = [];

      for (const pkg of plannedQuizPackages) {
        let quizId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        // 1. Try inserting into Supabase `quizzes`, `questions`, and `quiz_questions`
        try {
          const { data: createdQuiz, error: qzErr } = await (supabase as any)
            .from("quizzes")
            .insert({
              course_id: selectedCourseId,
              title: pkg.title,
              description: `[${semLabel}] Official CBT practice paper for ${selectedCourse.code} (${selectedCourse.name})`,
              duration_minutes: pkg.duration_minutes,
              question_count: pkg.questions.length,
              is_active: true,
              is_simulation: true,
              created_by: user?.id ?? null,
            })
            .select("id")
            .single();

          if (!qzErr && createdQuiz?.id) {
            quizId = createdQuiz.id;

            const questionPayloads = pkg.questions.map((q) => ({
              course_id: selectedCourseId,
              question_text: q.question_text,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              correct_option: q.correct_option,
              explanation: q.explanation,
              is_verified: true,
            }));

            const { data: insertedQuestions, error: insQErr } = await (supabase as any)
              .from("questions")
              .insert(questionPayloads)
              .select("id");

            if (!insQErr && Array.isArray(insertedQuestions) && insertedQuestions.length > 0) {
              const links = insertedQuestions.map((row: any, idx: number) => ({
                quiz_id: quizId,
                question_id: row.id,
                order_index: idx + 1,
              }));
              await (supabase as any).from("quiz_questions").insert(links);
            }
          }
        } catch {
          // Continue with server persistence even if Supabase RLS or network is restricted
        }

        const questionsWithIds = pkg.questions.map((q, idx) => ({
          id: q.id || `q_${quizId}_${idx + 1}`,
          ...q,
          image_url: null,
        }));

        createdServerPayloads.push({
          id: quizId,
          course_id: selectedCourseId,
          course_code: selectedCourse.code,
          course_name: selectedCourse.name,
          semester: selectedCourse.semester,
          level: selectedCourse.level ? `${selectedCourse.level}L` : "100L",
          title: pkg.title,
          description: `[${semLabel}] Official CBT practice paper for ${selectedCourse.code} (${selectedCourse.name})`,
          duration_minutes: pkg.duration_minutes,
          question_count: questionsWithIds.length,
          is_active: true,
          questions: questionsWithIds,
        });

        // Cache locally for instant offline CBT launch
        try {
          localStorage.setItem(
            `cbt_quiz_${quizId}`,
            JSON.stringify({
              quiz: {
                id: quizId,
                title: pkg.title,
                duration_minutes: pkg.duration_minutes,
                course: { code: selectedCourse.code, name: selectedCourse.name },
              },
              questions: questionsWithIds,
              cachedAt: Date.now(),
            })
          );
        } catch {
          // ignore
        }
      }

      // 2. Persist all created quiz papers to the Server Store (`/api/courses/:courseId/quizzes`)
      await fetch(`/api/courses/${encodeURIComponent(selectedCourseId)}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizzes: createdServerPayloads }),
      });

      // Clear staging area
      setCsvBatchFiles([]);
      setQuestionsRawText("");
      setAiStagedQuestions([]);
      setRemovedStagedIndices(new Set());
      setQuizTitle("");

      toast.success(
        plannedQuizPackages.length > 1
          ? `Published ${plannedQuizPackages.length} split CBT Exam Papers (${allCombinedStagedQuestions.length} total questions) to ${selectedCourse.code} (${semLabel})!`
          : `Published "${plannedQuizPackages[0].title}" (${allCombinedStagedQuestions.length} CBT questions) under ${semLabel}!`
      );
      setInventoryTab("quizzes");
      void queryClient.invalidateQueries({ queryKey: ["course-quizzes"] });
      await loadMaterialsAndStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed publishing bulk CBT questions.");
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // =========================================================================
  // PUBLISHED QUIZZES MANAGER ACTIONS: INSPECT, EDIT, DELETE
  // =========================================================================

  const handleInspectQuiz = async (row: ManagedQuizRow) => {
    setInspectingQuiz(row);
    if (row.questions && row.questions.length > 0) return;

    setLoadingQuizDetails(true);
    try {
      // 1. Check server store first
      const srvRes = await fetch(`/api/quizzes/${encodeURIComponent(row.id)}`);
      if (srvRes.ok) {
        const srvJson = await srvRes.json();
        if (srvJson.ok && Array.isArray(srvJson.quiz?.questions) && srvJson.quiz.questions.length > 0) {
          setInspectingQuiz({ ...row, questions: srvJson.quiz.questions });
          setLoadingQuizDetails(false);
          return;
        }
      }

      // 2. Check localStorage cache
      const cachedRaw = localStorage.getItem(`cbt_quiz_${row.id}`);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (Array.isArray(cached.questions) && cached.questions.length > 0) {
          setInspectingQuiz({ ...row, questions: cached.questions });
          setLoadingQuizDetails(false);
          return;
        }
      }

      // 3. Query Supabase `quiz_questions -> questions`
      const { data: qData } = await supabase
        .from("quiz_questions")
        .select("questions(*)")
        .eq("quiz_id", row.id)
        .order("order_index");

      const dbQuestions: ParsedQuestionItem[] = (qData || [])
        .map((qq: any) => qq.questions)
        .filter(Boolean)
        .map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option || "A",
          explanation: q.explanation || "Verified syllabus solution.",
        }));

      setInspectingQuiz({ ...row, questions: dbQuestions });
    } catch {
      // ignore
    } finally {
      setLoadingQuizDetails(false);
    }
  };

  const handleRemoveQuestionFromPublishedQuiz = async (qIdx: number) => {
    if (!inspectingQuiz) return;
    const nextQuestions = inspectingQuiz.questions.filter((_, i) => i !== qIdx);
    const updatedQuiz: ManagedQuizRow = {
      ...inspectingQuiz,
      questions: nextQuestions,
      question_count: nextQuestions.length,
    };
    setInspectingQuiz(updatedQuiz);

    try {
      await fetch(`/api/quizzes/${encodeURIComponent(inspectingQuiz.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: nextQuestions,
          question_count: nextQuestions.length,
        }),
      });
      await supabase
        .from("quizzes")
        .update({ question_count: nextQuestions.length })
        .eq("id", inspectingQuiz.id);

      setQuizzesList((prev) =>
        prev.map((q) => (q.id === inspectingQuiz.id ? updatedQuiz : q))
      );
      toast.success("Removed question from quiz.");
    } catch {
      toast.error("Could not update quiz questions.");
    }
  };

  const openEditQuizModal = (row: ManagedQuizRow) => {
    setEditingQuiz(row);
    setEditQuizTitle(row.title);
    setEditQuizDuration(String(row.duration_minutes || 25));
    setEditQuizCourseId(row.course_id);
  };

  const handleSaveQuizEdit = async () => {
    if (!editingQuiz) return;
    if (!editQuizTitle.trim()) {
      toast.error("Quiz title cannot be empty.");
      return;
    }

    setSavingQuizEdit(true);
    try {
      const targetCourse = courses.find((c) => c.id === editQuizCourseId);
      const duration = Math.max(5, parseInt(editQuizDuration, 10) || 25);

      await fetch(`/api/quizzes/${encodeURIComponent(editingQuiz.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editQuizTitle.trim(),
          duration_minutes: duration,
          course_id: editQuizCourseId,
          course_code: targetCourse?.code || editingQuiz.course_code,
          course_name: targetCourse?.name || editingQuiz.course_name,
          semester: targetCourse?.semester || editingQuiz.semester,
        }),
      });

      await supabase
        .from("quizzes")
        .update({
          title: editQuizTitle.trim(),
          duration_minutes: duration,
          course_id: editQuizCourseId,
        })
        .eq("id", editingQuiz.id);

      toast.success("Updated CBT quiz details!");
      setEditingQuiz(null);
      void queryClient.invalidateQueries({ queryKey: ["course-quizzes"] });
      await loadMaterialsAndStats();
    } catch {
      toast.error("Could not update quiz.");
    } finally {
      setSavingQuizEdit(false);
    }
  };

  const handleDeleteQuiz = async (row: ManagedQuizRow) => {
    try {
      await Promise.allSettled([
        fetch(`/api/quizzes/${encodeURIComponent(row.id)}`, { method: "DELETE" }),
        supabase.from("quiz_questions").delete().eq("quiz_id", row.id),
        supabase.from("quizzes").delete().eq("id", row.id),
      ]);
      try {
        localStorage.removeItem(`cbt_quiz_${row.id}`);
      } catch {
        // ignore
      }
      setQuizzesList((prev) => prev.filter((q) => q.id !== row.id));
      void queryClient.invalidateQueries({ queryKey: ["course-quizzes"] });
      toast.success(`Deleted CBT quiz "${row.title}".`);
    } catch {
      toast.error("Could not delete quiz.");
    }
  };

  // Current Materials Manager Actions: Edit, Delete, Sync All, Wipe All
  const openEditModal = (row: ManagedMaterialRow) => {
    setEditingItem(row);
    setEditTitle(row.title);
    setEditDescription(row.description || "");
    setEditCourseId(row.course_id);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim()) {
      toast.error("Material title cannot be empty.");
      return;
    }

    setSavingEdit(true);
    try {
      const targetCourse = courses.find((c) => c.id === editCourseId);

      await fetch(`/api/materials/${encodeURIComponent(editingItem.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          course_id: editCourseId,
          course_code: targetCourse?.code || editingItem.course_code,
        }),
      });

      await Promise.allSettled([
        supabase
          .from("study_materials")
          .update({
            title: editTitle.trim(),
            description: editDescription.trim() || null,
            course_id: editCourseId,
          })
          .eq("id", editingItem.id),
        supabase
          .from("lecture_notes")
          .update({
            title: editTitle.trim(),
            description: editDescription.trim() || null,
            course_id: editCourseId,
          })
          .eq("id", editingItem.id),
      ]);

      toast.success("Material updated in Supabase & Server!");
      setEditingItem(null);
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      await loadMaterialsAndStats();
    } catch (err: any) {
      toast.error(err?.message || "Could not update material.");
    } finally {
      setSavingEdit(false);
    }
  };

  const triggerReplaceFile = (row: ManagedMaterialRow) => {
    setReplacingRow(row);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceMaterialFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = replacingRow;
    e.target.value = "";
    if (!file || !target) return;

    setReplacingBusyId(target.id);
    const toastId = toast.loading(`Uploading & verifying "${file.name}" in cloud storage…`);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const cloudResult = await uploadFileToSupabaseStorage(file, {
        courseId: target.course_id,
        userId: user?.id ?? null,
      });

      if (!cloudResult.ok || !cloudResult.fileUrl || !cloudResult.filePath) {
        throw new Error(cloudResult.error || "Cloud upload verification failed.");
      }

      try {
        await uploadLargeFileChunked(file);
      } catch {
        // non-fatal — cloud storage is canonical
      }

      const finalUrl = cloudResult.fileUrl;
      const finalPath = cloudResult.filePath;
      const finalSize = cloudResult.verifiedBytes || file.size;

      const cloudWrite = await persistMaterialToLiveSupabase(
        supabase,
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          id: target.id,
          courseId: target.course_id,
          courseCode: target.course_code,
          courseName: target.course_name,
          level: target.level,
          university: activeInstitution,
          title: target.title,
          description: target.description,
          fileUrl: finalUrl,
          filePath: finalPath,
          fileType: ext,
          fileSize: finalSize,
          userId: user?.id ?? null,
          isPublished: true,
        }
      );

      if (!cloudWrite.ok) {
        throw new Error(
          cloudWrite.error ||
            "Uploaded PDF to cloud storage, but failed updating the live website database."
        );
      }

      try {
        await fetch(`/api/materials/${encodeURIComponent(target.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            course_id: cloudWrite.courseUuid,
            file_url: finalUrl,
            file_path: finalPath,
            file_type: ext,
            file_size: finalSize,
            visibility: "public",
          }),
        });
      } catch {
        // non-fatal
      }

      setVerifiedMap((prev) => ({
        ...prev,
        [target.id]: {
          ok: true,
          label: `Verified (${formatBytesReadable(finalSize)})`,
        },
      }));

      toast.success(
        `Replaced & verified "${target.title}" (${formatBytesReadable(finalSize)}) in permanent cloud storage!`,
        { id: toastId }
      );
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      void queryClient.invalidateQueries({ queryKey: ["material-courses"] });
      await loadMaterialsAndStats();
    } catch (err: any) {
      toast.error(err?.message || "Failed to replace PDF file.", { id: toastId });
    } finally {
      setReplacingBusyId(null);
      setReplacingRow(null);
    }
  };

  const handleVerifyMaterialLive = async (row: ManagedMaterialRow) => {
    setVerifyingId(row.id);
    const toastId = toast.loading(`Verifying "${row.title}" from student view…`);
    try {
      const check = await verifyMaterialAccessible({
        id: row.id,
        title: row.title,
        courseCode: row.course_code,
        fileUrl: row.file_url,
        filePath: row.file_path,
        fileType: row.file_type,
      });
      if (check.ok) {
        const sizeLabel = formatBytesReadable(check.bytes || row.file_size || 0);
        setVerifiedMap((prev) => ({
          ...prev,
          [row.id]: { ok: true, label: `Verified (${sizeLabel})` },
        }));
        toast.success(
          `Verified! "${row.title}" loads cleanly (${sizeLabel}, source: ${check.source}).`,
          { id: toastId }
        );
      } else {
        setVerifiedMap((prev) => ({
          ...prev,
          [row.id]: { ok: false, label: "Missing — Re-upload" },
        }));
        toast.error(check.error || "File failed live verification.", { id: toastId });
      }
    } finally {
      setVerifyingId(null);
    }
  };

  const handleWipeMaterialsOnly = async () => {
    setIsWipingMaterials(true);
    try {
      await executeMaterialsOnlyWipe(supabase);
      setMaterials([]);
      setFileQueue([]);
      setVerifiedMap({});
      setConfirmMaterialsWipeOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      void queryClient.invalidateQueries({ queryKey: ["material-courses"] });
      await loadMaterialsAndStats();
      toast.success("All materials wiped cleanly! Your courses and CBT quizzes were preserved.");
    } catch (err: any) {
      toast.error(err?.message || "Could not wipe materials.");
    } finally {
      setIsWipingMaterials(false);
    }
  };

  const handleDeleteMaterial = async (row: ManagedMaterialRow) => {
    try {
      await Promise.allSettled([
        fetch(`/api/materials/${encodeURIComponent(row.id)}`, { method: "DELETE" }),
        supabase.from("study_materials").delete().eq("id", row.id),
        supabase.from("lecture_notes").delete().eq("id", row.id),
      ]);
      setMaterials((prev) => prev.filter((m) => m.id !== row.id));
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      toast.success(`Deleted "${row.title}" from database.`);
    } catch {
      toast.error("Could not delete material.");
    }
  };

  const handleSyncAllToSupabase = async () => {
    setSyncingDb(true);
    try {
      // Collect Preview-only materials from current view AND any browser localStorage RLS mirror rows
      const pendingById = new Map<
        string,
        {
          id: string;
          course_id: string;
          course_code?: string | null;
          course_name?: string | null;
          level?: string | null;
          title: string;
          description?: string | null;
          file_url: string;
          file_path?: string | null;
          file_type?: string | null;
          file_size?: number;
        }
      >();

      for (const m of materials) {
        if (m.source === "server" && m.file_url) {
          pendingById.set(m.id, m);
        }
      }

      if (typeof window !== "undefined") {
        for (const storageKey of [
          "overra_rls_mirror_study_materials",
          "overra_rls_mirror_lecture_notes",
        ]) {
          try {
            const raw = window.localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            if (Array.isArray(parsed)) {
              for (const row of parsed) {
                if (row?.id && row?.file_url && !pendingById.has(row.id)) {
                  const matchedCourse = courses.find(
                    (c) =>
                      c.id === row.course_id ||
                      courseCodeToDeterministicUuid(c.code) === row.course_id
                  );
                  pendingById.set(row.id, {
                    id: String(row.id),
                    course_id: String(row.course_id || ""),
                    course_code: row.course_code || matchedCourse?.code || null,
                    course_name: matchedCourse?.name || null,
                    level: matchedCourse?.level || null,
                    title: String(row.title || "Course Material"),
                    description: row.description ?? null,
                    file_url: String(row.file_url),
                    file_path: row.file_path ?? null,
                    file_type: row.file_type || "pdf",
                    file_size: Number(row.file_size || row.file_size_bytes || 0),
                  });
                }
              }
            }
          } catch {
            // ignore malformed localStorage
          }
        }
      }

      const itemsToSync = Array.from(pendingById.values());
      let syncedCount = 0;
      let failedCount = 0;
      let lastError = "";

      for (const item of itemsToSync) {
        const res = await persistMaterialToLiveSupabase(
          supabase,
          SUPABASE_URL,
          SUPABASE_PUBLISHABLE_KEY,
          {
            id: item.id,
            courseId: item.course_id,
            courseCode: item.course_code,
            courseName: item.course_name,
            level: item.level,
            university: activeInstitution,
            title: item.title,
            description: item.description,
            fileUrl: item.file_url,
            filePath:
              item.file_path ||
              `${user?.id || "admin"}/${item.course_id}/${Date.now()}_${item.title.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
            fileType: item.file_type || "pdf",
            fileSize: item.file_size || 0,
            userId: user?.id ?? null,
            isPublished: true,
          }
        );

        if (res.ok) {
          syncedCount++;
        } else {
          failedCount++;
          if (res.error) lastError = res.error;
        }
      }

      await loadMaterialsAndStats();
      void queryClient.invalidateQueries({ queryKey: ["course-materials"] });
      void queryClient.invalidateQueries({ queryKey: ["material-courses"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-materials-meta"] });
      void queryClient.invalidateQueries({ queryKey: ["course-quizzes"] });

      if (failedCount > 0 && syncedCount === 0) {
        toast.error(
          lastError ||
            `Could not sync ${failedCount} Preview-only document(s) to the live website database. Make sure you are signed in as Admin or Tutor.`
        );
      } else if (syncedCount > 0 && failedCount > 0) {
        toast.warning(
          `Synced ${syncedCount} document(s) to the live website, while ${failedCount} failed (${lastError || "check permissions"}).`
        );
      } else if (syncedCount > 0) {
        toast.success(
          `Synced ${syncedCount} document(s) to the live website cloud database! Students on the live link can see them immediately.`
        );
      } else {
        toast.success(
          "Database verified — all uploaded materials and CBT quizzes are already live on the website!"
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Sync encountered an error.");
    } finally {
      setSyncingDb(false);
    }
  };

  const handleWipeAllData = async () => {
    setIsWipingAll(true);
    try {
      await executeFullCleanSlateWipe(supabase);
      setCourses([]);
      setSelectedCourseId("");
      setMaterials([]);
      setQuizzesList([]);
      setFileQueue([]);
      setCsvBatchFiles([]);
      setAiStagedQuestions([]);
      setQuestionsRawText("");
      setDbStats({
        coursesCount: 0,
        supabaseMaterialsCount: 0,
        serverMaterialsCount: 0,
        quizzesCount: 0,
        questionsCount: 0,
      });
      setConfirmWipeOpen(false);
      void queryClient.invalidateQueries();
      toast.success(
        "Clean slate complete — all courses, materials, notes, and quizzes have been wiped."
      );
    } catch {
      toast.error("Could not complete full reset.");
    } finally {
      setIsWipingAll(false);
    }
  };

  const handleDeleteSelectedCourse = async () => {
    if (!selectedCourse) return;
    const courseToRemove = selectedCourse;
    try {
      const courseMats = materials.filter((m) => m.course_id === courseToRemove.id);
      for (const m of courseMats) {
        await fetch(`/api/materials/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      }
      const courseQzs = quizzesList.filter((q) => q.course_id === courseToRemove.id);
      for (const q of courseQzs) {
        await fetch(`/api/quizzes/${encodeURIComponent(q.id)}`, { method: "DELETE" });
      }
      await Promise.allSettled([
        supabase.from("study_materials").delete().eq("course_id", courseToRemove.id),
        supabase.from("lecture_notes").delete().eq("course_id", courseToRemove.id),
        supabase.from("questions").delete().eq("course_id", courseToRemove.id),
        supabase.from("quizzes").delete().eq("course_id", courseToRemove.id),
        supabase.from("topics").delete().eq("course_id", courseToRemove.id),
        supabase.from("student_courses").delete().eq("course_id", courseToRemove.id),
        supabase.from("courses").delete().eq("id", courseToRemove.id),
        supabase.from("courses").update({ is_active: false }).eq("id", courseToRemove.id),
      ]);

      const remaining = courses.filter((c) => c.id !== courseToRemove.id);
      setCourses(remaining);
      setSelectedCourseId(remaining[0]?.id || "");
      setMaterials((prev) => prev.filter((m) => m.course_id !== courseToRemove.id));
      setQuizzesList((prev) => prev.filter((q) => q.course_id !== courseToRemove.id));
      void queryClient.invalidateQueries();
      toast.success(
        `Deleted course "${courseToRemove.code} — ${courseToRemove.name}" and its materials/quizzes.`
      );
    } catch {
      toast.error("Could not delete course.");
    }
  };

  const filteredMaterials = useMemo(() => {
    const q = managerSearch.trim().toLowerCase();
    return materials.filter((m) => {
      if (managerSemesterFilter !== "all" && m.semester !== managerSemesterFilter) return false;
      if (managerCourseFilter !== "all" && m.course_id !== managerCourseFilter) return false;
      if (q) {
        const hay = `${m.course_code} ${m.course_name} ${m.title} ${
          m.description || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [materials, managerSemesterFilter, managerCourseFilter, managerSearch]);

  const filteredQuizzes = useMemo(() => {
    const q = managerSearch.trim().toLowerCase();
    return quizzesList.filter((qz) => {
      if (managerSemesterFilter !== "all" && qz.semester !== managerSemesterFilter) return false;
      if (managerCourseFilter !== "all" && qz.course_id !== managerCourseFilter) return false;
      if (q) {
        const hay = `${qz.course_code} ${qz.course_name} ${qz.title} ${
          qz.description || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [quizzesList, managerSemesterFilter, managerCourseFilter, managerSearch]);

  const isAddCourseVisible = showNewCourseForm || semesterCourses.length === 0;

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. DATABASE ARCHITECTURE & LIVE SYNC STATUS BAR
         ===================================================================== */}
      <section className="rounded-2xl border border-[#E6E0D4] bg-[#18181B] text-[#FAF8F5] p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#18181B] flex items-center justify-center shrink-0 font-bold">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-sm sm:text-base font-extrabold text-[#FAF8F5]">
                  Academic Session Material &amp; Bulk CBT Quiz Studio (1st &amp; 2nd Semester)
                </h2>
                <span className="text-[11px] font-mono text-[#D4AF37]">
                  · Campus: {activeInstitution}
                </span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Follow the simple 3 steps below: 1. Pick Semester → 2. Pick or Add Course → 3. Upload PDFs, Notes, or Bulk CBT Quizzes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleSyncAllToSupabase}
              disabled={syncingDb}
              className="bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs h-9 px-3.5 rounded-xl shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncingDb ? "animate-spin" : ""}`} />
              <span>{syncingDb ? "Syncing Database…" : "Sync & Verify Database"}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmMaterialsWipeOpen(true)}
              className="border-amber-500/60 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 font-bold text-xs h-9 px-3.5 rounded-xl shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>Wipe Materials Only</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmWipeOpen(true)}
              className="border-rose-500/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 font-bold text-xs h-9 px-3.5 rounded-xl shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              <span>Wipe &amp; Reset All Data</span>
            </Button>
          </div>
        </div>

        {/* Live Database Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-[#27272A]">
          <div className="px-3 py-2 rounded-xl bg-[#27272A]/70">
            <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block">
              1st Sem / 2nd Sem Courses
            </span>
            <span className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-[#FAF8F5]">
              {firstSemCoursesCount} · {secondSemCoursesCount}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#27272A]/70">
            <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block">
              Uploaded Notes &amp; PDFs
            </span>
            <span className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-[#D4AF37]">
              {materials.length}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#27272A]/70">
            <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block">
              Published CBT Quizzes
            </span>
            <span className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-[#D4AF37]">
              {quizzesList.length}
            </span>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#27272A]/70">
            <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] block">
              Verified CBT Questions
            </span>
            <span className="font-mono tabular-nums text-sm sm:text-base font-extrabold text-[#FAF8F5]">
              {dbStats.questionsCount}
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. LAYMAN 3-STEP SESSION & SEMESTER MATERIAL + BULK QUIZ STUDIO
         ===================================================================== */}
      <section className="rounded-3xl border border-[#E6E0D4] bg-white p-5 sm:p-6 shadow-2xs space-y-6">
        {/* -----------------------------------------------------------------
            STEP 1: PICK ACADEMIC SESSION SEMESTER (1ST OR 2ND SEMESTER)
           ----------------------------------------------------------------- */}
        <div className="space-y-3 pb-5 border-b border-[#EFECE6]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#18181B] text-[#D4AF37] font-mono text-xs font-extrabold grid place-items-center shrink-0">
                1
              </span>
              <div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                  Step 1: Which Semester Are You Uploading For?
                </h3>
                <p className="text-xs text-[#71717A]">
                  Tap either 1st Semester or 2nd Semester below to organize courses cleanly for the academic session.
                </p>
              </div>
            </div>

            {/* Optional Level Filter */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {(["all", "100", "200", "300", "400", "500"] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    setActiveLevel(lvl);
                    if (lvl !== "all") setNewCourseLevel(lvl);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 ${
                    activeLevel === lvl
                      ? "bg-[#18181B] text-[#D4AF37]"
                      : "bg-[#FAF8F5] border border-[#E6E0D4] text-[#52525B] hover:text-[#18181B]"
                  }`}
                >
                  {lvl === "all" ? "All Levels" : `${lvl}L`}
                </button>
              ))}
            </div>
          </div>

          {/* Giant 2-Card Semester Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveSemester("1st")}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                activeSemester === "1st"
                  ? "border-[#18181B] bg-[#18181B] text-[#FAF8F5] shadow-xs"
                  : "border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B] hover:border-[#D4AF37]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-display text-sm sm:text-base font-extrabold">
                    1st Semester (Harmattan)
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    activeSemester === "1st" ? "text-[#A1A1AA]" : "text-[#71717A]"
                  }`}
                >
                  Odd course codes (e.g. MTH 101, PHY 101, GST 101, CSC 201)
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono tabular-nums text-lg font-black text-[#D4AF37] block">
                  {firstSemCoursesCount}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold ${
                    activeSemester === "1st" ? "text-[#FAF8F5]" : "text-[#71717A]"
                  }`}
                >
                  Courses
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveSemester("2nd")}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                activeSemester === "2nd"
                  ? "border-[#18181B] bg-[#18181B] text-[#FAF8F5] shadow-xs"
                  : "border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B] hover:border-[#D4AF37]"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4AF37]" />
                  <span className="font-display text-sm sm:text-base font-extrabold">
                    2nd Semester (Rain)
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    activeSemester === "2nd" ? "text-[#A1A1AA]" : "text-[#71717A]"
                  }`}
                >
                  Even course codes (e.g. MTH 102, PHY 102, GST 102, CSC 202)
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono tabular-nums text-lg font-black text-[#D4AF37] block">
                  {secondSemCoursesCount}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider font-bold ${
                    activeSemester === "2nd" ? "text-[#FAF8F5]" : "text-[#71717A]"
                  }`}
                >
                  Courses
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            STEP 2: PICK OR CREATE THE COURSE FOR THIS SEMESTER
           ----------------------------------------------------------------- */}
        <div className="space-y-3 pb-5 border-b border-[#EFECE6]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#18181B] text-[#D4AF37] font-mono text-xs font-extrabold grid place-items-center shrink-0">
                2
              </span>
              <div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                  Step 2: Select or Add a{" "}
                  {activeSemester === "1st" ? "1st Semester" : "2nd Semester"} Course
                </h3>
                <p className="text-xs text-[#71717A]">
                  Pick a course from the list below, or type a new course code and name to add it in 5 seconds.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewCourseForm((v) => !v)}
                className="h-9 px-3.5 rounded-xl border-[#D4AF37] text-[#18181B] bg-[#FAF8F5] hover:bg-[#D4AF37]/15 font-bold text-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#B48A1E]" />
                <span>
                  {showNewCourseForm
                    ? "Hide New Course Box"
                    : `+ Add New ${activeSemester === "1st" ? "1st Sem" : "2nd Sem"} Course`}
                </span>
              </Button>

              {selectedCourse && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteSelectedCourse}
                  title={`Delete ${selectedCourse.code}`}
                  className="h-9 px-3 rounded-xl border-rose-300 text-rose-700 bg-white hover:bg-rose-50 font-bold text-xs shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Delete Course</span>
                </Button>
              )}
            </div>
          </div>

          {/* Course Chips */}
          {semesterCourses.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {semesterCourses.map((c) => {
                  const isSelected = c.id === selectedCourseId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        isSelected
                          ? "bg-[#18181B] text-[#FAF8F5] border-[#18181B] shadow-2xs"
                          : "bg-[#FAF8F5] text-[#18181B] border-[#E6E0D4] hover:border-[#D4AF37]"
                      }`}
                    >
                      <span className="font-mono text-xs font-extrabold text-[#D4AF37]">
                        {c.code}
                      </span>
                      <span className="text-xs font-semibold truncate max-w-[180px]">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Layman Inline Add New Course Box */}
          {isAddCourseVisible && (
            <div className="rounded-2xl border-2 border-[#D4AF37] bg-[#FAF8F5] p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C] block">
                    {semesterCourses.length === 0
                      ? `No ${
                          activeSemester === "1st" ? "1st Semester" : "2nd Semester"
                        } courses yet — add your first course below`
                      : `Add a New ${
                          activeSemester === "1st" ? "1st Semester" : "2nd Semester"
                        } Course`}
                  </span>
                  <h4 className="font-display text-sm font-extrabold text-[#18181B]">
                    Type Course Code &amp; Course Title
                  </h4>
                </div>
                {semesterCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewCourseForm(false)}
                    className="text-xs text-[#71717A] hover:text-[#18181B]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-3">
                  <label className="text-[11px] font-bold text-[#52525B] block mb-1">
                    Course Code *
                  </label>
                  <Input
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder={activeSemester === "1st" ? "e.g. MTH 101" : "e.g. MTH 102"}
                    className="h-10 rounded-xl bg-white border-[#E6E0D4] font-mono text-xs font-bold"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="text-[11px] font-bold text-[#52525B] block mb-1">
                    Course Title *
                  </label>
                  <Input
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder={
                      activeSemester === "1st"
                        ? "e.g. Elementary Mathematics I"
                        : "e.g. Elementary Mathematics II"
                    }
                    className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#52525B] block mb-1">
                    Semester
                  </label>
                  <select
                    value={newCourseSemester}
                    onChange={(e) => setNewCourseSemester(e.target.value as AcademicSemester)}
                    className="w-full h-10 rounded-xl border border-[#E6E0D4] bg-white px-2.5 text-xs font-bold text-[#18181B]"
                  >
                    <option value="1st">1st Semester</option>
                    <option value="2nd">2nd Semester</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#52525B] block mb-1">Level</label>
                  <select
                    value={newCourseLevel}
                    onChange={(e) => setNewCourseLevel(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E6E0D4] bg-white px-2.5 text-xs font-bold text-[#18181B]"
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <Input
                  value={newCourseDept}
                  onChange={(e) => setNewCourseDept(e.target.value)}
                  placeholder="Department (e.g. General Studies, Engineering, Sciences)"
                  className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs sm:max-w-xs"
                />
                <Button
                  onClick={handleCreateCourse}
                  disabled={creatingCourse}
                  className="h-10 px-5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] font-bold text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>
                    {creatingCourse
                      ? "Adding Course…"
                      : `Save Course to ${
                          newCourseSemester === "1st" ? "1st Semester" : "2nd Semester"
                        }`}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* -----------------------------------------------------------------
            STEP 3: UPLOAD MATERIAL OR BULK CBT QUIZZES TO SELECTED COURSE
           ----------------------------------------------------------------- */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#D4AF37] text-[#18181B] font-mono text-xs font-extrabold grid place-items-center shrink-0">
                3
              </span>
              <div>
                <h3 className="font-display text-sm sm:text-base font-extrabold text-[#18181B]">
                  Step 3: Upload Material or Bulk CBT Quiz for{" "}
                  <span className="text-[#9A7B1C]">
                    {selectedCourse
                      ? `${selectedCourse.code} (${
                          selectedCourse.semester === "1st" ? "1st Semester" : "2nd Semester"
                        })`
                      : "Your Course"}
                  </span>
                </h3>
                <p className="text-xs text-[#71717A]">
                  Choose Option A (PDF/Word), Option B (Summary Notes), or Option C (Bulk CBT Quiz Studio).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#EFECE6] border border-[#E6E0D4]">
            <button
              type="button"
              onClick={() => setUploadMode("pdf")}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                uploadMode === "pdf"
                  ? "bg-[#18181B] text-[#D4AF37] shadow-2xs"
                  : "text-[#52525B] hover:text-[#18181B]"
              }`}
            >
              <FolderUp className="w-4 h-4" />
              <span>Option A: Upload PDF / Word Handout</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode("note")}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                uploadMode === "note"
                  ? "bg-[#18181B] text-[#D4AF37] shadow-2xs"
                  : "text-[#52525B] hover:text-[#18181B]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Option B: Type / Paste Summary Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode("questions")}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                uploadMode === "questions"
                  ? "bg-[#18181B] text-[#D4AF37] shadow-2xs"
                  : "text-[#52525B] hover:text-[#18181B]"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Option C: Bulk CBT Quiz Studio</span>
            </button>
          </div>

          {/* ===============================================================
              OPTION A: DROP PDFs & DOCUMENTS (LARGE FILE CHUNKED ENGINE)
             =============================================================== */}
          {uploadMode === "pdf" && (
            <div className="space-y-4">
              <div className="relative border-2 border-dashed border-[#D4AF37] hover:border-[#18181B] rounded-2xl p-6 sm:p-8 text-center bg-[#FAF8F5] transition-all group cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.rtf,.epub,.zip"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center pointer-events-none">
                  <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-[#D4AF37] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h4 className="font-display font-extrabold text-sm sm:text-base text-[#18181B]">
                    Tap or Drag &amp; Drop Bulk PDFs, Textbooks, Slides, or Word Handouts Here
                  </h4>
                  <p className="text-xs text-[#71717A] mt-1">
                    Uploading for{" "}
                    <strong className="text-[#18181B]">
                      {selectedCourse
                        ? `${selectedCourse.code} — ${selectedCourse.name} (${
                            selectedCourse.semester === "1st" ? "1st Semester" : "2nd Semester"
                          })`
                        : "Selected Course (Pick or create a course in Step 2 above)"}
                    </strong>
                  </p>
                  <p className="text-[11px] font-mono text-[#9A7B1C] font-bold mt-1">
                    Verified Permanent Cloud Storage · Every PDF is integrity-checked (%PDF header + live readback) before publishing to students (Max 50 MB per file)
                  </p>
                  <span className="mt-3.5 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#18181B] text-xs font-extrabold shadow-2xs">
                    Select Bulk PDF / Document Files
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {fileQueue.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-[#E6E0D4] bg-[#FAF8F5] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono tabular-nums text-[#18181B]">
                      Selected Files ({fileQueue.length}) — Review Titles &amp; Click Save Below
                    </span>
                    <button
                      type="button"
                      onClick={() => setFileQueue([])}
                      className="text-xs font-semibold text-[#71717A] hover:text-rose-600 cursor-pointer"
                    >
                      Clear List
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {fileQueue.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-[#E6E0D4] bg-white space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input
                              value={item.title}
                              onChange={(e) =>
                                setFileQueue((prev) =>
                                  prev.map((q, i) =>
                                    i === idx ? { ...q, title: e.target.value } : q
                                  )
                                )
                              }
                              placeholder="Material title shown to students"
                              className="h-9 rounded-lg bg-[#FAF8F5] border-[#E6E0D4] text-xs font-bold"
                            />
                            <Input
                              value={item.description}
                              onChange={(e) =>
                                setFileQueue((prev) =>
                                  prev.map((q, i) =>
                                    i === idx ? { ...q, description: e.target.value } : q
                                  )
                                )
                              }
                              placeholder="Short description (optional)"
                              className="h-9 rounded-lg bg-[#FAF8F5] border-[#E6E0D4] text-xs"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className="font-mono tabular-nums text-[11px] text-[#71717A]">
                              {item.status === "uploading" && item.progressLabel
                                ? item.progressLabel
                                : item.sizeLabel}
                            </span>
                            {item.status === "success" ? (
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Verified{item.verifiedBucket ? ` · ${item.verifiedBucket}` : ""}
                                </span>
                                {item.publishedRow && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewRow(item.publishedRow!)}
                                      className="px-2 py-1 rounded-lg border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                      title="Test opening as a student"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>Test Open</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void downloadMaterialExternally({
                                          id: item.publishedRow!.id,
                                          title: item.publishedRow!.title,
                                          courseCode: item.publishedRow!.course_code,
                                          fileUrl: item.publishedRow!.file_url,
                                          filePath: item.publishedRow!.file_path,
                                          fileType: item.publishedRow!.file_type,
                                        })
                                      }
                                      className="px-2 py-1 rounded-lg border border-[#E6E0D4] bg-[#FAF8F5] hover:border-[#D4AF37] text-[#18181B] text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                      title="Test downloading as a student"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Test Download</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            ) : item.status === "error" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-700 text-xs font-bold">
                                Failed Verification
                              </span>
                            ) : item.status === "uploading" ? (
                              <span className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/20 text-[#9A7B1C] font-mono tabular-nums text-xs font-bold">
                                Verifying {item.progressPercent ?? 0}%
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setFileQueue((prev) => prev.filter((q) => q.id !== item.id))
                                }
                                className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-600 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {item.status === "error" && item.errorMessage && (
                          <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                            {item.errorMessage}
                          </p>
                        )}

                        {item.status === "uploading" && (
                          <div className="w-full h-1.5 rounded-full bg-[#EFECE6] overflow-hidden">
                            <div
                              className="h-full bg-[#D4AF37] transition-all duration-200"
                              style={{ width: `${Math.max(4, item.progressPercent || 0)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={handlePublishFiles}
                      disabled={
                        isPublishingFiles || fileQueue.every((f) => f.status === "success")
                      }
                      className="h-11 px-6 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-display font-black text-xs sm:text-sm cursor-pointer"
                    >
                      {isPublishingFiles
                        ? "Uploading & Saving to Database…"
                        : `Save & Publish ${fileQueue.length} File(s) to ${
                            selectedCourse?.code || "Course"
                          }`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===============================================================
              OPTION B: PASTE SUMMARY NOTES & FORMULAS (NO PDF NEEDED)
             =============================================================== */}
          {uploadMode === "note" && (
            <div className="space-y-3.5 bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E6E0D4]">
              <div>
                <label className="text-xs font-bold text-[#18181B] block mb-1">
                  Topic or Note Title *
                </label>
                <Input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={`e.g. ${
                    selectedCourse?.code || "MTH 101"
                  } Week 1 Lecture Summary: Sets & Real Numbers`}
                  className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs sm:text-sm font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18181B] block mb-1">
                  Type or Paste Lecture Notes Below *
                </label>
                <Textarea
                  value={noteSummary}
                  onChange={(e) => setNoteSummary(e.target.value)}
                  rows={5}
                  placeholder="Paste or type your lecture summary, bullet points, or explanations here…"
                  className="rounded-xl bg-white border-[#E6E0D4] text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#18181B] block mb-1">
                  Key Formulas to Remember (Optional)
                </label>
                <Textarea
                  value={noteFormulas}
                  onChange={(e) => setNoteFormulas(e.target.value)}
                  rows={2}
                  placeholder="e.g. Quadratic Formula: x = (-b ± √(b² - 4ac)) / 2a"
                  className="rounded-xl bg-white border-[#E6E0D4] font-mono text-xs"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handlePublishPastedNote}
                  disabled={isSavingNote}
                  className="h-11 px-6 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] font-bold text-xs sm:text-sm cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  <span>
                    {isSavingNote
                      ? "Saving Note…"
                      : `Save & Publish Note to ${selectedCourse?.code || "Course"}`}
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* ===============================================================
              OPTION C: BULK CBT QUIZ STUDIO (MULTI-CSV + PASTE + AI + SPLIT)
             =============================================================== */}
          {uploadMode === "questions" && (
            <div className="space-y-5 bg-[#FAF8F5] p-4 sm:p-5 rounded-2xl border border-[#E6E0D4]">
              {/* Top Row: Quiz Title, Timer & Packaging Mode (1 Exam vs Auto-Split CBT Sets) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pb-4 border-b border-[#E6E0D4]">
                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-[#18181B] block mb-1">
                    CBT Exam Title
                  </label>
                  <Input
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder={`e.g. ${selectedCourse?.code || "MTH 101"} ${
                      activeSemester === "1st" ? "1st Semester" : "2nd Semester"
                    } Past Questions`}
                    className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs sm:text-sm font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-[#18181B] block mb-1">
                    Timer (Mins)
                  </label>
                  <Input
                    type="number"
                    value={quizDuration}
                    onChange={(e) => setQuizDuration(e.target.value)}
                    className="h-10 rounded-xl bg-white border-[#E6E0D4] font-mono text-xs font-bold"
                  />
                </div>

                <div className="md:col-span-5">
                  <label className="text-xs font-bold text-[#18181B] block mb-1">
                    Large Batch Packaging (Single vs. Auto-Split Sets)
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={quizPackagingMode}
                      onChange={(e) =>
                        setQuizPackagingMode(e.target.value as "single" | "split")
                      }
                      className="flex-1 h-10 rounded-xl border border-[#E6E0D4] bg-white px-3 text-xs font-bold text-[#18181B]"
                    >
                      <option value="single">Keep as 1 Complete Exam Paper</option>
                      <option value="split">
                        Auto-Split into CBT Sets (Part 1, Part 2…)
                      </option>
                    </select>

                    {quizPackagingMode === "split" && (
                      <select
                        value={quizSplitSize}
                        onChange={(e) => setQuizSplitSize(Number(e.target.value))}
                        className="w-28 h-10 rounded-xl border border-[#D4AF37] bg-white px-2.5 font-mono text-xs font-bold text-[#18181B]"
                        title="Questions per CBT part"
                      >
                        <option value={20}>20 Qs / Part</option>
                        <option value={25}>25 Qs / Part</option>
                        <option value={30}>30 Qs / Part</option>
                        <option value={50}>50 Qs / Part</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 Sub-Mode Switcher for Adding Bulk Questions */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#18181B]">
                    How Would You Like to Add Questions? (You Can Combine All 3!)
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37] bg-white hover:bg-[#D4AF37]/15 text-xs font-bold text-[#18181B] cursor-pointer shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#B48A1E]" />
                    <span>1-Click Download Sample CSV Template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 rounded-xl bg-[#EFECE6] border border-[#E6E0D4]">
                  <button
                    type="button"
                    onClick={() => setQuizInputMethod("csv")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quizInputMethod === "csv"
                        ? "bg-white text-[#18181B] shadow-2xs border border-[#E6E0D4]"
                        : "text-[#52525B] hover:text-[#18181B]"
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#B48A1E]" />
                    <span>1. Drop CSV / TXT Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizInputMethod("paste")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quizInputMethod === "paste"
                        ? "bg-white text-[#18181B] shadow-2xs border border-[#E6E0D4]"
                        : "text-[#52525B] hover:text-[#18181B]"
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-[#B48A1E]" />
                    <span>2. Bulk Copy-Paste Text</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuizInputMethod("ai")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      quizInputMethod === "ai"
                        ? "bg-white text-[#18181B] shadow-2xs border border-[#E6E0D4]"
                        : "text-[#52525B] hover:text-[#18181B]"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#B48A1E]" />
                    <span>3. AI Quiz Generator from Notes</span>
                  </button>
                </div>

                {/* SUB-MODE 1: MULTI-FILE CSV / TXT DROPZONE */}
                {quizInputMethod === "csv" && (
                  <div className="space-y-3">
                    <div className="relative border-2 border-dashed border-[#D4AF37] hover:border-[#18181B] rounded-2xl p-6 text-center bg-white transition-all group cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".csv,.txt"
                        onChange={handleMultiCsvFileSelect}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="flex flex-col items-center pointer-events-none">
                        <div className="w-11 h-11 rounded-2xl bg-[#18181B] text-[#D4AF37] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <h4 className="font-display font-extrabold text-sm text-[#18181B]">
                          Drop One or Multiple .CSV or .TXT Question Files Here
                        </h4>
                        <p className="text-xs text-[#71717A] mt-0.5 max-w-lg">
                          Supports Excel CSV spreadsheets (`question, option_a, option_b, option_c, option_d, correct_option, explanation`) or numbered `.txt` past-question files.
                        </p>
                      </div>
                    </div>

                    {csvBatchFiles.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {csvBatchFiles.map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E6E0D4] text-xs font-semibold text-[#18181B]"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#B48A1E]" />
                            <span>{f.filename}</span>
                            <span className="font-mono tabular-nums text-[11px] font-bold text-[#9A7B1C]">
                              ({f.questionCount} Qs)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCsvBatchFiles((prev) => prev.filter((x) => x.id !== f.id))
                              }
                              className="text-[#71717A] hover:text-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB-MODE 2: BULK COPY-PASTE QUESTIONS */}
                {quizInputMethod === "paste" && (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-[#52525B]">
                        Paste 5 to 200+ questions from Word, PDF, or WhatsApp below:
                      </span>
                      <button
                        type="button"
                        onClick={handleLoadSampleQuestions}
                        className="px-2.5 py-1 rounded-lg border border-[#E6E0D4] bg-white hover:border-[#D4AF37] text-[11px] font-bold text-[#9A7B1C] cursor-pointer"
                      >
                        Insert 3 Example Questions
                      </button>
                    </div>
                    <Textarea
                      value={questionsRawText}
                      onChange={(e) => {
                        setQuestionsRawText(e.target.value);
                        setRemovedStagedIndices(new Set());
                      }}
                      rows={7}
                      placeholder={
                        "Paste questions like this:\nQ1: What is the derivative of sin(x)?\nA) cos(x)\nB) -cos(x)\nC) tan(x)\nD) sec(x)\nANS: A\nEXP: Standard derivative of sin(x) is cos(x)."
                      }
                      className="rounded-xl bg-white border-[#E6E0D4] font-mono text-xs"
                    />
                  </div>
                )}

                {/* SUB-MODE 3: 1-CLICK AI QUIZ GENERATOR FROM UPLOADED COURSE NOTES */}
                {quizInputMethod === "ai" && (
                  <div className="rounded-2xl border border-[#D4AF37]/60 bg-white p-4 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7B1C] block">
                          Grounded AI Question Bank Builder
                        </span>
                        <h4 className="font-display text-sm font-extrabold text-[#18181B]">
                          Generate Verified CBT Questions Directly from{" "}
                          {selectedCourse?.code || "Course"} Notes
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-[#52525B]">Questions:</label>
                        <select
                          value={aiQuestionCount}
                          onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                          className="h-9 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] px-2.5 font-mono text-xs font-bold text-[#18181B]"
                        >
                          <option value={5}>5 Questions</option>
                          <option value={10}>10 Questions</option>
                          <option value={15}>15 Questions</option>
                          <option value={20}>20 Questions</option>
                          <option value={25}>25 Questions</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#18181B] block">
                        Select Source Note or Paste Syllabus Excerpt
                      </label>
                      <select
                        value={selectedSourceNoteId}
                        onChange={(e) => setSelectedSourceNoteId(e.target.value)}
                        className="w-full h-10 rounded-xl border border-[#E6E0D4] bg-[#FAF8F5] px-3 text-xs font-bold text-[#18181B]"
                      >
                        {selectedCourseNotes.map((n) => (
                          <option key={n.id} value={n.id}>
                            Uploaded Note: {n.title}
                          </option>
                        ))}
                        <option value="custom">
                          Paste Custom Lecture Notes / Topic Excerpt Below
                        </option>
                      </select>
                    </div>

                    {selectedSourceNoteId === "custom" && (
                      <Textarea
                        value={customAiNoteText}
                        onChange={(e) => setCustomAiNoteText(e.target.value)}
                        rows={4}
                        placeholder={`Paste lecture notes, definitions, or theorems for ${
                          selectedCourse?.code || "this course"
                        } here and click Generate…`}
                        className="rounded-xl bg-[#FAF8F5] border-[#E6E0D4] text-xs"
                      />
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleGenerateAiQuestions}
                        disabled={isGeneratingAiQuiz}
                        className="h-10 px-5 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] font-bold text-xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        <span>
                          {isGeneratingAiQuiz
                            ? `Generating ${aiQuestionCount} CBT Questions…`
                            : `Generate ${aiQuestionCount} CBT Questions into Staging`}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* STAGED QUESTIONS PREVIEWER & PACKAGING SUMMARY */}
              {allCombinedStagedQuestions.length > 0 && (
                <div className="rounded-2xl border border-[#E6E0D4] bg-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#B48A1E]" />
                      <span className="text-xs font-extrabold text-[#18181B]">
                        Staged Question Bank:{" "}
                        <span className="font-mono tabular-nums text-[#9A7B1C]">
                          {allCombinedStagedQuestions.length} Questions
                        </span>
                      </span>
                      {plannedQuizPackages.length > 1 && (
                        <span className="px-2 py-0.5 rounded-md bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[11px] font-bold">
                          Auto-Splits into {plannedQuizPackages.length} CBT Papers
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowStagedPreview((v) => !v)}
                        className="text-xs font-bold text-[#9A7B1C] hover:underline cursor-pointer"
                      >
                        {showStagedPreview ? "Hide Question Preview" : "Show Question Preview"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvBatchFiles([]);
                          setQuestionsRawText("");
                          setAiStagedQuestions([]);
                          setRemovedStagedIndices(new Set());
                        }}
                        className="text-xs font-semibold text-[#71717A] hover:text-rose-600 cursor-pointer"
                      >
                        Clear All Staged
                      </button>
                    </div>
                  </div>

                  {/* Planned Split Papers Bar */}
                  {plannedQuizPackages.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {plannedQuizPackages.map((pkg) => (
                        <span
                          key={pkg.partIndex}
                          className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E6E0D4] text-[11px] font-mono text-[#18181B]"
                        >
                          <strong>Part {pkg.partIndex}:</strong> {pkg.questions.length} Qs ·{" "}
                          {pkg.duration_minutes}m
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Scrollable Staged Questions Preview List */}
                  {showStagedPreview && (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 pt-1">
                      {allCombinedStagedQuestions.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-[#EFECE6] bg-[#FAF8F5] flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold">
                                Q{idx + 1}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 font-mono text-[10px] font-bold">
                                Correct: Option {q.correct_option}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-[#18181B] leading-snug">
                              {q.question_text}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[#52525B]">
                              <span
                                className={
                                  q.correct_option === "A"
                                    ? "font-bold text-emerald-800"
                                    : ""
                                }
                              >
                                A) {q.option_a}
                              </span>
                              <span
                                className={
                                  q.correct_option === "B"
                                    ? "font-bold text-emerald-800"
                                    : ""
                                }
                              >
                                B) {q.option_b}
                              </span>
                              <span
                                className={
                                  q.correct_option === "C"
                                    ? "font-bold text-emerald-800"
                                    : ""
                                }
                              >
                                C) {q.option_c}
                              </span>
                              <span
                                className={
                                  q.correct_option === "D"
                                    ? "font-bold text-emerald-800"
                                    : ""
                                }
                              >
                                D) {q.option_d}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setRemovedStagedIndices((prev) => new Set([...prev, idx]))
                            }
                            className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-600 cursor-pointer shrink-0"
                            title="Remove this question from staging"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <span className="text-xs font-mono tabular-nums text-[#52525B]">
                  Ready to publish:{" "}
                  <strong className="text-[#18181B]">
                    {allCombinedStagedQuestions.length} CBT question
                    {allCombinedStagedQuestions.length === 1 ? "" : "s"}
                  </strong>
                  {plannedQuizPackages.length > 1 && (
                    <span className="text-[#9A7B1C] font-bold">
                      {" "}
                      ({plannedQuizPackages.length} CBT exam sets)
                    </span>
                  )}
                </span>

                <Button
                  onClick={handlePublishQuestions}
                  disabled={isSavingQuestions || allCombinedStagedQuestions.length === 0}
                  className="h-11 px-6 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-display font-black text-xs sm:text-sm cursor-pointer"
                >
                  {isSavingQuestions
                    ? "Publishing CBT Exam(s)…"
                    : plannedQuizPackages.length > 1
                    ? `Publish ${plannedQuizPackages.length} Split CBT Sets (${allCombinedStagedQuestions.length} Qs) to ${
                        selectedCourse?.code || "Course"
                      }`
                    : `Save & Publish ${allCombinedStagedQuestions.length} Question(s) to ${
                        selectedCourse?.code || "Course"
                      }`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          3. UNIFIED ACADEMIC SESSION INVENTORY (MATERIALS + PUBLISHED QUIZZES)
         ===================================================================== */}
      <section className="rounded-3xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-border/80">
          <div className="space-y-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Academic Session Content &amp; Exam Directory
            </span>
            {/* Dual-Tab Switcher: Study Materials vs. Published CBT Quizzes */}
            <div className="max-w-full overflow-x-auto no-scrollbar">
              <div className="inline-flex p-1 rounded-2xl bg-secondary border border-border">
                <button
                  type="button"
                  onClick={() => setInventoryTab("materials")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                    inventoryTab === "materials"
                      ? "bg-foreground text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Uploaded Materials ({filteredMaterials.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setInventoryTab("quizzes")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                    inventoryTab === "quizzes"
                      ? "bg-foreground text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                  <span>Published CBT Quizzes ({filteredQuizzes.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Semester Filter + Course Filter + Search */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            <div className="max-w-full overflow-x-auto no-scrollbar">
              <div className="inline-flex p-1 rounded-xl bg-secondary border border-border">
                {(["all", "1st", "2nd"] as const).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setManagerSemesterFilter(sem)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[36px] ${
                      managerSemesterFilter === sem
                        ? "bg-foreground text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {sem === "all"
                      ? "All Semesters"
                      : sem === "1st"
                      ? "1st Semester"
                      : "2nd Semester"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:flex items-center gap-2">
              <select
                value={managerCourseFilter}
                onChange={(e) => setManagerCourseFilter(e.target.value)}
                className="h-10 w-full sm:w-auto rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} ({c.semester} Sem)
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  placeholder="Search title or course…"
                  className="h-10 w-full pl-8 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* TAB 1: UPLOADED MATERIALS (Mobile Stacked Cards + Desktop Table) */}
        {inventoryTab === "materials" ? (
          loadingMaterials ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Loading materials from Supabase PostgreSQL &amp; Server Store…
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center space-y-2">
              <FileText className="w-7 h-7 text-primary mx-auto opacity-80" />
              <p className="text-xs sm:text-sm font-bold text-foreground">
                No study materials uploaded for this filter yet
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Use Option A (PDF/Word) or Option B (Summary Notes) in Step 3 above to upload handouts for your 1st or 2nd Semester courses.
              </p>
            </div>
          ) : (
            <>
              {/* MOBILE & TABLET STACKED CARD LIST (Zero horizontal scroll trapping) */}
              <div className="md:hidden space-y-3">
                {filteredMaterials.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-border bg-background p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono tabular-nums">
                          <span className="px-2 py-0.5 rounded bg-foreground text-primary font-bold">
                            {row.course_code}
                          </span>
                          <span className="font-bold text-primary">
                            {row.semester === "1st" ? "1st Sem" : "2nd Sem"}
                          </span>
                          <span className="text-muted-foreground">· {row.level}</span>
                          <span className="uppercase text-muted-foreground">· {row.file_type}</span>
                          {row.source === "server" ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-sans font-bold text-[10px]">
                              Preview Only — Click Sync
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-sans font-bold text-[10px]">
                              Live on Website
                            </span>
                          )}
                        </div>
                        <p className="font-display font-bold text-sm text-foreground leading-snug">
                          {row.title}
                        </p>
                        {row.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {row.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {verifiedMap[row.id] && (
                      <div
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${
                          verifiedMap[row.id].ok
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        }`}
                      >
                        {verifiedMap[row.id].label}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/80">
                      {(row.file_url || row.file_path) && (
                        <>
                          <button
                            type="button"
                            disabled={verifyingId === row.id}
                            onClick={() => void handleVerifyMaterialLive(row)}
                            className="min-h-[40px] px-3 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{verifyingId === row.id ? "Checking…" : "Verify"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewRow(row)}
                            className="min-h-[40px] px-3 py-2 rounded-xl border border-border bg-card hover:border-primary text-foreground font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0 text-primary" />
                            <span>Open</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void downloadMaterialExternally({
                                id: row.id,
                                title: row.title,
                                courseCode: row.course_code,
                                fileUrl: row.file_url,
                                filePath: row.file_path,
                                fileType: row.file_type,
                                description: row.description,
                              })
                            }
                            className="min-h-[40px] px-3 py-2 rounded-xl border border-border bg-card hover:border-primary text-foreground font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 shrink-0 text-primary" />
                            <span>Download</span>
                          </button>
                        </>
                      )}
                      {row.file_type !== "markdown" && row.file_type !== "md" && (
                        <button
                          type="button"
                          disabled={replacingBusyId === row.id}
                          onClick={() => triggerReplaceFile(row)}
                          className="min-h-[40px] px-3 py-2 rounded-xl border border-border bg-card hover:border-primary text-foreground font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <span>{replacingBusyId === row.id ? "Uploading…" : "Replace PDF"}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(row)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-border bg-card hover:border-primary text-foreground font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 shrink-0" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(row)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:border-rose-500 text-rose-600 dark:text-rose-400 font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP HAIRLINE TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-3">Semester &amp; Level</th>
                      <th className="py-2.5 px-3">Course</th>
                      <th className="py-2.5 px-3">Material Title &amp; Summary</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70 text-xs">
                    {filteredMaterials.map((row) => (
                      <tr key={row.id} className="hover:bg-background/80 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="font-mono tabular-nums font-bold text-primary">
                            {row.semester === "1st" ? "1st Semester" : "2nd Semester"}
                          </span>
                          <span className="text-muted-foreground font-mono tabular-nums">
                            {" "}· {row.level}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top">
                          <span className="px-2 py-0.5 rounded bg-foreground text-primary font-mono text-[11px] font-bold">
                            {row.course_code}
                          </span>
                        </td>
                        <td className="py-3 px-3 align-top max-w-md">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-bold text-foreground leading-snug">{row.title}</p>
                            {row.source === "server" ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                                Preview Only — Click Sync
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                                Live on Website
                              </span>
                            )}
                          </div>
                          {row.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {row.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top font-mono uppercase text-[11px] text-muted-foreground">
                          {row.file_type}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap align-top text-right">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            {verifiedMap[row.id] && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  verifiedMap[row.id].ok
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                }`}
                              >
                                {verifiedMap[row.id].label}
                              </span>
                            )}
                            {(row.file_url || row.file_path) && (
                              <>
                                <button
                                  type="button"
                                  disabled={verifyingId === row.id}
                                  onClick={() => void handleVerifyMaterialLive(row)}
                                  className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  title="Run live verification check on this document"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{verifyingId === row.id ? "Checking…" : "Verify"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPreviewRow(row)}
                                  className="p-1.5 rounded-lg border border-border bg-card hover:border-primary text-foreground cursor-pointer"
                                  title="Open / Preview File"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void downloadMaterialExternally({
                                      id: row.id,
                                      title: row.title,
                                      courseCode: row.course_code,
                                      fileUrl: row.file_url,
                                      filePath: row.file_path,
                                      fileType: row.file_type,
                                      description: row.description,
                                    })
                                  }
                                  className="p-1.5 rounded-lg border border-border bg-card hover:border-primary text-foreground cursor-pointer"
                                  title="Download File to Device"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {row.file_type !== "markdown" && row.file_type !== "md" && (
                              <button
                                type="button"
                                disabled={replacingBusyId === row.id}
                                onClick={() => triggerReplaceFile(row)}
                                className="px-2.5 py-1.5 rounded-lg border border-border bg-card hover:border-primary text-foreground font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Re-upload / Replace PDF file into permanent cloud storage"
                              >
                                <Upload className="w-3 h-3 text-primary" />
                                <span>{replacingBusyId === row.id ? "Uploading…" : "Replace PDF"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="p-1.5 rounded-lg border border-border bg-card hover:border-primary text-foreground cursor-pointer"
                              title="Edit Title, Summary, or Course"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(row)}
                              className="p-1.5 rounded-lg border border-border bg-card hover:border-rose-500 text-rose-600 cursor-pointer"
                              title="Delete Material"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          /* TAB 2: PUBLISHED CBT QUIZZES & QUESTION BANKS TABLE */
          loadingMaterials ? (
            <div className="py-8 text-center text-xs text-[#71717A]">
              Loading published CBT quizzes from Supabase &amp; Server Store…
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E0D4] bg-[#FAF8F5] p-8 text-center space-y-2">
              <ClipboardList className="w-7 h-7 text-[#9A7B1C] mx-auto opacity-70" />
              <p className="text-xs sm:text-sm font-bold text-[#18181B]">
                No CBT quizzes published for this filter yet
              </p>
              <p className="text-xs text-[#71717A] max-w-md mx-auto">
                Switch to Option C (Bulk CBT Quiz Studio) in Step 3 above to drop CSV files, paste past questions, or generate questions from your course notes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6E0D4] text-[11px] font-extrabold uppercase tracking-wider text-[#71717A]">
                    <th className="py-2.5 px-3">Semester &amp; Level</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3">CBT Exam Title</th>
                    <th className="py-2.5 px-3">Questions</th>
                    <th className="py-2.5 px-3">Timer</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] text-xs">
                  {filteredQuizzes.map((qz) => (
                    <tr key={qz.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <span className="font-mono font-bold text-[#9A7B1C]">
                          {qz.semester === "1st" ? "1st Semester" : "2nd Semester"}
                        </span>
                        <span className="text-[#71717A] font-mono"> · {qz.level}</span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top">
                        <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono text-[11px] font-bold">
                          {qz.course_code}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top max-w-md">
                        <p className="font-bold text-[#18181B] leading-snug">{qz.title}</p>
                        <p className="text-[11px] text-[#71717A] line-clamp-1 mt-0.5">
                          {qz.course_name}
                        </p>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top font-mono tabular-nums font-bold text-[#18181B]">
                        {qz.question_count} Qs
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top font-mono tabular-nums text-[#52525B]">
                        {qz.duration_minutes} mins
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleInspectQuiz(qz)}
                            className="px-2.5 py-1 rounded-lg border border-[#D4AF37] bg-[#FAF8F5] hover:bg-[#D4AF37]/20 text-[#18181B] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Preview all questions & answers in this quiz"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#B48A1E]" />
                            <span>Preview Questions</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditQuizModal(qz)}
                            className="p-1.5 rounded-lg border border-[#E6E0D4] bg-white hover:border-[#D4AF37] text-[#18181B] cursor-pointer"
                            title="Edit Quiz Title, Timer, or Course"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteQuiz(qz)}
                            className="p-1.5 rounded-lg border border-[#E6E0D4] bg-white hover:border-rose-500 text-rose-600 cursor-pointer"
                            title="Delete CBT Quiz"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      {/* =====================================================================
          QUESTION INSPECTOR / PREVIEW MODAL FOR PUBLISHED QUIZZES
         ===================================================================== */}
      <Dialog
        open={!!inspectingQuiz}
        onOpenChange={(open) => !open && setInspectingQuiz(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <span className="px-2.5 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono text-xs font-bold">
                {inspectingQuiz?.course_code} ·{" "}
                {inspectingQuiz?.semester === "1st" ? "1st Semester" : "2nd Semester"}
              </span>
              {inspectingQuiz && (
                <Button
                  size="sm"
                  onClick={() => {
                    const qId = inspectingQuiz.id;
                    setInspectingQuiz(null);
                    navigate(`/quiz/${qId}`);
                  }}
                  className="h-8 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#C59F2D] text-[#18181B] font-bold text-xs cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Test CBT Exam Now</span>
                </Button>
              )}
            </div>
            <DialogTitle className="font-display text-base sm:text-lg font-extrabold text-[#18181B] pt-1">
              {inspectingQuiz?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52525B] font-mono tabular-nums">
              {inspectingQuiz?.questions.length || inspectingQuiz?.question_count || 0} Verified Questions ·{" "}
              {inspectingQuiz?.duration_minutes} Minutes Timer
            </DialogDescription>
          </DialogHeader>

          {loadingQuizDetails ? (
            <div className="py-8 text-center text-xs text-[#71717A]">
              Loading questions and answer keys…
            </div>
          ) : !inspectingQuiz?.questions || inspectingQuiz.questions.length === 0 ? (
            <div className="rounded-xl border border-[#E6E0D4] bg-white p-6 text-center text-xs text-[#71717A]">
              No individual question rows found for this quiz.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {inspectingQuiz.questions.map((q, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-[#E6E0D4] bg-white space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#18181B] text-[#D4AF37] font-mono tabular-nums text-[10px] font-bold">
                        Question {idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 font-mono text-[10px] font-bold">
                        Answer: Option {q.correct_option}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemoveQuestionFromPublishedQuiz(idx)}
                      className="text-xs text-[#71717A] hover:text-rose-600 cursor-pointer inline-flex items-center gap-1"
                      title="Delete this question from the quiz"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-[#18181B] leading-snug">
                    {q.question_text}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const optKey = `option_${letter.toLowerCase()}` as
                        | "option_a"
                        | "option_b"
                        | "option_c"
                        | "option_d";
                      const isCorrect = q.correct_option === letter;
                      return (
                        <div
                          key={letter}
                          className={`px-2.5 py-1.5 rounded-lg border ${
                            isCorrect
                              ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-900"
                              : "border-[#EFECE6] bg-[#FAF8F5] text-[#52525B]"
                          }`}
                        >
                          <span className="font-mono font-bold mr-1.5">{letter}.</span>
                          <span>{q[optKey]}</span>
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-[#71717A] bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EFECE6]">
                      <strong className="text-[#18181B]">Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Published Quiz Modal */}
      <Dialog open={!!editingQuiz} onOpenChange={(open) => !open && setEditingQuiz(null)}>
        <DialogContent className="max-w-md rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-extrabold text-[#18181B]">
              Edit Published CBT Quiz
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52525B]">
              Update the exam title, timer duration, or assigned course.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">
                Assigned Course
              </label>
              <select
                value={editQuizCourseId}
                onChange={(e) => setEditQuizCourseId(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E6E0D4] bg-white px-3 text-xs font-bold text-[#18181B]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} ({c.semester} Sem)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">
                CBT Exam Title
              </label>
              <Input
                value={editQuizTitle}
                onChange={(e) => setEditQuizTitle(e.target.value)}
                className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">
                Duration (Minutes)
              </label>
              <Input
                type="number"
                value={editQuizDuration}
                onChange={(e) => setEditQuizDuration(e.target.value)}
                className="h-10 rounded-xl bg-white border-[#E6E0D4] font-mono text-xs font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setEditingQuiz(null)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveQuizEdit}
                disabled={savingQuizEdit}
                className="h-9 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] font-bold text-xs cursor-pointer"
              >
                {savingQuizEdit ? "Saving…" : "Save Quiz Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Material Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-extrabold text-[#18181B]">
              Edit Material Details
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52525B]">
              Changes are saved immediately to both Supabase PostgreSQL and the server store.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">Assigned Course</label>
              <select
                value={editCourseId}
                onChange={(e) => setEditCourseId(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E6E0D4] bg-white px-3 text-xs font-bold text-[#18181B]"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} ({c.semester} Sem)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">Material Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-10 rounded-xl bg-white border-[#E6E0D4] text-xs font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#18181B] block mb-1">
                Summary / Description / Content
              </label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="rounded-xl bg-white border-[#E6E0D4] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setEditingItem(null)}
                className="h-9 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="h-9 px-4 rounded-xl bg-[#18181B] hover:bg-[#27272A] text-[#D4AF37] font-bold text-xs cursor-pointer"
              >
                {savingEdit ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wipe & Reset All Data Confirmation Modal */}
      <Dialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <DialogContent className="max-w-md rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-extrabold text-[#18181B]">
              Wipe All Courses, Materials, Notes &amp; Quizzes?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52525B] leading-relaxed">
              This will permanently remove all current courses, uploaded PDFs, pasted lecture notes, and CBT question banks across Supabase PostgreSQL, the server store, and offline caches so you start with a 100% clean slate.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmWipeOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWipeAllData}
              disabled={isWipingAll}
              className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer"
            >
              {isWipingAll ? "Wiping All Data…" : "Yes, Wipe Everything Clean"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wipe Materials Only Confirmation Modal (Preserves Courses & CBT Quizzes) */}
      <Dialog open={confirmMaterialsWipeOpen} onOpenChange={setConfirmMaterialsWipeOpen}>
        <DialogContent className="max-w-md rounded-2xl border-[#E6E0D4] bg-[#FAF8F5] text-[#18181B]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-extrabold text-[#18181B]">
              Wipe All Uploaded Materials &amp; Notes Only?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#52525B] leading-relaxed">
              This removes all uploaded PDFs and lecture notes across Supabase, the server store, and offline caches so you start fresh. Your courses and CBT quizzes will stay untouched.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="ghost"
              onClick={() => setConfirmMaterialsWipeOpen(false)}
              className="h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleWipeMaterialsOnly}
              disabled={isWipingMaterials}
              className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              {isWipingMaterials ? "Wiping Materials…" : "Yes, Wipe All Materials"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden file input for one-click Replace / Re-upload PDF */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx"
        onChange={handleReplaceMaterialFile}
        className="hidden"
      />

      {/* Verified In-App Document Viewer */}
      {previewRow && (
        <InAppDocViewer
          open={!!previewRow}
          onOpenChange={(open) => !open && setPreviewRow(null)}
          id={previewRow.id}
          url={previewRow.file_url}
          filePath={previewRow.file_path}
          title={previewRow.title}
          courseCode={previewRow.course_code}
          description={previewRow.description}
          fileType={previewRow.file_type}
        />
      )}
    </div>
  );
};

export default QuickResourceUpload;
