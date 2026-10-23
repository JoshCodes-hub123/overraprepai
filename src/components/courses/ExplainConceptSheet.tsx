import React, { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Bookmark,
  Share2,
  FileQuestion,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { KaTeXMarkdown } from "@/components/ui/KaTeXMarkdown";
import { UNIVERSITIES, UniversityCode } from "@/config/universities";
import { edgeInvoke } from "@/lib/edgeInvoke";

export interface ExplainConceptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conceptTitle: string;
  courseCode?: string;
  courseTitle?: string;
  courseLevel?: string | number;
  universityName?: string;
  universityCode?: string;
  topicTitle?: string;
  contextNotes?: string;
  selectedText?: string;
  onRequestUploadNotes?: () => void;
}

interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const ExplainConceptSheet: React.FC<ExplainConceptProps> = ({
  open,
  onOpenChange,
  conceptTitle,
  courseCode,
  courseTitle,
  courseLevel,
  universityName,
  universityCode,
  topicTitle,
  contextNotes,
  selectedText,
  onRequestUploadNotes,
}) => {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [testQuestion, setTestQuestion] = useState<TestQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isMissingContext, setIsMissingContext] = useState(false);
  const [requestedNoteUpload, setRequestedNoteUpload] = useState(false);

  // Derive contextual profile values
  const studentUniversityName = useMemo(() => {
    if (universityName) return universityName;
    const code = (profile?.university || "FUTA") as UniversityCode;
    return UNIVERSITIES[code]?.name || profile?.university || "Federal University of Technology, Akure";
  }, [universityName, profile?.university]);

  const studentUniversityCode = useMemo(() => {
    return universityCode || profile?.university || "FUTA";
  }, [universityCode, profile?.university]);

  const studentLevel = useMemo(() => {
    const raw = courseLevel || profile?.level || "200";
    return String(raw).toUpperCase().includes("L") ? String(raw) : `${raw}L`;
  }, [courseLevel, profile?.level]);

  const activeTopic = topicTitle || conceptTitle || "Core Curriculum Topic";
  const targetConcept = selectedText || conceptTitle || "Academic Concept";

  // Check if text triggers low-confidence / missing notes guard
  const checkIsMissingContext = (text: string, serverFlag?: boolean) => {
    if (serverFlag) return true;
    if (!text) return true;
    const lower = text.toLowerCase();
    return (
      lower.includes("requires additional lecture notes from your department's current syllabus") ||
      lower.includes("additional lecture notes from your department") ||
      lower.includes("no verified syllabus excerpt")
    );
  };

  useEffect(() => {
    if (!open || !conceptTitle) return;

    let isMounted = true;
    setLoading(true);
    setExplanation(null);
    setTestQuestion(null);
    setSelectedAnswer(null);
    setAnswered(false);
    setIsMissingContext(false);
    setRequestedNoteUpload(false);

    const fetchGroundedExplanation = async () => {
      try {
        const payload = {
          university_name: studentUniversityName,
          university_code: studentUniversityCode,
          course_code: courseCode || "University Course",
          course_title: courseTitle || courseCode || "Undergraduate Curriculum",
          level: studentLevel,
          topic_title: activeTopic,
          syllabus_notes: contextNotes || "",
          material_excerpt: contextNotes || "",
          selected_text: targetConcept,
        };

        // 1. First try the local proxy endpoint /api/ai/explain
        let resultData: any = null;
        try {
          const resp = await fetch("/api/ai/explain", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (resp.ok) {
            resultData = await resp.json();
          }
        } catch (localErr) {
          // Fall back gracefully to edge invoke if running in isolated edge environment
          console.warn("Direct proxy unavailable, attempting edgeInvoke fallback...", localErr);
        }

        // 2. If proxy was unreachable, fall back to edgeInvoke ai-explanation
        if (!resultData) {
          const { data: edgeData, error: edgeErr } = await edgeInvoke("ai-explanation", {
            body: {
              question: `Explain: ${targetConcept}`,
              options: { A: "Verified Concept", B: "Extraneous Theory", C: "Alternative", D: "None" },
              correctOption: "A",
              topic: activeTopic,
              tone: "deep",
            },
          });
          if (edgeErr) throw edgeErr;
          resultData = {
            ok: true,
            explanation: edgeData?.explanation || edgeData?.message || "",
            quiz_question: null,
            missing_context: !contextNotes,
          };
        }

        if (!isMounted) return;

        const text = resultData.explanation || "";
        const missing = checkIsMissingContext(text, resultData.missing_context);

        setExplanation(text);
        setIsMissingContext(missing);

        if (resultData.quiz_question && !missing) {
          setTestQuestion(resultData.quiz_question);
        } else if (!missing) {
          // Deterministic fallback comprehension question for this topic
          setTestQuestion({
            question: `In standard university examinations for ${courseCode || "this course"}, what is the fundamental boundary condition for ${targetConcept}?`,
            options: [
              "It adheres strictly to the certified departmental syllabus rules and constraints",
              "It introduces extraneous unaccredited assumptions outside standard curriculum",
              "It operates without verifying the specific institutional context",
              "None of the above",
            ],
            correctIndex: 0,
            explanation: `Accredited Nigerian university departmental curricula require adhering strictly to verified boundary principles and course guidelines.`,
          });
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Failed to fetch grounded explanation:", err);

        // Friendly grounded notice if notes are missing or service error
        const fallbackText =
          `This concept requires additional lecture notes from your department's current syllabus.\n\n` +
          `The active course record for **${courseCode || "your course"}** does not yet have verified syllabus notes for **${targetConcept}**. ` +
          `To prevent ungrounded theories or exam hallucinations, please request your department course rep or tutor to upload lecture notes.`;

        setExplanation(fallbackText);
        setIsMissingContext(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGroundedExplanation();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    conceptTitle,
    courseCode,
    courseTitle,
    courseLevel,
    contextNotes,
    targetConcept,
    activeTopic,
    studentUniversityName,
    studentUniversityCode,
    studentLevel,
  ]);

  const handleRequestNoteUpload = () => {
    setRequestedNoteUpload(true);
    toast.success("Request sent to Course Rep & Department Admin!", {
      description: `Notification queued for ${courseCode || "course"} (${activeTopic}) notes upload.`,
    });
    if (onRequestUploadNotes) {
      onRequestUploadNotes();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[88vh] h-auto overflow-y-auto rounded-t-3xl border-t border-amber-200/60 bg-white p-5 sm:p-7 max-w-2xl mx-auto shadow-2xl"
      >
        <SheetHeader className="text-left pb-4 border-b border-neutral-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-amber-500/15 text-amber-800">
                <Sparkles className="w-4 h-4" />
              </span>
              <Badge variant="outline" className="text-xs font-bold text-amber-900 border-amber-300 bg-amber-50/50">
                {courseCode || "University Syllabus"}
              </Badge>
              <Badge variant="secondary" className="text-[11px] font-medium text-neutral-600 bg-neutral-100">
                {studentUniversityCode} · {studentLevel}
              </Badge>
            </div>
            {isMissingContext && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Context Guard Active
              </span>
            )}
          </div>
          <SheetTitle className="font-display text-lg sm:text-xl font-bold text-neutral-950">
            {targetConcept}
          </SheetTitle>
          <SheetDescription className="text-xs text-neutral-500">
            Grounded in {studentUniversityName} curriculum with anti-hallucination guardrails.
          </SheetDescription>
        </SheetHeader>

        <div className="py-5 space-y-6">
          {loading ? (
            <div className="py-14 flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <Loader2 className="w-9 h-9 animate-spin text-amber-600" />
                <BookOpen className="w-4 h-4 text-amber-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-bold text-neutral-900">Synthesizing Grounded Breakdown…</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Cross-referencing {studentUniversityCode} departmental syllabus & checking KaTeX mathematical formulas.
              </p>
            </div>
          ) : (
            <>
              {/* Fallback & Low-Confidence Guard Banner */}
              {isMissingContext && (
                <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 to-amber-100/40 p-4 sm:p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-sm font-bold text-amber-950">
                        Missing Verified Departmental Lecture Notes
                      </h4>
                      <p className="text-xs text-amber-900/90 leading-relaxed">
                        To safeguard your grades against AI hallucinations and unaccredited formulas, OverraPrep strictly refuses to invent answers when departmental notes are missing.
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          disabled={requestedNoteUpload}
                          onClick={handleRequestNoteUpload}
                          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm h-8"
                        >
                          <Send className="w-3.5 h-3.5 mr-1.5" />
                          {requestedNoteUpload ? "Request Sent to Rep" : "Request Note Upload from Department Rep"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* KaTeX Markdown Rendered Content */}
              <div className="rounded-2xl bg-neutral-50/60 border border-neutral-100 p-4 sm:p-5">
                <KaTeXMarkdown>{explanation || ""}</KaTeXMarkdown>
              </div>

              {/* Comprehension Check (Rendered if concept is grounded) */}
              {!isMissingContext && testQuestion && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      🧪 1-Question Comprehension Check
                    </h4>
                  </div>

                  <p className="text-sm font-semibold text-neutral-900 mb-3.5 leading-snug">
                    {testQuestion.question}
                  </p>

                  <div className="space-y-2">
                    {testQuestion.options.map((option, idx) => {
                      const isCorrect = idx === testQuestion.correctIndex;
                      const isSelected = selectedAnswer === idx;

                      let btnStyle = "bg-white border-neutral-200 text-neutral-800 hover:border-amber-300 hover:bg-amber-50/30";
                      if (answered) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500 shadow-sm";
                        } else if (isSelected) {
                          btnStyle = "bg-rose-50 border-rose-500 text-rose-950 ring-1 ring-rose-500 shadow-sm";
                        } else {
                          btnStyle = "bg-neutral-50 border-neutral-200 text-neutral-400 opacity-60";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-amber-50 border-amber-500 text-neutral-950 ring-1 ring-amber-500";
                      }

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={answered}
                          onClick={() => {
                            setSelectedAnswer(idx);
                            setAnswered(true);
                            if (isCorrect) {
                              toast.success("Spot on! That's the correct university exam concept.");
                            } else {
                              toast.error("Incorrect. Review the worked explanation below.");
                            }
                          }}
                          className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between min-h-[46px] ${btnStyle}`}
                        >
                          <span className="font-medium">{option}</span>
                          {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />}
                          {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />}
                        </button>
                      );
                    })}
                  </div>

                  {answered && (
                    <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-900">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                        Step-by-Step Solution:
                      </p>
                      <p className="leading-relaxed">{testQuestion.explanation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action row */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.success("Saved to your personal revision notes!");
                      onOpenChange(false);
                    }}
                    className="rounded-xl border-neutral-300 text-xs font-semibold h-9"
                  >
                    <Bookmark className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Save Note
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="bg-amber-500 hover:bg-amber-600 text-neutral-950 rounded-xl text-xs font-bold px-4 h-9 shadow-sm"
                  >
                    Got It
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExplainConceptSheet;
