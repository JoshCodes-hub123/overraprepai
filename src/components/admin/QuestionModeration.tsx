import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EnvironmentScope, scopeCourseQuery, scopeEmbeddedCourseQuery } from "@/lib/environmentScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, Eye, CheckCircle2, XCircle, Trash2, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  difficulty: string;
  is_approved: boolean;
  is_premium: boolean;
  created_at: string;
  course: {
    code: string;
    name: string;
  };
  topic: {
    name: string;
  };
  tutor: {
    full_name: string | null;
  } | null;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

export function QuestionModeration({ scope }: { scope?: EnvironmentScope | null } = {}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchQuestions = async () => {
    try {
      const { data: questionsData } = await scopeEmbeddedCourseQuery(
        supabase
          .from("questions")
          .select(`
            *,
            courses!inner(code, name, environment_type, university),
            topics(name)
          `)
          .order("created_at", { ascending: false })
          .limit(100),
        scope,
      );

      if (questionsData) {
        const questionsWithTutor = await Promise.all(
          questionsData.map(async (q) => {
            let tutor = null;
            if (q.tutor_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", q.tutor_id)
                .single();
              tutor = profile;
            }
            return {
              ...q,
              course: q.courses as { code: string; name: string },
              topic: q.topics as { name: string },
              tutor,
            };
          })
        );

        setQuestions(questionsWithTutor);
      }

      const { data: coursesData } = await scopeCourseQuery(
        supabase.from("courses").select("id, code, name").order("code"),
        scope,
      );

      if (coursesData) {
        setCourses(coursesData);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchQuestions();
    // Refetch whenever the admin switches academic environment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.environment_type, scope?.university]);

  const handleToggleApproval = async (questionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("questions")
        .update({ is_approved: !currentStatus })
        .eq("id", questionId);

      if (error) throw error;

      toast.success(`Question ${!currentStatus ? "approved" : "unapproved"}`);
      fetchQuestions();
    } catch (error: any) {
      console.error("Error updating question:", error);
      toast.error(error.message || "Failed to update question");
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase.from("questions").delete().eq("id", questionId);

      if (error) throw error;

      toast.success("Question deleted");
      fetchQuestions();
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast.error(error.message || "Failed to delete question");
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === "all" || q.course.code === filterCourse;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "approved" && q.is_approved) ||
      (filterStatus === "pending" && !q.is_approved);

    return matchesSearch && matchesCourse && matchesStatus;
  });

  const pendingCount = questions.filter((q) => !q.is_approved).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterCourse} onValueChange={setFilterCourse}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((course) => (
              <SelectItem key={course.id} value={course.code}>
                {course.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-muted-foreground">
          Total: <strong className="text-foreground">{questions.length}</strong>
        </span>
        <span className="text-muted-foreground">
          Approved: <strong className="text-success">{questions.filter((q) => q.is_approved).length}</strong>
        </span>
        <span className="text-muted-foreground">
          Pending: <strong className="text-accent">{pendingCount}</strong>
        </span>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Question</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Tutor</TableHead>
              <TableHead className="text-center">Approved</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No questions found
                </TableCell>
              </TableRow>
            ) : (
              filteredQuestions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <p className="line-clamp-2 text-foreground">{question.question_text}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{question.course.code}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {question.topic?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        question.difficulty === "hard"
                          ? "destructive"
                          : question.difficulty === "easy"
                          ? "secondary"
                          : "default"
                      }
                    >
                      {question.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {question.tutor?.full_name || "System"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={question.is_approved}
                      onCheckedChange={() =>
                        handleToggleApproval(question.id, question.is_approved)
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedQuestion(question)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(question.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Question Detail Dialog */}
      <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details</DialogTitle>
            <DialogDescription>
              {selectedQuestion?.course.code} - {selectedQuestion?.topic?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedQuestion && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Question</p>
                <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                  {selectedQuestion.question_text}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["A", "B", "C", "D"].map((opt) => {
                  const optionKey = `option_${opt.toLowerCase()}` as keyof Question;
                  const isCorrect = selectedQuestion.correct_option === opt;
                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-lg border ${
                        isCorrect
                          ? "border-success bg-success/10"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opt}.</span>
                        <span className="text-foreground">
                          {selectedQuestion[optionKey] as string}
                        </span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-success ml-auto" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedQuestion.explanation && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Explanation</p>
                  <p className="text-foreground bg-muted/30 p-3 rounded-lg">
                    {selectedQuestion.explanation}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-4">
                <Badge
                  variant={
                    selectedQuestion.difficulty === "hard"
                      ? "destructive"
                      : selectedQuestion.difficulty === "easy"
                      ? "secondary"
                      : "default"
                  }
                >
                  {selectedQuestion.difficulty}
                </Badge>
                <Badge variant={selectedQuestion.is_approved ? "default" : "outline"}>
                  {selectedQuestion.is_approved ? "Approved" : "Pending"}
                </Badge>
                {selectedQuestion.is_premium && (
                  <Badge variant="secondary">Premium</Badge>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedQuestion && !selectedQuestion.is_approved && (
              <Button
                onClick={() => {
                  handleToggleApproval(selectedQuestion.id, selectedQuestion.is_approved);
                  setSelectedQuestion(null);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve Question
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}