import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Loader2,
  BookOpen,
  Clock,
  Coins
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { classifyTopic } from "@/lib/germanTopicClassifier";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LevelSelect, levelToDb } from "@/components/shared/LevelSelect";

interface ImportedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  difficulty: string;
  topic: string;
}

interface ImportedQuiz {
  title: string;
  description: string;
  course_code: string;
  course_name: string;
  duration_minutes: number;
  is_premium: boolean;
  token_cost: number;
  is_simulation: boolean;
  questions: ImportedQuestion[];
}

interface RejectedRow {
  row: number;
  reason: string;
  missing_fields: string[];
  data: Record<string, any>;
}

interface BulkQuizImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** When true, fetch ALL courses (admin scope) instead of only those created by the current user. */
  adminScope?: boolean;
}

interface ProcessingStatus {
  stage: "reading" | "parsing" | "validating" | "creating" | "complete";
  progress: number;
  message: string;
  totalRows?: number;
  processedRows?: number;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export function BulkQuizImport({ open, onOpenChange, onSuccess, adminScope = false }: BulkQuizImportProps) {
  const { user } = useAuth();
  const [importedQuizzes, setImportedQuizzes] = useState<ImportedQuiz[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [rejectedRows, setRejectedRows] = useState<RejectedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<"upload" | "preview">("upload");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [existingCourses, setExistingCourses] = useState<Course[]>([]);
  const [defaultLevel, setDefaultLevel] = useState("ALL");
  const [importedFileName, setImportedFileName] = useState<string>("");
  const [importedFileSize, setImportedFileSize] = useState<number>(0);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing courses on mount
  useState(() => {
    const fetchCourses = async () => {
      if (!user) return;
      const query = supabase.from("courses").select("id, code, name");
      const { data } = adminScope ? await query : await query.eq("created_by", user.id);
      if (data) setExistingCourses(data);
    };
    fetchCourses();
  });

  const isQuizValid = (q: ImportedQuiz): boolean => {
    return !!(
      q.title.trim() &&
      q.course_code.trim() &&
      q.duration_minutes > 0 &&
      q.questions.length > 0 &&
      q.questions.every(isQuestionValid)
    );
  };

  const isQuestionValid = (q: ImportedQuestion): boolean => {
    return !!(
      q.question_text.trim() &&
      q.option_a.trim() &&
      q.option_b.trim() &&
      q.option_c.trim() &&
      q.option_d.trim() &&
      ["A", "B", "C", "D"].includes(q.correct_option.toUpperCase())
    );
  };

  // Parse Word document tables to JSON
  const parseWordDocument = async (file: File): Promise<any[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    // Create a temporary DOM element to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");
    
    if (tables.length === 0) {
      throw new Error("No tables found in the Word document. Please ensure your document contains a table with quiz data.");
    }
    
    const jsonData: any[] = [];
    const table = tables[0]; // Use the first table
    const rows = table.querySelectorAll("tr");
    
    if (rows.length < 2) {
      throw new Error("Table must have at least a header row and one data row.");
    }
    
    // Get headers from first row
    const headerRow = rows[0];
    const headers: string[] = [];
    headerRow.querySelectorAll("th, td").forEach((cell) => {
      headers.push((cell.textContent || "").trim().toLowerCase().replace(/\s+/g, "_"));
    });
    
    // Parse data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll("td");
      const rowData: any = {};
      
      cells.forEach((cell, index) => {
        if (index < headers.length) {
          rowData[headers[index]] = (cell.textContent || "").trim();
        }
      });
      
      // Only add if row has some data
      if (Object.values(rowData).some(v => v)) {
        jsonData.push(rowData);
      }
    }
    
    return jsonData;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setRejectedRows([]);
    setImportedQuizzes([]);
    setDetectedColumns([]);
    setImportedFileName(file.name);
    setImportedFileSize(file.size);
    setProcessingStatus({ stage: "reading", progress: 0, message: "Reading file..." });

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      
      if (!["csv", "xlsx", "xls", "docx"].includes(fileExtension || "")) {
        throw new Error("Please upload a CSV, Excel, or Word file (.csv, .xlsx, .xls, .docx)");
      }

      setProcessingStatus({ stage: "reading", progress: 20, message: `Reading ${file.name}...` });
      
      let jsonData: any[];
      
      if (fileExtension === "docx") {
        setProcessingStatus({ stage: "parsing", progress: 40, message: "Extracting tables from Word document..." });
        jsonData = await parseWordDocument(file);
      } else {
        const data = await file.arrayBuffer();
        setProcessingStatus({ stage: "parsing", progress: 40, message: "Parsing spreadsheet data..." });
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      }

      if (jsonData.length === 0) {
        throw new Error("The file appears to be empty");
      }

      // Capture detected headers from first row for mapping summary
      if (jsonData[0]) setDetectedColumns(Object.keys(jsonData[0]));


      setProcessingStatus({ 
        stage: "validating", 
        progress: 60, 
        message: `Validating ${jsonData.length} rows...`,
        totalRows: jsonData.length,
        processedRows: 0
      });

      // Group rows by quiz title - each row is one question for a quiz
      const quizMap = new Map<string, { quizData: any; questions: any[] }>();
      const parseErrors: string[] = [];
      const rejected: RejectedRow[] = [];
      const pushReject = (rowNum: number, row: any, missing: string[], reason: string) => {
        parseErrors.push(`Row ${rowNum}: ${reason}`);
        rejected.push({ row: rowNum, reason, missing_fields: missing, data: row });
      };

      for (let index = 0; index < jsonData.length; index++) {
        const row = jsonData[index] as any;
        const rowNum = index + 2;

        if (index % 5 === 0 || index === jsonData.length - 1) {
          const validationProgress = 60 + ((index / jsonData.length) * 35);
          setProcessingStatus({ 
            stage: "validating", 
            progress: validationProgress, 
            message: `Validating row ${index + 1} of ${jsonData.length}...`,
            totalRows: jsonData.length,
            processedRows: index + 1
          });
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        // Quiz metadata
        const title = String(row.quiz_title || row.title || row.Title || row["Quiz Title"] || "").trim();
        const courseCode = String(row.course_code || row.Course_Code || row["Course Code"] || "").trim().toUpperCase();
        const courseName = String(row.course_name || row.Course_Name || row["Course Name"] || courseCode).trim();
        const durationMinutes = parseInt(row.duration_minutes || row.Duration || row["Duration (mins)"] || "30", 10);
        const isPremium = String(row.is_premium || row.Premium || row["Is Premium"] || "false").toLowerCase() === "true";
        const tokenCost = parseInt(row.token_cost || row.Cost || row["Token Cost"] || "0", 10);
        const isSimulation = String(row.is_simulation || row.Simulation || row["Is Simulation"] || "false").toLowerCase() === "true";

        // Question data
        const questionText = String(row.question_text || row.Question || row["Question Text"] || "").trim();
        const optionA = String(row.option_a || row.Option_A || row["Option A"] || "").trim();
        const optionB = String(row.option_b || row.Option_B || row["Option B"] || "").trim();
        const optionC = String(row.option_c || row.Option_C || row["Option C"] || "").trim();
        const optionD = String(row.option_d || row.Option_D || row["Option D"] || "").trim();
        const correctOption = String(row.correct_option || row.Correct || row["Correct Option"] || row.Answer || "").trim().toUpperCase();
        const explanation = String(row.explanation || row.Explanation || "").trim();
        const difficulty = String(row.difficulty || row.Difficulty || "medium").trim().toLowerCase();
        const rawTopic = String(row.topic || row.Topic || row["Topic"] || row.tag || row.Tag || "").trim();

        // Validate required fields
        if (!title) {
          pushReject(rowNum, row, ["quiz_title"], "Missing quiz title");
          continue;
        }
        if (!courseCode) {
          pushReject(rowNum, row, ["course_code"], "Missing course code");
          continue;
        }
        if (!questionText) {
          pushReject(rowNum, row, ["question_text"], "Missing question text");
          continue;
        }
        const missingOpts: string[] = [];
        if (!optionA) missingOpts.push("option_a");
        if (!optionB) missingOpts.push("option_b");
        if (!optionC) missingOpts.push("option_c");
        if (!optionD) missingOpts.push("option_d");
        if (missingOpts.length) {
          pushReject(rowNum, row, missingOpts, `Missing options: ${missingOpts.join(", ")}`);
          continue;
        }
        if (!["A", "B", "C", "D"].includes(correctOption)) {
          pushReject(rowNum, row, ["correct_option"], `Invalid correct option "${correctOption}" - must be A, B, C, or D`);
          continue;
        }
        if (durationMinutes <= 0 || isNaN(durationMinutes)) {
          pushReject(rowNum, row, ["duration_minutes"], "Duration must be a positive number");
          continue;
        }
        if (!["easy", "medium", "hard"].includes(difficulty)) {
          pushReject(rowNum, row, ["difficulty"], `Invalid difficulty "${difficulty}" - must be easy, medium, or hard`);
          continue;
        }

        // Add to quiz map
        const quizKey = `${courseCode}::${title}`;
        if (!quizMap.has(quizKey)) {
          quizMap.set(quizKey, {
            quizData: {
              title,
              course_code: courseCode,
              course_name: courseName,
              duration_minutes: durationMinutes,
              is_premium: isPremium,
              token_cost: tokenCost,
              is_simulation: isSimulation,
            },
            questions: [],
          });
        }

        quizMap.get(quizKey)!.questions.push({
          question_text: questionText,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_option: correctOption,
          explanation,
          difficulty,
        });
      }

      // Convert map to array
      const quizzes: ImportedQuiz[] = Array.from(quizMap.values()).map(({ quizData, questions }) => ({
        title: quizData.title,
        description: "",
        course_code: quizData.course_code,
        course_name: quizData.course_name,
        duration_minutes: quizData.duration_minutes,
        is_premium: quizData.is_premium,
        token_cost: quizData.is_premium ? (quizData.token_cost || 5) : 0,
        is_simulation: quizData.is_simulation,
        questions,
      }));

      setProcessingStatus({ 
        stage: "complete", 
        progress: 100, 
        message: `Complete! ${quizzes.length} quizzes ready.`,
        totalRows: jsonData.length,
        processedRows: jsonData.length
      });

      setImportedQuizzes(quizzes);
      setErrors(parseErrors);
      setRejectedRows(rejected);

      if (quizzes.length > 0) {
        toast.success(`Successfully parsed ${quizzes.length} quizzes`);
        setViewMode("preview");
        setPreviewIndex(0);
      } else if (parseErrors.length > 0) {
        toast.error("No valid quizzes found. Check the errors below.");
      }
    } catch (error: any) {
      console.error("File processing error:", error);
      setErrors([error.message || "Failed to process file"]);
      toast.error(error.message || "Failed to process file");
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(null), 1500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (["csv", "xlsx", "xls", "docx"].includes(fileExtension || "")) {
        processFile(file);
      } else {
        toast.error("Please upload a CSV, Excel, or Word file (.csv, .xlsx, .xls, .docx)");
      }
    }
  }, []);

  const downloadTemplate = () => {
    // Template with multiple questions per quiz - rows with same quiz_title are grouped together
    const templateData = [
      // Quiz 1: Nigerian History (3 questions)
      {
        quiz_title: "Nigerian History Quiz",
        course_code: "HST101",
        course_name: "Nigerian History",
        duration_minutes: 20,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "In which year did Nigeria gain independence?",
        option_a: "1957",
        option_b: "1958",
        option_c: "1960",
        option_d: "1963",
        correct_option: "C",
        explanation: "Nigeria gained independence from British colonial rule on October 1, 1960.",
        difficulty: "easy",
      },
      {
        quiz_title: "Nigerian History Quiz",
        course_code: "HST101",
        course_name: "Nigerian History",
        duration_minutes: 20,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "Who was the first Prime Minister of Nigeria?",
        option_a: "Nnamdi Azikiwe",
        option_b: "Obafemi Awolowo",
        option_c: "Abubakar Tafawa Balewa",
        option_d: "Ahmadu Bello",
        correct_option: "C",
        explanation: "Sir Abubakar Tafawa Balewa was the first Prime Minister of Nigeria from 1960 to 1966.",
        difficulty: "medium",
      },
      {
        quiz_title: "Nigerian History Quiz",
        course_code: "HST101",
        course_name: "Nigerian History",
        duration_minutes: 20,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "Which Nigerian university is the oldest?",
        option_a: "University of Lagos",
        option_b: "Ahmadu Bello University",
        option_c: "University of Ibadan",
        option_d: "University of Nigeria, Nsukka",
        correct_option: "C",
        explanation: "University of Ibadan was founded in 1948 as a college of the University of London.",
        difficulty: "medium",
      },
      // Quiz 2: Basic Mathematics (3 questions)
      {
        quiz_title: "Basic Mathematics Quiz",
        course_code: "MTH101",
        course_name: "Mathematics I",
        duration_minutes: 30,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "What is the derivative of x² with respect to x?",
        option_a: "x",
        option_b: "2x",
        option_c: "x²",
        option_d: "2",
        correct_option: "B",
        explanation: "Using the power rule, d/dx(x²) = 2x¹ = 2x.",
        difficulty: "medium",
      },
      {
        quiz_title: "Basic Mathematics Quiz",
        course_code: "MTH101",
        course_name: "Mathematics I",
        duration_minutes: 30,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "Solve: If 2x + 5 = 13, what is x?",
        option_a: "3",
        option_b: "4",
        option_c: "5",
        option_d: "6",
        correct_option: "B",
        explanation: "2x + 5 = 13 → 2x = 13 - 5 → 2x = 8 → x = 4.",
        difficulty: "easy",
      },
      {
        quiz_title: "Basic Mathematics Quiz",
        course_code: "MTH101",
        course_name: "Mathematics I",
        duration_minutes: 30,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "What is the value of π (pi) to 2 decimal places?",
        option_a: "3.12",
        option_b: "3.14",
        option_c: "3.16",
        option_d: "3.18",
        correct_option: "B",
        explanation: "Pi (π) is approximately 3.14159..., which rounds to 3.14.",
        difficulty: "easy",
      },
      // Quiz 3: Basic Science (2 questions)
      {
        quiz_title: "Basic Science Quiz",
        course_code: "SCI101",
        course_name: "General Science",
        duration_minutes: 15,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "What is the chemical symbol for water?",
        option_a: "O2",
        option_b: "H2O",
        option_c: "CO2",
        option_d: "NaCl",
        correct_option: "B",
        explanation: "Water consists of 2 hydrogen atoms and 1 oxygen atom, hence H2O.",
        difficulty: "easy",
      },
      {
        quiz_title: "Basic Science Quiz",
        course_code: "SCI101",
        course_name: "General Science",
        duration_minutes: 15,
        is_premium: "false",
        token_cost: 0,
        is_simulation: "false",
        question_text: "What is the SI unit of electric current?",
        option_a: "Volt",
        option_b: "Ohm",
        option_c: "Watt",
        option_d: "Ampere",
        correct_option: "D",
        explanation: "The ampere (A) is the SI base unit of electric current.",
        difficulty: "easy",
      },
    ];

    // Define explicit column order to ensure correct_option appears
    const columnOrder = [
      "quiz_title",
      "course_code", 
      "course_name",
      "duration_minutes",
      "is_premium",
      "token_cost",
      "is_simulation",
      "question_text",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "correct_option",
      "explanation",
      "difficulty"
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData, { header: columnOrder });
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // quiz_title
      { wch: 12 }, // course_code
      { wch: 20 }, // course_name
      { wch: 15 }, // duration_minutes
      { wch: 10 }, // is_premium
      { wch: 10 }, // token_cost
      { wch: 12 }, // is_simulation
      { wch: 50 }, // question_text
      { wch: 20 }, // option_a
      { wch: 20 }, // option_b
      { wch: 20 }, // option_c
      { wch: 20 }, // option_d
      { wch: 15 }, // correct_option
      { wch: 55 }, // explanation
      { wch: 10 }, // difficulty
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quizzes with Questions");
    XLSX.writeFile(workbook, "quiz_with_questions_template.xlsx");
    toast.success("Template downloaded! Each row = 1 question. Rows with the same Quiz Title will be grouped together.");
  };

  const deleteQuiz = (index: number) => {
    const updated = importedQuizzes.filter((_, i) => i !== index);
    setImportedQuizzes(updated);
    if (previewIndex >= updated.length && updated.length > 0) {
      setPreviewIndex(updated.length - 1);
    }
    if (updated.length === 0) {
      setViewMode("upload");
    }
    toast.success("Quiz removed");
  };

  const handleCreateQuizzes = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const validQuizzes = importedQuizzes.filter(isQuizValid);
    if (validQuizzes.length === 0) {
      toast.error("No valid quizzes to create");
      return;
    }

    setIsCreating(true);
    setProcessingStatus({ 
      stage: "creating", 
      progress: 0, 
      message: "Creating quizzes...",
      totalRows: validQuizzes.length,
      processedRows: 0
    });

    let createdCount = 0;
    const createErrors: string[] = [];

    try {
      for (let i = 0; i < validQuizzes.length; i++) {
        const quiz = validQuizzes[i];
        
        setProcessingStatus({ 
          stage: "creating", 
          progress: ((i + 1) / validQuizzes.length) * 100, 
          message: `Creating quiz ${i + 1} of ${validQuizzes.length}...`,
          totalRows: validQuizzes.length,
          processedRows: i + 1
        });

        try {
          // Check if course exists or create it
          let courseId: string;
          const existingCourse = existingCourses.find(
            c => c.code.toUpperCase() === quiz.course_code.toUpperCase()
          );

          if (existingCourse) {
            courseId = existingCourse.id;
          } else {
            // Create new course
            const { data: newCourse, error: courseError } = await supabase
              .from("courses")
              .insert({
                code: quiz.course_code,
                name: quiz.course_name,
                created_by: user.id,
                level: levelToDb(defaultLevel),
              })
              .select("id")
              .single();

            if (courseError) throw courseError;
            courseId = newCourse.id;
            
            // Add to existing courses cache
            setExistingCourses(prev => [...prev, { 
              id: courseId, 
              code: quiz.course_code, 
              name: quiz.course_name 
            }]);
          }

          // Create or find a default topic for the course
          let topicId: string;
          const { data: existingTopic } = await supabase
            .from("topics")
            .select("id")
            .eq("course_id", courseId)
            .limit(1)
            .maybeSingle();

          if (existingTopic) {
            topicId = existingTopic.id;
          } else {
            const { data: newTopic, error: topicError } = await supabase
              .from("topics")
              .insert({
                name: "General",
                course_id: courseId,
              })
              .select("id")
              .single();

            if (topicError) throw topicError;
            topicId = newTopic.id;
          }

          // Create the quiz
          const { data: newQuiz, error: quizError } = await supabase
            .from("quizzes")
            .insert({
              title: quiz.title,
              description: quiz.description || null,
              course_id: courseId,
              tutor_id: user.id,
              duration_minutes: quiz.duration_minutes,
              question_count: quiz.questions.length,
              is_premium: quiz.is_premium,
              token_cost: quiz.token_cost,
              is_simulation: quiz.is_simulation,
              is_active: true,
              level: levelToDb(defaultLevel),
            })
            .select("id")
            .single();

          if (quizError) throw quizError;

          // Create questions for the quiz (batched to avoid payload/row limits)
          const questionInserts = quiz.questions.map((q) => ({
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation || null,
            difficulty: q.difficulty || "medium",
            course_id: courseId,
            topic_id: topicId,
            tutor_id: user.id,
            is_approved: true,
          }));

          const CHUNK = 50;
          const allCreatedQuestionIds: string[] = [];
          for (let start = 0; start < questionInserts.length; start += CHUNK) {
            const slice = questionInserts.slice(start, start + CHUNK);
            const { data: createdQuestions, error: questionsError } = await supabase
              .from("questions")
              .insert(slice)
              .select("id");
            if (questionsError) {
              throw new Error(
                `Failed at questions ${start + 1}-${start + slice.length}: ${questionsError.message}`
              );
            }
            (createdQuestions || []).forEach((q: any) => allCreatedQuestionIds.push(q.id));

            setProcessingStatus({
              stage: "creating",
              progress: ((i + (start + slice.length) / questionInserts.length) / validQuizzes.length) * 100,
              message: `Quiz ${i + 1}/${validQuizzes.length} — uploading questions ${start + slice.length}/${questionInserts.length}...`,
              totalRows: validQuizzes.length,
              processedRows: i + 1,
            });
          }

          // Link questions to quiz (batched)
          if (allCreatedQuestionIds.length > 0) {
            const quizQuestionLinks = allCreatedQuestionIds.map((qid, idx) => ({
              quiz_id: newQuiz.id,
              question_id: qid,
              order_index: idx,
            }));
            for (let start = 0; start < quizQuestionLinks.length; start += CHUNK) {
              const slice = quizQuestionLinks.slice(start, start + CHUNK);
              const { error: linkError } = await supabase
                .from("quiz_questions")
                .insert(slice);
              if (linkError) {
                throw new Error(
                  `Failed linking questions ${start + 1}-${start + slice.length}: ${linkError.message}`
                );
              }
            }
          }

          createdCount++;
        } catch (error: any) {
          console.error(`Error creating quiz "${quiz.title}":`, error);
          const detail = error?.message || error?.error_description || error?.hint || JSON.stringify(error);
          createErrors.push(`"${quiz.title}": ${detail}`);
        }
      }

      setProcessingStatus({ 
        stage: "complete", 
        progress: 100, 
        message: `Created ${createdCount} quizzes!`
      });

      if (createdCount > 0) {
        toast.success(`Successfully created ${createdCount} quiz${createdCount !== 1 ? "zes" : ""}!`);
        if (createErrors.length > 0) {
          toast.warning(`${createErrors.length} quiz${createErrors.length !== 1 ? "zes" : ""} failed — see details below`);
          setErrors(createErrors);
        }
        onSuccess();
        if (createErrors.length === 0) {
          onOpenChange(false);
          resetState();
        }
      } else {
        toast.error(createErrors[0] || "Failed to create any quizzes");
        setErrors(createErrors);
      }
    } catch (error: any) {
      console.error("Bulk creation error:", error);
      toast.error(error.message || "Failed to create quizzes");
    } finally {
      setIsCreating(false);
      setTimeout(() => setProcessingStatus(null), 1500);
    }
  };

  const resetState = () => {
    setImportedQuizzes([]);
    setErrors([]);
    setRejectedRows([]);
    setViewMode("upload");
    setPreviewIndex(0);
    setProcessingStatus(null);
  };

  const downloadErrorReport = () => {
    if (rejectedRows.length === 0) return;
    const reportRows = rejectedRows.map((r) => ({
      row_number: r.row,
      reason: r.reason,
      missing_fields: r.missing_fields.join(", "),
      ...r.data,
    }));
    const ws = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rejected Rows");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    XLSX.writeFile(wb, `import_errors_${stamp}.xlsx`);
    toast.success(`Downloaded ${rejectedRows.length} rejected rows`);
  };

  const validCount = importedQuizzes.filter(isQuizValid).length;
  const invalidCount = importedQuizzes.length - validCount;
  const currentQuiz = importedQuizzes[previewIndex];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Bulk Import Quizzes
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {viewMode === "upload" ? (
            <>
              {/* Template Download */}
              <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-medium">Download Template</p>
                    <p className="text-xs text-muted-foreground">Get the sample format to fill in your quizzes</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1" />
                    Template
                  </Button>
                </div>
              </div>

              {/* Default Student Level for all imported quizzes */}
              <LevelSelect
                value={defaultLevel}
                onChange={setDefaultLevel}
                label="Target Student Level (applied to all imported quizzes)"
              />

              {/* Upload Area */}
                <div className="space-y-2">
                <Label>Upload File (CSV, Excel, or Word)</Label>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer",
                    isDragging 
                      ? "border-primary bg-primary/5 scale-[1.02]"
                      : "hover:border-primary/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {isProcessing ? (
                    <div className="space-y-3">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                      {processingStatus && (
                        <>
                          <Progress value={processingStatus.progress} className="h-2 max-w-xs mx-auto" />
                          <p className="text-sm text-muted-foreground">{processingStatus.message}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className={cn(
                        "w-10 h-10 mx-auto mb-3 transition-colors",
                        isDragging ? "text-primary" : "text-muted-foreground"
                      )} />
                      <p className="text-sm font-medium mb-1">
                        {isDragging ? "Drop file here" : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports CSV, Excel, and Word (.docx) files
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <div className="text-sm flex-1">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <p className="font-medium text-destructive">
                          {rejectedRows.length || errors.length} row{(rejectedRows.length || errors.length) !== 1 ? "s" : ""} rejected
                        </p>
                        {rejectedRows.length > 0 && (
                          <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                            <Download className="w-3 h-3 mr-1" />
                            Error report
                          </Button>
                        )}
                      </div>
                      <ScrollArea className="max-h-32">
                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                          {errors.slice(0, 10).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {errors.length > 10 && (
                            <li>...and {errors.length - 10} more errors</li>
                          )}
                        </ul>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
              )}

              {/* Format Info */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p className="font-medium mb-1">How it works:</p>
                <p className="mb-2">Each row = 1 question. Rows with the same <code className="bg-muted px-1 rounded">quiz_title</code> will be grouped into one quiz.</p>
                <p className="font-medium mb-1">Required columns:</p>
                <p><code className="bg-muted px-1 rounded">quiz_title</code>, <code className="bg-muted px-1 rounded">course_code</code>, <code className="bg-muted px-1 rounded">question_text</code>, <code className="bg-muted px-1 rounded">option_a</code>, <code className="bg-muted px-1 rounded">option_b</code>, <code className="bg-muted px-1 rounded">option_c</code>, <code className="bg-muted px-1 rounded">option_d</code>, <code className="bg-muted px-1 rounded">correct_option</code></p>
                <p className="mt-1"><span className="font-medium">Optional:</span> course_name, duration_minutes, explanation, difficulty, is_premium, token_cost, is_simulation</p>
              </div>
            </>
          ) : (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {validCount} valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {invalidCount} invalid
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/30">
                    Level: {defaultLevel}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setViewMode("upload"); setImportedQuizzes([]); }}
                >
                  Upload Different File
                </Button>
              </div>

              {/* Pre-confirm grouped summary */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Review before upload</p>
                  {rejectedRows.length > 0 && (
                    <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                      <Download className="w-3 h-3 mr-1" />
                      Error report ({rejectedRows.length})
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {importedQuizzes.length} quiz{importedQuizzes.length !== 1 ? "zes" : ""} grouped from {importedQuizzes.reduce((s, q) => s + q.questions.length, 0)} question{importedQuizzes.reduce((s, q) => s + q.questions.length, 0) !== 1 ? "s" : ""}, all targeted to <span className="font-medium text-foreground">{defaultLevel}</span>.
                </p>
                <ScrollArea className="max-h-28">
                  <ul className="text-xs space-y-1">
                    {importedQuizzes.map((q, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          <span className="text-muted-foreground">{q.course_code}</span> · {q.title}
                        </span>
                        <span className="shrink-0 flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{q.questions.length} Q</Badge>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 bg-amber-500/10 text-amber-700 border-amber-500/30">{defaultLevel}</Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>

              {/* Quiz Navigator */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                  disabled={previewIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Quiz {previewIndex + 1} of {importedQuizzes.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewIndex(Math.min(importedQuizzes.length - 1, previewIndex + 1))}
                  disabled={previewIndex === importedQuizzes.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Current Quiz Preview */}
              {currentQuiz && (
                <div className={cn(
                  "p-4 rounded-lg border",
                  isQuizValid(currentQuiz) ? "bg-card" : "bg-destructive/5 border-destructive/20"
                )}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{currentQuiz.title}</h3>
                      <p className="text-sm text-muted-foreground">{currentQuiz.description || "No description"}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteQuiz(previewIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span>{currentQuiz.course_code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>{currentQuiz.duration_minutes} mins</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Questions:</span>
                      <span>{currentQuiz.questions.length}</span>
                    </div>
                    {currentQuiz.is_premium && (
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500" />
                        <span>{currentQuiz.token_cost} tokens</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {currentQuiz.is_premium && (
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Premium</Badge>
                    )}
                    {currentQuiz.is_simulation && (
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Simulation</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* All Quizzes List */}
              <div className="space-y-2">
                <Label>All Quizzes ({importedQuizzes.length})</Label>
                <ScrollArea className="h-32 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {importedQuizzes.map((quiz, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-center justify-between p-2 rounded cursor-pointer transition-colors",
                          index === previewIndex ? "bg-primary/10" : "hover:bg-muted/50",
                          !isQuizValid(quiz) && "border-l-2 border-destructive"
                        )}
                        onClick={() => setPreviewIndex(index)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                          <span className="truncate text-sm">{quiz.title}</span>
                          <Badge variant="outline" className="text-xs shrink-0">{quiz.questions.length} Q</Badge>
                        </div>
                        {isQuizValid(quiz) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Processing Status */}
              {processingStatus && processingStatus.stage === "creating" && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">{processingStatus.message}</span>
                  </div>
                  <Progress value={processingStatus.progress} className="h-2" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {viewMode === "preview" && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateQuizzes}
              disabled={validCount === 0 || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create {validCount} Quiz{validCount !== 1 ? "zes" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
