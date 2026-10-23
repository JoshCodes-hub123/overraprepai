import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Check,
  Send,
  Loader2,
  HelpCircle,
  FileCode,
  Table as TableIcon,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { LatexFormulaPreview } from "./LatexFormulaPreview";
import { CascadeSelection } from "./InstitutionalCascadeSelector";

export interface ParsedQuestion {
  id: string; // client id for keying
  question_text: string;
  options: [string, string, string, string]; // A, B, C, D
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  exam_year: number;
  topic_id: string; // Topic ID for weak area mapping
  topic_name?: string;
  isValid: boolean;
  errors: string[];
}

interface SyllabusTopicOption {
  id: string;
  name: string;
  order_index: number;
}

interface Props {
  cascade: CascadeSelection;
}

// Preset Sample JSON with LaTeX formulas and real academic questions
const SAMPLE_JSON_DATA = [
  {
    question_text: "Evaluate the definite integral: $\\int_{0}^{\\pi} \\sin(x) \\, dx$",
    options: ["0", "1", "2", "-2"],
    correct_option: "C",
    explanation: "The antiderivative of $\\sin(x)$ is $-\\cos(x)$. Evaluating from $0$ to $\\pi$: $(-\\cos(\\pi)) - (-\\cos(0)) = -(-1) - (-1) = 1 + 1 = 2$.",
    exam_year: 2024,
  },
  {
    question_text: "What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL Tree) containing $n$ nodes?",
    options: ["$O(1)$", "$O(\\log n)$", "$O(n)$", "$O(n \\log n)$"],
    correct_option: "B",
    explanation: "Because an AVL tree guarantees height balance $h = O(\\log n)$, search, insertion, and deletion operations all run strictly in $O(\\log n)$ time.",
    exam_year: 2023,
  },
  {
    question_text: "According to De Morgan's Law in Boolean Algebra, which expression is strictly equivalent to $\\overline{A \\cdot B}$?",
    options: ["$\\overline{A} \\cdot \\overline{B}$", "$\\overline{A} + \\overline{B}$", "$A + B$", "$A \\cdot B$"],
    correct_option: "B",
    explanation: "De Morgan's first theorem states that the complement of a product of variables is equal to the sum of the complements: $\\overline{A \\cdot B} = \\overline{A} + \\overline{B}$.",
    exam_year: 2024,
  },
  {
    question_text: "In electrical circuit analysis, which statement expresses Kirchhoff's Current Law (KCL) at any junction node?",
    options: ["$\\sum V = 0$", "$\\sum I_{\\text{in}} = \\sum I_{\\text{out}}$", "$V = I \\cdot R$", "$P = I^2 \\cdot R$"],
    correct_option: "B",
    explanation: "Kirchhoff's Current Law states that charge is conserved; the algebraic sum of currents entering a node equals the sum leaving it: $\\sum I_{\\text{in}} = \\sum I_{\\text{out}}$.",
    exam_year: 2022,
  },
];

const SAMPLE_CSV_DATA = `question_text,option_a,option_b,option_c,option_d,correct_option,explanation,exam_year
"What is the derivative $\\frac{d}{dx}[e^{3x}]$?","3e^{3x}","e^{3x}","\\frac{1}{3}e^{3x}","3xe^{3x}","A","By the chain rule, $\\frac{d}{dx}[e^{u}] = u' e^u$, giving $3e^{3x}$.",2024
"Which data structure operates on a First-In-First-Out (FIFO) discipline?","Stack","Queue","Priority Queue","Binary Heap","B","A Queue operates strictly on FIFO order.",2023
"Find the roots of the quadratic equation $x^2 - 5x + 6 = 0$.","$x = 2, 3$","$x = -2, -3$","$x = 1, 6$","$x = -1, -6$","A","Factoring yields $(x-2)(x-3) = 0$, so $x = 2$ or $x = 3$.",2024`;

export const CbtIngestionModule: React.FC<Props> = ({ cascade }) => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<SyllabusTopicOption[]>([]);
  const [defaultTopicId, setDefaultTopicId] = useState<string>("");
  const [examYearOverride, setExamYearOverride] = useState<number>(2024);

  // Ingestion inputs
  const [inputFormat, setInputFormat] = useState<"json" | "csv">("json");
  const [rawText, setRawText] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "valid" | "errors">("all");

  // Publishing state
  const [quizPackTitle, setQuizPackTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  // Row edit dialog
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState<ParsedQuestion | null>(null);

  // Load course topics
  useEffect(() => {
    async function loadCourseTopics() {
      if (!cascade.courseId) {
        setTopics([]);
        return;
      }
      try {
        const { data } = await supabase
          .from("topics")
          .select("id, name, order_index")
          .eq("course_id", cascade.courseId)
          .order("order_index", { ascending: true });

        const list = (data as any) || [];
        setTopics(list);
        if (list.length > 0 && !defaultTopicId) {
          setDefaultTopicId(list[0].id);
        }
      } catch (err) {
        console.error("Failed to load topics:", err);
      }
    }
    loadCourseTopics();
  }, [cascade.courseId]);

  // Set default quiz title when course changes
  useEffect(() => {
    if (cascade.courseCode) {
      setQuizPackTitle(`${cascade.courseCode} CBT Past Questions (${examYearOverride})`);
    }
  }, [cascade.courseCode, examYearOverride]);

  // Helper validator for each question
  const validateQuestion = (q: Partial<ParsedQuestion>, index: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!q.question_text || q.question_text.trim().length < 5) {
      errors.push(`Row ${index + 1}: Question text is missing or too short`);
    }

    if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
      errors.push(`Row ${index + 1}: Exactly 4 options (A, B, C, D) are required`);
    } else {
      if (!q.options[0]?.trim()) errors.push(`Row ${index + 1}: Option A is empty`);
      if (!q.options[1]?.trim()) errors.push(`Row ${index + 1}: Option B is empty`);
      if (!q.options[2]?.trim()) errors.push(`Row ${index + 1}: Option C is empty`);
      if (!q.options[3]?.trim()) errors.push(`Row ${index + 1}: Option D is empty`);
    }

    const validLetters = ["A", "B", "C", "D"];
    if (!q.correct_option || !validLetters.includes(q.correct_option.toUpperCase())) {
      errors.push(`Row ${index + 1}: Correct option must be A, B, C, or D`);
    }

    if (!q.explanation || q.explanation.trim().length === 0) {
      errors.push(`Row ${index + 1}: Explanation is empty (step-by-step solution required)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Parser: JSON
  const parseJsonInput = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        toast.error("JSON input must be an array of question objects");
        return;
      }

      const parsed: ParsedQuestion[] = data.map((item: any, i: number) => {
        let opts: [string, string, string, string] = ["", "", "", ""];
        if (Array.isArray(item.options) && item.options.length >= 4) {
          opts = [String(item.options[0]), String(item.options[1]), String(item.options[2]), String(item.options[3])];
        } else if (item.option_a && item.option_b) {
          opts = [
            String(item.option_a || ""),
            String(item.option_b || ""),
            String(item.option_c || ""),
            String(item.option_d || ""),
          ];
        }

        const correct = (item.correct_option || item.answer || "A").toString().toUpperCase().trim() as any;
        const year = Number(item.exam_year || item.year || examYearOverride) || 2024;
        const topicId = item.topic_id || defaultTopicId || (topics[0]?.id ?? "");

        const candidate: Partial<ParsedQuestion> = {
          id: `json-${Date.now()}-${i}`,
          question_text: String(item.question_text || item.question || "").trim(),
          options: opts,
          correct_option: correct,
          explanation: String(item.explanation || item.solution || "").trim(),
          exam_year: year,
          topic_id: topicId,
        };

        const validation = validateQuestion(candidate, i);

        return {
          id: candidate.id!,
          question_text: candidate.question_text!,
          options: candidate.options!,
          correct_option: candidate.correct_option!,
          explanation: candidate.explanation!,
          exam_year: candidate.exam_year!,
          topic_id: candidate.topic_id!,
          isValid: validation.isValid,
          errors: validation.errors,
        };
      });

      setParsedQuestions(parsed);
      toast.success(`Parsed ${parsed.length} questions from JSON!`);
    } catch (err: any) {
      toast.error(`Invalid JSON syntax: ${err.message}`);
    }
  };

  // Parser: CSV
  const parseCsvInput = (text: string) => {
    try {
      // Regex CSV parser handling quoted multiline cells with commas
      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = "";
        } else if ((char === "\r" || char === "\n") && !inQuotes) {
          if (char === "\r" && nextChar === "\n") i++;
          currentRow.push(currentCell.trim());
          if (currentRow.some((c) => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
      }

      if (rows.length < 2) {
        toast.error("CSV must contain a header row and at least one question row");
        return;
      }

      const headers = rows[0].map((h) => h.toLowerCase().replace(/[\s_]+/g, ""));
      const getCol = (row: string[], name: string): string => {
        const idx = headers.findIndex((h) => h.includes(name));
        return idx !== -1 ? row[idx] || "" : "";
      };

      const parsed: ParsedQuestion[] = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length < 4) continue;

        const qText = getCol(row, "question") || row[0] || "";
        const optA = getCol(row, "optiona") || row[1] || "";
        const optB = getCol(row, "optionb") || row[2] || "";
        const optC = getCol(row, "optionc") || row[3] || "";
        const optD = getCol(row, "optiond") || row[4] || "";
        const correct = (getCol(row, "correct") || row[5] || "A").toUpperCase() as any;
        const exp = getCol(row, "explanation") || row[6] || "";
        const yr = Number(getCol(row, "year")) || examYearOverride;

        const candidate: Partial<ParsedQuestion> = {
          id: `csv-${Date.now()}-${r}`,
          question_text: qText,
          options: [optA, optB, optC, optD],
          correct_option: correct,
          explanation: exp,
          exam_year: yr,
          topic_id: defaultTopicId || (topics[0]?.id ?? ""),
        };

        const val = validateQuestion(candidate, r - 1);
        parsed.push({
          id: candidate.id!,
          question_text: candidate.question_text!,
          options: candidate.options!,
          correct_option: candidate.correct_option!,
          explanation: candidate.explanation!,
          exam_year: candidate.exam_year!,
          topic_id: candidate.topic_id!,
          isValid: val.isValid,
          errors: val.errors,
        });
      }

      setParsedQuestions(parsed);
      toast.success(`Parsed ${parsed.length} questions from CSV!`);
    } catch (err: any) {
      toast.error(`CSV Parsing error: ${err.message}`);
    }
  };

  // Trigger parsing
  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Please paste or upload JSON/CSV questions");
      return;
    }
    if (inputFormat === "json") {
      parseJsonInput(rawText);
    } else {
      parseCsvInput(rawText);
    }
  };

  // Handle file drop/upload
  const handleFileUpload = (file: File) => {
    const isJson = file.name.endsWith(".json");
    setInputFormat(isJson ? "json" : "csv");

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawText(content);
      if (isJson) {
        parseJsonInput(content);
      } else {
        parseCsvInput(content);
      }
    };
    reader.readAsText(file);
  };

  // Toggle correct option directly in preview table
  const handleToggleCorrectOption = (index: number, optLetter: "A" | "B" | "C" | "D") => {
    setParsedQuestions((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], correct_option: optLetter };
      const val = validateQuestion(target, index);
      target.isValid = val.isValid;
      target.errors = val.errors;
      updated[index] = target;
      return updated;
    });
    toast.success(`Row ${index + 1} correct answer set to Option ${optLetter}`);
  };

  // Delete question from preview table
  const handleDeleteRow = (index: number) => {
    setParsedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Edit question modal open
  const handleOpenEditRow = (index: number) => {
    setEditingIndex(index);
    setEditQuestion({ ...parsedQuestions[index] });
  };

  // Save row edit
  const handleSaveRowEdit = () => {
    if (editingIndex === null || !editQuestion) return;

    const val = validateQuestion(editQuestion, editingIndex);
    const updatedQuestion = {
      ...editQuestion,
      isValid: val.isValid,
      errors: val.errors,
    };

    setParsedQuestions((prev) => {
      const next = [...prev];
      next[editingIndex] = updatedQuestion;
      return next;
    });

    setEditingIndex(null);
    setEditQuestion(null);
    toast.success("Question updated!");
  };

  // Filtered preview list
  const filteredQuestions = useMemo(() => {
    if (activeFilter === "valid") return parsedQuestions.filter((q) => q.isValid);
    if (activeFilter === "errors") return parsedQuestions.filter((q) => !q.isValid);
    return parsedQuestions;
  }, [parsedQuestions, activeFilter]);

  const validCount = parsedQuestions.filter((q) => q.isValid).length;
  const errorCount = parsedQuestions.filter((q) => !q.isValid).length;

  // Publish CBT Set to Database
  const handlePublishCbtSet = async () => {
    if (!cascade.courseId) {
      toast.error("Please select a course in the cascade selector first");
      return;
    }
    if (parsedQuestions.length === 0) {
      toast.error("No questions to publish");
      return;
    }
    if (validCount === 0) {
      toast.error("Cannot publish: 0 valid questions. Please fix schema errors first.");
      return;
    }

    const questionsToInsert = parsedQuestions.filter((q) => q.isValid);
    setIsPublishing(true);

    try {
      // 1. Create a CBT Quiz record in `quizzes`
      const quizTitle = quizPackTitle.trim() || `${cascade.courseCode} CBT Past Questions (${examYearOverride})`;
      const { data: quizData, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          course_id: cascade.courseId,
          title: quizTitle,
          description: `Official CBT Past Question Bank for ${cascade.courseCode} · ${cascade.university} (${cascade.department})`,
          duration_minutes: Math.max(15, Math.round(questionsToInsert.length * 1.5)),
          is_active: true,
          created_by: user?.id || null,
        } as any)
        .select()
        .single();

      if (quizError) {
        console.warn("Quiz record insertion notice:", quizError.message);
      }

      const quizId = quizData?.id;

      // 2. Prepare `questions` rows
      const questionRows = questionsToInsert.map((q) => {
        // Fallback to first topic if question has none
        const topicIdToUse = q.topic_id || defaultTopicId || (topics[0]?.id ?? "");

        return {
          course_id: cascade.courseId,
          topic_id: topicIdToUse,
          question_text: q.question_text,
          option_a: q.options[0],
          option_b: q.options[1],
          option_c: q.options[2],
          option_d: q.options[3],
          correct_option: q.correct_option,
          explanation: q.explanation,
          year: q.exam_year || examYearOverride,
          difficulty: "medium",
          is_past_question: true,
          is_approved: true,
          is_premium: false,
        };
      });

      const { data: insertedQuestions, error: questionsError } = await supabase
        .from("questions")
        .insert(questionRows as any)
        .select("id");

      if (questionsError) throw questionsError;

      // 3. Link questions to quiz in `quiz_questions` if quiz was created
      if (quizId && insertedQuestions && insertedQuestions.length > 0) {
        const quizQuestionRows = insertedQuestions.map((iq: any, idx: number) => ({
          quiz_id: quizId,
          question_id: iq.id,
          order_index: idx + 1,
        }));

        await supabase.from("quiz_questions").insert(quizQuestionRows as any);
      }

      toast.success(
        `Successfully published ${questionsToInsert.length} CBT past questions for ${cascade.courseCode}!`
      );

      // Clear published questions
      setParsedQuestions([]);
      setRawText("");
    } catch (err: any) {
      console.error("Publish CBT set error:", err);
      toast.error(err.message || "Failed to publish CBT question set");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Import Form Card */}
      <Card className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                CBT Past Questions Batch Ingestion
              </CardTitle>
              <CardDescription className="text-xs">
                Ingest hundreds of university exam questions via JSON or CSV with automated LaTeX formula parsing and topic mapping.
              </CardDescription>
            </div>

            {/* Format toggle & sample loader buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputFormat("json");
                  setRawText(JSON.stringify(SAMPLE_JSON_DATA, null, 2));
                  parseJsonInput(JSON.stringify(SAMPLE_JSON_DATA, null, 2));
                }}
                className="h-8 text-xs border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Load Sample JSON
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInputFormat("csv");
                  setRawText(SAMPLE_CSV_DATA);
                  parseCsvInput(SAMPLE_CSV_DATA);
                }}
                className="h-8 text-xs border-slate-300 text-slate-700 dark:text-neutral-300 hover:bg-slate-50"
              >
                <TableIcon className="w-3.5 h-3.5 mr-1" /> Load Sample CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Metadata Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Format</Label>
              <Select value={inputFormat} onValueChange={(v) => setInputFormat(v as any)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json" className="text-xs">
                    JSON Array (.json)
                  </SelectItem>
                  <SelectItem value="csv" className="text-xs">
                    Comma Separated (.csv)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default Exam Year</Label>
              <Input
                type="number"
                min="2000"
                max="2030"
                value={examYearOverride}
                onChange={(e) => setExamYearOverride(Number(e.target.value))}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Default Topic Tag</Label>
              <Select value={defaultTopicId} onValueChange={setDefaultTopicId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Topic" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      #{t.order_index} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Text Area & File Dropzone */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700 dark:text-neutral-300">
                Paste Raw {inputFormat.toUpperCase()} or Drop File Below
              </Label>
              <span className="text-[11px] text-muted-foreground">
                LaTeX math formulas like $\int f(x)dx$ are supported
              </span>
            </div>

            <Textarea
              placeholder={
                inputFormat === "json"
                  ? `[\n  {\n    "question_text": "What is $\\\\int x dx$?",\n    "options": ["$\\\\frac{x^2}{2} + C$", "$x^2$", "$2x$", "$\\\\ln(x)$"],\n    "correct_option": "A",\n    "explanation": "Power rule of integration",\n    "exam_year": 2024\n  }\n]`
                  : `question_text,option_a,option_b,option_c,option_d,correct_option,explanation,exam_year\n"What is $2+2$?",3,4,5,6,B,"Basic arithmetic",2024`
              }
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          {/* File Input & Parse Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <input
                type="file"
                id="cbt-file-upload"
                accept=".json,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("cbt-file-upload") as HTMLInputElement;
                  el?.click();
                }}
                className="text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Upload .json or .csv File
              </Button>
            </div>

            <Button
              type="button"
              onClick={handleParse}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs min-h-[38px] px-5"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Parse &amp; Validate Questions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview Table */}
      {parsedQuestions.length > 0 && (
        <Card className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-600" />
                  Live Preview &amp; LaTeX Formula Validation Table
                </CardTitle>
                <CardDescription className="text-xs">
                  Inspect KaTeX equations, test option selection, and verify answers before publishing to {cascade.courseCode}.
                </CardDescription>
              </div>

              {/* Status Badges & Filter Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={activeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("all")}
                  className="h-7 text-xs"
                >
                  All ({parsedQuestions.length})
                </Button>
                <Button
                  variant={activeFilter === "valid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter("valid")}
                  className={`h-7 text-xs ${activeFilter === "valid" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-emerald-300 text-emerald-800"}`}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Valid ({validCount})
                </Button>
                {errorCount > 0 && (
                  <Button
                    variant={activeFilter === "errors" ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter("errors")}
                    className="h-7 text-xs border-red-300 text-red-700"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" /> Has Issues ({errorCount})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-100/70 dark:bg-neutral-900/80 font-bold text-slate-700 dark:text-neutral-300">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 min-w-[280px]">Question &amp; LaTeX Preview</th>
                    <th className="p-3 min-w-[280px]">Choices (Click to test/set correct)</th>
                    <th className="p-3 min-w-[200px]">Explanation</th>
                    <th className="p-3 w-24">Year</th>
                    <th className="p-3 w-28 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                  {filteredQuestions.map((q, idx) => {
                    const letters: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
                    return (
                      <tr
                        key={q.id}
                        className={`hover:bg-amber-50/20 dark:hover:bg-neutral-800/30 transition-colors ${
                          !q.isValid ? "bg-red-50/40 dark:bg-red-950/20" : ""
                        }`}
                      >
                        {/* Number & Status */}
                        <td className="p-3 text-center align-top">
                          <span
                            className={`font-mono font-bold text-xs ${
                              q.isValid ? "text-slate-600" : "text-red-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          {!q.isValid && (
                            <div title={q.errors.join("; ")} className="mt-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500 mx-auto" />
                            </div>
                          )}
                        </td>

                        {/* Question Text with LaTeX */}
                        <td className="p-3 align-top space-y-1.5">
                          <div className="bg-slate-50 dark:bg-neutral-950 p-2.5 rounded-xl border border-slate-200/80 dark:border-neutral-800">
                            <LatexFormulaPreview content={q.question_text} />
                          </div>

                          {!q.isValid && q.errors.length > 0 && (
                            <div className="text-[11px] text-red-600 dark:text-red-400 space-y-0.5">
                              {q.errors.map((err, eIdx) => (
                                <p key={eIdx}>• {err}</p>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Options with Interactive Selector */}
                        <td className="p-3 align-top space-y-1.5">
                          {letters.map((letter, optIdx) => {
                            const isCorrect = q.correct_option === letter;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => handleToggleCorrectOption(idx, letter)}
                                className={`w-full text-left p-1.5 px-2.5 rounded-lg border transition-all flex items-start gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-semibold shadow-2xs"
                                    : "bg-white dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 hover:border-amber-300"
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 grid place-items-center rounded font-mono text-[11px] shrink-0 font-bold ${
                                    isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400"
                                  }`}
                                >
                                  {letter}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <LatexFormulaPreview
                                    content={q.options[optIdx] || "Empty"}
                                    inline
                                  />
                                </div>
                                {isCorrect && (
                                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                )}
                              </button>
                            );
                          })}
                        </td>

                        {/* Explanation */}
                        <td className="p-3 align-top text-slate-600 dark:text-neutral-400 text-xs">
                          <div className="bg-slate-50 dark:bg-neutral-950 p-2 rounded-lg border border-slate-100 dark:border-neutral-800 line-clamp-4">
                            <LatexFormulaPreview content={q.explanation || "No explanation provided"} />
                          </div>
                        </td>

                        {/* Year */}
                        <td className="p-3 align-top font-mono font-medium text-xs">
                          {q.exam_year}
                        </td>

                        {/* Actions */}
                        <td className="p-3 align-top text-right space-x-1 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-600 hover:text-amber-600"
                            onClick={() => handleOpenEditRow(idx)}
                            title="Edit Question & Formula"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteRow(idx)}
                            title="Remove Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Publishing Bar */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-md space-y-1">
                <Label className="text-xs font-semibold">CBT Past Question Pack Title</Label>
                <Input
                  value={quizPackTitle}
                  onChange={(e) => setQuizPackTitle(e.target.value)}
                  placeholder="e.g. CSC 201 2024 Past Questions"
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <p className="font-semibold text-slate-800 dark:text-neutral-200">
                    Ready to Ingest: {validCount} Questions
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Destination: {cascade.university} ({cascade.courseCode})
                  </p>
                </div>

                <Button
                  onClick={handlePublishCbtSet}
                  disabled={isPublishing || validCount === 0 || !cascade.courseId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-sm"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Publishing Set…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" /> Publish CBT Set
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Question Modal */}
      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit2 className="w-4 h-4 text-amber-600" />
              Edit Question &amp; LaTeX Formula
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fix typos or equations before publishing to question bank.
            </DialogDescription>
          </DialogHeader>

          {editQuestion && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="font-semibold">Question Text (LaTeX formulas supported)</Label>
                <Textarea
                  value={editQuestion.question_text}
                  onChange={(e) =>
                    setEditQuestion({ ...editQuestion, question_text: e.target.value })
                  }
                  rows={3}
                  className="font-mono"
                />
              </div>

              {/* Live KaTeX Preview of edited question */}
              <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-200/60 dark:border-amber-800/40">
                <span className="font-bold text-[10px] text-amber-700 uppercase tracking-wider block mb-1">
                  Live KaTeX Render:
                </span>
                <LatexFormulaPreview content={editQuestion.question_text} />
              </div>

              {/* 4 Choices */}
              <div className="space-y-2">
                <Label className="font-semibold">Choices (A, B, C, D)</Label>
                {(["A", "B", "C", "D"] as const).map((letter, optIdx) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="w-6 h-6 grid place-items-center font-mono font-bold bg-slate-100 rounded text-slate-700">
                      {letter}
                    </span>
                    <Input
                      value={editQuestion.options[optIdx]}
                      onChange={(e) => {
                        const newOpts: [string, string, string, string] = [...editQuestion.options];
                        newOpts[optIdx] = e.target.value;
                        setEditQuestion({ ...editQuestion, options: newOpts });
                      }}
                      className="font-mono text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-semibold">Correct Option</Label>
                  <Select
                    value={editQuestion.correct_option}
                    onValueChange={(val) =>
                      setEditQuestion({ ...editQuestion, correct_option: val as any })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Option A</SelectItem>
                      <SelectItem value="B">Option B</SelectItem>
                      <SelectItem value="C">Option C</SelectItem>
                      <SelectItem value="D">Option D</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold">Exam Year</Label>
                  <Input
                    type="number"
                    value={editQuestion.exam_year}
                    onChange={(e) =>
                      setEditQuestion({ ...editQuestion, exam_year: Number(e.target.value) })
                    }
                    className="h-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="font-semibold">Detailed Step-by-Step Explanation</Label>
                <Textarea
                  value={editQuestion.explanation}
                  onChange={(e) =>
                    setEditQuestion({ ...editQuestion, explanation: e.target.value })
                  }
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingIndex(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSaveRowEdit}
            >
              Update Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CbtIngestionModule;
