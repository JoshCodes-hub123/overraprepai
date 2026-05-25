import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Upload,
  Loader2,
  CheckCircle2,
  Trash2,
  Wand2,
  FileText,
  ListChecks,
} from "lucide-react";
import { BulkQuestionImport } from "./BulkQuestionImport";
import { extractTextFromFile } from "@/lib/extractText";

interface CourseQuizUploaderProps {
  courseId: string;
  userId?: string;
}

interface ParsedQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  image_url?: string;
  year?: number | null;
  is_past_question?: boolean;
}

/**
 * The ONE unified quiz uploader, always scoped to the current course.
 * Tabs: Upload/Paste (CSV/Excel/Word/text) and AI Generate (PDF/Word/Paste -> AI).
 * After parsing/generating, tutor reviews count + publishes a quiz in one click.
 */
export default function CourseQuizUploader({ courseId, userId }: CourseQuizUploaderProps) {
  const qc = useQueryClient();
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);

  // Quiz meta
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [isPremium, setIsPremium] = useState(false);
  const [tokenCost, setTokenCost] = useState("10");
  const [isSimulation, setIsSimulation] = useState(false);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("__none__");
  const [publishing, setPublishing] = useState(false);

  const { data: topics = [] } = useQuery({
    queryKey: ["course-quiz-topics", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, name")
        .eq("course_id", courseId)
        .order("order_index");
      return data ?? [];
    },
  });

  const { data: existingQuizzes = [] } = useQuery({
    queryKey: ["course-quizzes-tutor", courseId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("quizzes")
        .select("id, title, question_count, is_premium, created_at")
        .eq("course_id", courseId)
        .eq("tutor_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!userId,
  });

  useEffect(() => {
    setSelectedTopicId((prev) => (prev === "__none__" && topics[0]?.id ? topics[0].id : prev));
  }, [topics]);

  const canPublish = useMemo(
    () => title.trim().length > 1 && questions.length >= 1 && !publishing,
    [title, questions.length, publishing],
  );

  const handleImported = (imported: ParsedQuestion[]) => {
    if (!imported.length) return;
    setQuestions((prev) => [...prev, ...imported]);
    toast.success(`${imported.length} question${imported.length === 1 ? "" : "s"} added`);
  };

  const removeQuestion = (i: number) => {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const publish = async () => {
    if (!userId) return;
    if (!title.trim()) {
      toast.error("Give the quiz a title");
      return;
    }
    if (!questions.length) {
      toast.error("Add at least one question");
      return;
    }

    setPublishing(true);
    try {
      // 1. Insert questions
      const topicId = selectedTopicId !== "__none__" ? selectedTopicId : null;
      const insertRows = questions.map((q) => ({
        course_id: courseId,
        topic_id: topicId,
        tutor_id: userId,
        question_text: q.question_text.trim(),
        option_a: q.option_a.trim(),
        option_b: q.option_b.trim(),
        option_c: q.option_c.trim(),
        option_d: q.option_d.trim(),
        correct_option: q.correct_option,
        explanation: q.explanation?.trim() || null,
        difficulty: q.difficulty || "medium",
        image_url: q.image_url?.trim() || null,
        year: q.year ?? null,
        is_past_question: !!q.is_past_question || !!q.year,
        is_approved: true,
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("questions")
        .insert(insertRows)
        .select("id");
      if (insErr) throw insErr;

      // 2. Create the quiz
      const { data: quiz, error: quizErr } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          course_id: courseId,
          tutor_id: userId,
          duration_minutes: parseInt(durationMinutes) || 30,
          question_count: insertRows.length,
          is_premium: isPremium,
          token_cost: isPremium ? parseInt(tokenCost) || 0 : 0,
          is_simulation: isSimulation,
        })
        .select("id")
        .single();
      if (quizErr) throw quizErr;

      // 3. Link questions
      if (quiz && inserted?.length) {
        const link = inserted.map((q, idx) => ({
          quiz_id: quiz.id,
          question_id: q.id,
          order_index: idx,
        }));
        const { error: linkErr } = await supabase.from("quiz_questions").insert(link);
        if (linkErr) throw linkErr;
      }

      toast.success(`Quiz published with ${insertRows.length} question${insertRows.length === 1 ? "" : "s"} 🎉`);
      // Reset
      setQuestions([]);
      setTitle("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["course-quizzes-tutor", courseId, userId] });
      qc.invalidateQueries({ queryKey: ["course-quizzes", courseId] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Could not publish quiz");
    } finally {
      setPublishing(false);
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm("Delete this quiz? Questions stay in the course bank.")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Quiz deleted");
    qc.invalidateQueries({ queryKey: ["course-quizzes-tutor", courseId, userId] });
  };

  return (
    <div className="space-y-4">
      {/* Quiz meta */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <ListChecks className="w-4 h-4 text-amber-500" /> Quiz details
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="text-xs">Quiz title *</Label>
            <Input
              placeholder="e.g. Chapter 1 — Mole concept"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              placeholder="Optional — what's covered, who it's for"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Topic (optional)</Label>
            <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
              <SelectTrigger><SelectValue placeholder="No topic" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No topic</SelectItem>
                {topics.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration (minutes)</Label>
            <Input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={isSimulation} onCheckedChange={setIsSimulation} id="sim" />
            <Label htmlFor="sim" className="text-xs">Exam simulation (CBT-style)</Label>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch checked={isPremium} onCheckedChange={setIsPremium} id="prem" />
            <Label htmlFor="prem" className="text-xs">Premium (costs tokens)</Label>
          </div>
          {isPremium && (
            <div className="sm:col-span-2">
              <Label className="text-xs">Token cost per attempt</Label>
              <Input
                type="number"
                min={1}
                value={tokenCost}
                onChange={(e) => setTokenCost(e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Input modes */}
      <Card className="p-4">
        <Tabs defaultValue="upload">
          <TabsList className="w-full justify-start gap-1 h-auto p-1 overflow-x-auto bg-muted/50">
            <TabsTrigger value="upload" className="gap-1.5 text-xs sm:text-sm">
              <Upload className="w-3.5 h-3.5" /> Upload / Paste
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5 text-xs sm:text-sm">
              <Wand2 className="w-3.5 h-3.5" /> AI from notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">
              CSV / Excel template, Word .docx, or paste questions. Each parsed question gets added to the draft below.
            </p>
            <BulkQuestionImport
              onImport={handleImported}
              onClose={() => {/* embedded, no-op */}}
              courseId={courseId}
              tutorId={userId}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-3">
            <AIGenerateFromNotes
              onGenerated={handleImported}
              defaultTopic={topics.find((t: any) => t.id === selectedTopicId)?.name}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Draft */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Draft questions
            <Badge variant="secondary">{questions.length}</Badge>
          </h3>
          {questions.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setQuestions([])}>
              Clear all
            </Button>
          )}
        </div>
        {questions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No questions yet — use Upload, Paste, or AI Generate above to add some.
          </p>
        ) : (
          <ul className="divide-y text-sm max-h-72 overflow-y-auto">
            {questions.map((q, i) => (
              <li key={i} className="py-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{i + 1}. {q.question_text}</p>
                  <p className="text-xs text-muted-foreground">Answer: {q.correct_option}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeQuestion(i)}>
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex justify-end">
          <Button
            disabled={!canPublish}
            onClick={publish}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {publishing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
            Publish quiz ({questions.length})
          </Button>
        </div>
      </Card>

      {/* Existing quizzes */}
      {existingQuizzes.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-500" /> Quizzes already in this course
          </h3>
          <ul className="divide-y text-sm">
            {existingQuizzes.map((q: any) => (
              <li key={q.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.question_count} questions {q.is_premium ? "• premium" : ""}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteQuiz(q.id)}>
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ---------- AI generate from notes / PDF / Word ---------- */

function AIGenerateFromNotes({
  onGenerated,
  defaultTopic,
}: {
  onGenerated: (qs: ParsedQuestion[]) => void;
  defaultTopic?: string;
}) {
  const [text, setText] = useState("");
  const [count, setCount] = useState("10");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setExtracting(true);
    setProgress(20);
    try {
      const t = await extractTextFromFile(file, { maxPages: 60 });
      setProgress(80);
      if (!t || t.length < 100) {
        toast.error("Couldn't extract enough text from that file");
        return;
      }
      setText((prev) => (prev ? prev + "\n\n" + t : t));
      toast.success(`Extracted ${t.length.toLocaleString()} characters`);
    } catch (e: any) {
      toast.error(e.message || "Failed to extract text");
    } finally {
      setExtracting(false);
      setProgress(0);
    }
  };

  const generate = async () => {
    if (text.trim().length < 100) {
      toast.error("Paste or upload at least a paragraph (100+ chars) of notes");
      return;
    }
    const n = Math.max(2, Math.min(40, parseInt(count) || 10));
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-quiz-from-text", {
        body: { content: text, count: n, difficulty, topic_title: defaultTopic },
      });
      if (error) throw error;
      if ((data as any)?.error === "rate_limited") {
        toast.error("AI is busy — try again in a moment");
        return;
      }
      if ((data as any)?.error === "credits_exhausted") {
        toast.error("AI credits exhausted — top up to keep generating");
        return;
      }
      const qs = ((data as any)?.questions || []) as ParsedQuestion[];
      if (!qs.length) {
        toast.error("AI couldn't extract clean questions — try different notes");
        return;
      }
      onGenerated(qs);
      setText("");
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Upload lecture notes (PDF / Word / TXT) or paste text below. AI will draft multiple-choice questions you can review and publish.
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          disabled={extracting || generating}
        />
        <Select value={count} onValueChange={setCount}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[5, 10, 15, 20, 30, 40].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} Qs</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {extracting && <Progress value={progress} className="h-1.5" />}
      <Textarea
        rows={6}
        placeholder="…or paste your notes here"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={extracting || generating}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{text.length.toLocaleString()} characters</p>
        <Button onClick={generate} disabled={generating || extracting || text.trim().length < 100} className="bg-amber-500 hover:bg-amber-600 text-white">
          {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1.5" />}
          Generate questions
        </Button>
      </div>
    </div>
  );
}