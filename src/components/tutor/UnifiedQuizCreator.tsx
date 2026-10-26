import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Loader2, 
  Plus, 
  Trash2,
  BookOpen,
  Clock,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileSpreadsheet
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BulkQuestionImport } from "./BulkQuestionImport";
import { QuestionImageUpload } from "./QuestionImageUpload";
import { LevelSelect, levelToDb } from "@/components/shared/LevelSelect";

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  image_url?: string;
  year?: number | null;
  is_past_question?: boolean;
}

interface UnifiedQuizCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const emptyQuestion: Question = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: "A",
  explanation: "",
  difficulty: "medium",
  image_url: "",
};

export function UnifiedQuizCreator({
  open,
  onOpenChange,
  onSuccess,
}: UnifiedQuizCreatorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"setup" | "questions" | "review">("setup");
  const [isLoading, setIsLoading] = useState(false);
  
  // Quiz Type
  const [isSimulation, setIsSimulation] = useState(false);
  
  // Course selection/creation
  const [existingCourses, setExistingCourses] = useState<{id: string; code: string; name: string}[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [createNewCourse, setCreateNewCourse] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  
  // Topic
  const [existingTopics, setExistingTopics] = useState<{id: string; name: string}[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [topicName, setTopicName] = useState("");
  
  // Quiz details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [questionCount, setQuestionCount] = useState("10");
  const [isPremium, setIsPremium] = useState(false);
  const [tokenCost, setTokenCost] = useState("10");
  const [level, setLevel] = useState("ALL");
  
  // Questions
  const [questions, setQuestions] = useState<Question[]>([{ ...emptyQuestion }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [existingQuestionCount, setExistingQuestionCount] = useState(0);
  const [useExistingQuestions, setUseExistingQuestions] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Fetch existing courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user || !open) return;
      
      const { data } = await supabase
        .from("courses")
        .select("id, code, name")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      
      if (data) {
        setExistingCourses(data);
        if (data.length > 0 && !createNewCourse) {
          setSelectedCourseId(data[0].id);
        }
      }
    };

    fetchCourses();
  }, [user, open]);

  // Fetch topics when course changes
  useEffect(() => {
    const fetchTopics = async () => {
      if (!selectedCourseId) {
        setExistingTopics([]);
        setSelectedTopicId("");
        setExistingQuestionCount(0);
        return;
      }

      const { data: topics } = await supabase
        .from("topics")
        .select("id, name")
        .eq("course_id", selectedCourseId)
        .order("order_index");

      if (topics) {
        setExistingTopics(topics);
        if (topics.length > 0) {
          setSelectedTopicId(topics[0].id);
        }
      }

      // Check existing questions (all questions are auto-approved)
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("course_id", selectedCourseId);

      setExistingQuestionCount(count || 0);
    };

    fetchTopics();
  }, [selectedCourseId]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("setup");
      setIsSimulation(false);
      setSelectedCourseId("");
      setCreateNewCourse(false);
      setCourseName("");
      setCourseCode("");
      setSelectedTopicId("");
      setTopicName("");
      setTitle("");
      setDescription("");
      setDurationMinutes("30");
      setQuestionCount("10");
      setIsPremium(false);
      setTokenCost("10");
      setLevel("ALL");
      setQuestions([{ ...emptyQuestion }]);
      setCurrentIndex(0);
      setUseExistingQuestions(false);
      setShowBulkImport(false);
    }
  }, [open]);

  const handleBulkImport = (importedQuestions: Question[]) => {
    setQuestions(prev => {
      // If only one empty question, replace it
      if (prev.length === 1 && !isQuestionComplete(prev[0])) {
        return importedQuestions;
      }
      // Otherwise append to existing
      return [...prev, ...importedQuestions];
    });
    setCurrentIndex(questions.length === 1 && !isQuestionComplete(questions[0]) ? 0 : questions.length);
    setShowBulkImport(false);
  };

  const updateQuestion = (field: keyof Question, value: string) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      [field]: value,
    };
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
    setCurrentIndex(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setCurrentIndex(Math.min(currentIndex, newQuestions.length - 1));
  };

  const isQuestionComplete = (q: Question) => {
    return (
      q.question_text.trim() &&
      q.option_a.trim() &&
      q.option_b.trim() &&
      q.option_c.trim() &&
      q.option_d.trim()
    );
  };

  const completedQuestions = questions.filter(isQuestionComplete).length;
  const targetCount = parseInt(questionCount) || 10;
  const progress = useExistingQuestions 
    ? 100 
    : Math.min(100, (completedQuestions / targetCount) * 100);

  const canProceedToQuestions = () => {
    if (createNewCourse) {
      return courseName.trim() && courseCode.trim() && topicName.trim() && title.trim();
    }
    return selectedCourseId && (selectedTopicId || topicName.trim()) && title.trim();
  };

  const canSubmit = useExistingQuestions 
    ? existingQuestionCount >= 1 
    : completedQuestions >= 1;

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let finalCourseId = selectedCourseId;
      let finalTopicId = selectedTopicId;

      // Create new course if needed
      if (createNewCourse) {
        const { data: newCourse, error: courseError } = await supabase
          .from("courses")
          .insert({
            name: courseName.trim(),
            code: courseCode.trim().toUpperCase(),
            created_by: user.id,
            level: levelToDb(level),
            environment_type: "university",
            path_type: "university",
          } as any)
          .select()
          .single();

        if (courseError) throw courseError;
        finalCourseId = newCourse.id;

        // Create topic for new course
        const { data: newTopic, error: topicError } = await supabase
          .from("topics")
          .insert({
            name: topicName.trim(),
            course_id: finalCourseId,
            order_index: 0,
          })
          .select()
          .single();

        if (topicError) throw topicError;
        finalTopicId = newTopic.id;
      } else if (!selectedTopicId && topicName.trim()) {
        // Create new topic for existing course
        const { data: newTopic, error: topicError } = await supabase
          .from("topics")
          .insert({
            name: topicName.trim(),
            course_id: finalCourseId,
            order_index: existingTopics.length,
          })
          .select()
          .single();

        if (topicError) throw topicError;
        finalTopicId = newTopic.id;
      }

      // Upload new questions if not using existing
      if (!useExistingQuestions && questions.some(isQuestionComplete)) {
        const validQuestions = questions.filter(isQuestionComplete);
        const questionsToInsert = validQuestions.map((q) => ({
          course_id: finalCourseId,
          topic_id: finalTopicId,
          tutor_id: user.id,
          question_text: q.question_text.trim(),
          option_a: q.option_a.trim(),
          option_b: q.option_b.trim(),
          option_c: q.option_c.trim(),
          option_d: q.option_d.trim(),
          correct_option: q.correct_option,
          explanation: q.explanation.trim() || null,
          difficulty: q.difficulty,
          image_url: q.image_url?.trim() || null,
          year: q.year ?? null,
          is_past_question: !!q.is_past_question || !!q.year,
          is_approved: true,
        }));

        const { error: qError } = await supabase
          .from("questions")
          .insert(questionsToInsert);

        if (qError) throw qError;
      }

      // Create the quiz
      const finalQuestionCount = useExistingQuestions 
        ? Math.min(parseInt(questionCount) || 10, existingQuestionCount)
        : completedQuestions;

      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          course_id: finalCourseId,
          tutor_id: user.id,
          duration_minutes: parseInt(durationMinutes) || 30,
          question_count: finalQuestionCount,
          is_premium: isPremium,
          token_cost: isPremium ? parseInt(tokenCost) || 0 : 0,
          is_simulation: isSimulation,
          level: levelToDb(level),
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Link questions to quiz (all questions are auto-approved)
      if (quiz) {
        const { data: availableQuestions, error: fetchError } = await supabase
          .from("questions")
          .select("id")
          .eq("course_id", finalCourseId)
          .limit(finalQuestionCount);

        if (fetchError) throw fetchError;

        if (availableQuestions && availableQuestions.length > 0) {
          const quizQuestions = availableQuestions.map((q, index) => ({
            quiz_id: quiz.id,
            question_id: q.id,
            order_index: index,
          }));

          const { error: linkError } = await supabase
            .from("quiz_questions")
            .insert(quizQuestions);

          if (linkError) throw linkError;
        }
      }

      toast.success(`${isSimulation ? "Exam Simulation" : "Quiz"} created successfully! 🎉`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating quiz:", error);
      toast.error(error.message || "Failed to create quiz");
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Create Quiz or Exam
          </SheetTitle>
          <SheetDescription>
            Set up your quiz details, add questions, and publish
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {["setup", "questions", "review"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : ["setup", "questions", "review"].indexOf(step) > i
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    "flex-1 h-1 rounded",
                    ["setup", "questions", "review"].indexOf(step) > i
                      ? "bg-primary/40"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {step === "setup" && (
          <div className="space-y-5">
            {/* Quiz Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">What are you creating?</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsSimulation(false)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50",
                    !isSimulation
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <BookOpen className="w-6 h-6 text-primary mb-2" />
                  <p className="font-semibold">Practice Quiz</p>
                  <p className="text-xs text-muted-foreground">Students practice at their own pace</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSimulation(true)}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all hover:border-accent/50",
                    isSimulation
                      ? "border-accent bg-accent/5"
                      : "border-border"
                  )}
                >
                  <Clock className="w-6 h-6 text-accent mb-2" />
                  <p className="font-semibold">Exam Simulation</p>
                  <p className="text-xs text-muted-foreground">Timed CBT-style exam</p>
                </button>
              </div>
            </div>

            {/* Course Selection/Creation */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Course</Label>
                {existingCourses.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCreateNewCourse(!createNewCourse);
                      if (!createNewCourse) {
                        setSelectedCourseId("");
                      }
                    }}
                  >
                    {createNewCourse ? "Use Existing" : "Create New"}
                  </Button>
                )}
              </div>
              
              {!createNewCourse && existingCourses.length > 0 ? (
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCourses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Course Code *</Label>
                    <Input
                      placeholder="e.g., PHY101"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Course Name *</Label>
                    <Input
                      placeholder="e.g., Physics"
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Topic */}
            <div className="space-y-2">
              <Label>Topic *</Label>
              {!createNewCourse && existingTopics.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingTopics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__new__">+ Create new topic</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedTopicId === "__new__" && (
                    <Input
                      placeholder="New topic name"
                      value={topicName}
                      onChange={(e) => setTopicName(e.target.value)}
                    />
                  )}
                </div>
              ) : (
                <Input
                  placeholder="e.g., Motion and Forces"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              )}
            </div>

            {/* Quiz Title */}
            <div className="space-y-2">
              <Label>{isSimulation ? "Exam" : "Quiz"} Title *</Label>
              <Input
                placeholder={isSimulation ? "e.g., Mid-Term Exam Simulation" : "e.g., Chapter 1 Quiz"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Target Student Level */}
            <LevelSelect value={level} onChange={setLevel} label="Target Student Level" />

            {/* Duration & Question Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Limit (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="180"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(e.target.value)}
                />
              </div>
            </div>

            {/* Premium Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
              <div>
                <Label>Premium {isSimulation ? "Exam" : "Quiz"}</Label>
                <p className="text-sm text-muted-foreground">Charge tokens for access</p>
              </div>
              <Switch checked={isPremium} onCheckedChange={setIsPremium} />
            </div>

            {isPremium && (
              <div className="space-y-2">
                <Label>Token Cost</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={tokenCost}
                  onChange={(e) => setTokenCost(e.target.value)}
                />
              </div>
            )}

            {/* Existing Questions Notice */}
            {!createNewCourse && selectedCourseId && existingQuestionCount > 0 && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {existingQuestionCount} existing questions in this course
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Reuse existing questions or add new ones
                    </p>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 mt-1"
                      onClick={() => {
                        setUseExistingQuestions(true);
                        setStep("review");
                      }}
                    >
                      Use existing questions →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => setStep("questions")}
              disabled={!canProceedToQuestions()}
            >
              Add Questions
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-4">
            {/* Show Bulk Import Panel */}
            {showBulkImport ? (
              <BulkQuestionImport 
                onImport={handleBulkImport}
                onClose={() => setShowBulkImport(false)}
                courseId={selectedCourseId}
                tutorId={user?.id}
              />
            ) : (
              <>
                {/* Bulk Import Button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkImport(true)}
                    className="flex-1"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Import from File (CSV/Excel)
                  </Button>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {completedQuestions} of {targetCount} questions
                    </span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Question Pills */}
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentIndex(i)}
                      className={cn(
                        "w-8 h-8 rounded-full text-sm font-medium transition-all",
                        currentIndex === i
                          ? "bg-primary text-primary-foreground"
                          : isQuestionComplete(q)
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="w-8 h-8 rounded-full bg-muted text-muted-foreground hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

            {/* Current Question Form */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Question {currentIndex + 1}</Badge>
                {questions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(currentIndex)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  placeholder="Enter your question..."
                  value={currentQuestion.question_text}
                  onChange={(e) => updateQuestion("question_text", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(["A", "B", "C", "D"] as const).map((opt) => (
                  <div key={opt} className="space-y-1">
                    <Label className="text-xs">Option {opt} *</Label>
                    <Input
                      placeholder={`Option ${opt}`}
                      value={currentQuestion[`option_${opt.toLowerCase()}` as keyof Question] as string}
                      onChange={(e) => updateQuestion(`option_${opt.toLowerCase()}` as keyof Question, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <RadioGroup
                  value={currentQuestion.correct_option}
                  onValueChange={(v) => updateQuestion("correct_option", v)}
                  className="flex gap-4"
                >
                  {["A", "B", "C", "D"].map((opt) => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`correct-${opt}`} />
                      <Label htmlFor={`correct-${opt}`}>{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Explanation (optional)</Label>
                <Textarea
                  placeholder="Explain why this is the correct answer..."
                  value={currentQuestion.explanation}
                  onChange={(e) => updateQuestion("explanation", e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={currentQuestion.difficulty}
                  onValueChange={(v) => updateQuestion("difficulty", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Question Image Upload */}
              <QuestionImageUpload
                value={currentQuestion.image_url || ""}
                onChange={(url) => updateQuestion("image_url", url)}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("setup")}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setStep("review")}
                disabled={completedQuestions < 1}
              >
                Review & Create
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
              </>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border space-y-3">
              <div className="flex items-center gap-2">
                {isSimulation ? (
                  <Clock className="w-5 h-5 text-accent" />
                ) : (
                  <BookOpen className="w-5 h-5 text-primary" />
                )}
                <Badge variant={isSimulation ? "secondary" : "default"}>
                  {isSimulation ? "Exam Simulation" : "Practice Quiz"}
                </Badge>
              </div>
              
              <h3 className="font-semibold text-lg">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  <strong>{useExistingQuestions ? Math.min(parseInt(questionCount) || 10, existingQuestionCount) : completedQuestions}</strong> questions
                </span>
                <span>
                  <strong>{durationMinutes}</strong> minutes
                </span>
                {isPremium && (
                  <span>
                    <strong>{tokenCost}</strong> tokens
                  </span>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Course:</strong> {createNewCourse ? `${courseCode} - ${courseName}` : existingCourses.find(c => c.id === selectedCourseId)?.name || "—"}</p>
                <p><strong>Topic:</strong> {selectedTopicId === "__new__" ? topicName : (existingTopics.find(t => t.id === selectedTopicId)?.name || topicName || "—")}</p>
              </div>
            </div>

            {/* Question Summary */}
            {!useExistingQuestions && completedQuestions > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Questions Added</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {questions.filter(isQuestionComplete).map((q, i) => (
                    <div key={i} className="p-2 rounded bg-muted/30 text-sm">
                      <span className="font-medium">Q{i + 1}:</span> {q.question_text.slice(0, 60)}...
                    </div>
                  ))}
                </div>
              </div>
            )}

            {useExistingQuestions && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                Using <strong>{Math.min(parseInt(questionCount) || 10, existingQuestionCount)}</strong> existing questions from this course
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(useExistingQuestions ? "setup" : "questions")}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canSubmit}
              >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create {isSimulation ? "Exam" : "Quiz"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
