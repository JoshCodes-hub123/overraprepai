import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  User,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
  HelpCircle,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCoverImage } from "@/lib/courseCovers";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  courseCode?: string;
  courseName?: string;
  topicName?: string;
  description?: string | null;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  ownerName?: string;
  dateStr?: string;
  onExplain?: (title: string, notes?: string) => void;
  index?: number;
}

export function CourseNoteReaderDialog({
  open,
  onOpenChange,
  title,
  courseCode,
  courseName,
  topicName,
  description,
  fileUrl,
  fileType = "application/pdf",
  fileSize,
  ownerName = "Course Lecturer",
  dateStr,
  onExplain,
  index = 0,
}: Props) {
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [fullscreen, setFullscreen] = useState(false);
  const [readProgress, setReadProgress] = useState(15);

  const coverImage = getCoverImage("note", title, courseCode, index);
  const isPdf = fileType?.toLowerCase().includes("pdf") || fileUrl?.toLowerCase().endsWith(".pdf");

  const formattedSize = fileSize
    ? fileSize > 1024 * 1024
      ? `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(fileSize / 1024)} KB`
    : "PDF Document";

  // Synthesize rich, educational note sections if file is previewed or has description
  const keyObjectives = [
    `Master foundational principles of ${title}`,
    `Understand key formulas, definitions, and derivations aligned with university curriculum`,
    `Review high-yield past questions tested by faculty lecturers in CBT and semester exams`,
    `Apply core theorems to exam practice problems`,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`p-0 overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-all duration-200 flex flex-col ${
          fullscreen
            ? "max-w-none w-screen h-screen rounded-none"
            : "max-w-4xl w-[95vw] max-h-[90vh] rounded-3xl"
        }`}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>

        {/* 1. Header Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-400 border border-amber-500/20">
              <FileText className="w-3 h-3" />
              <span>{courseCode || "Course Note"}</span>
            </span>
            <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 truncate hidden sm:inline">
              {topicName || "Lecture Notes"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Font Size Selector */}
            <div className="hidden xs:flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setFontSize("sm")}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  fontSize === "sm" ? "bg-amber-500 text-neutral-950" : "text-neutral-600"
                }`}
                title="Smaller text"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize("base")}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  fontSize === "base" ? "bg-amber-500 text-neutral-950" : "text-neutral-600"
                }`}
                title="Default text"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("lg")}
                className={`px-2 py-0.5 text-xs font-semibold rounded ${
                  fontSize === "lg" ? "bg-amber-500 text-neutral-950" : "text-neutral-600"
                }`}
                title="Larger text"
              >
                A+
              </button>
            </div>

            {/* AI Explain */}
            {onExplain && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onExplain(title, description || undefined);
                }}
                className="h-8 px-2.5 text-xs font-semibold border-amber-300 text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">AI Explain</span>
              </Button>
            )}

            {/* Download */}
            {fileUrl && (
              <a
                href={fileUrl}
                download
                target="_blank"
                rel="noreferrer"
                className="h-8 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 flex items-center gap-1 text-xs font-semibold"
                title="Download Note Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
              title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100"
              title="Close reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Reading Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Cover Hero Banner */}
          <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-neutral-900">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500 text-neutral-950 text-[11px]">
                  Verified Syllabus Note
                </span>
                <span className="text-white/80 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  ~8 min read
                </span>
                <span className="text-white/60">·</span>
                <span className="text-white/80">{formattedSize}</span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/80 pt-1">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  {ownerName}
                </span>
                {dateStr && (
                  <>
                    <span className="text-white/40">·</span>
                    <span>{dateStr}</span>
                  </>
                )}
                {courseName && (
                  <>
                    <span className="text-white/40">·</span>
                    <span className="text-amber-300 font-medium">{courseName}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Note Reader Content */}
          <div
            className={`max-w-3xl mx-auto px-5 sm:px-8 py-6 space-y-6 ${
              fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg leading-relaxed" : "text-base leading-normal"
            } text-neutral-800 dark:text-neutral-200`}
          >
            {/* Syllabus Objectives */}
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-400 flex items-center gap-1.5 mb-2.5">
                <Award className="w-4 h-4 text-amber-600" />
                Core Exam Learning Objectives
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                {keyObjectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Note Description / Overview */}
            {description ? (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Summary & Lecture Outline
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 font-serif">
                  {description}
                </p>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                  Lecture Synopsis & Definitions
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed font-serif bg-neutral-50 dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  This comprehensive lecture note covers theoretical foundations, standard derivations,
                  and practical examination nuances for {title}. Carefully review the formulas and concepts
                  highlighted below as they reflect frequent patterns from past university CBT examinations.
                </p>
              </div>
            )}

            {/* High-Yield Key Takeaways for CBT */}
            <div className="space-y-3">
              <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>High-Yield CBT Concepts & Rules</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Rule 01 · Standard Principles
                  </span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Always verify boundary conditions and units before calculating final numerical answers.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Rule 02 · Derivations & Limits
                  </span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    CBT questions frequently test intermediary step assumptions rather than just final formulas.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Rule 03 · Common Distractors
                  </span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Watch for sign inversions (+/-) and reciprocal options commonly used as CBT distractors.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Rule 04 · Speed Derivation
                  </span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Memorize shortcut ratios to save 30–45 seconds per question in 50-question mock drills.
                  </p>
                </div>
              </div>
            </div>

            {/* Embedded Document View if URL exists */}
            {fileUrl && (
              <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <span>Embedded Document Viewer</span>
                  </h3>
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Open in new window</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="w-full h-96 rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
                  <iframe
                    src={fileUrl}
                    title={title}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Finished Reading
              </Button>

              {onExplain && (
                <Button
                  onClick={() => onExplain(title, description || undefined)}
                  className="rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask AI to Break Down This Note</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CourseNoteReaderDialog;
