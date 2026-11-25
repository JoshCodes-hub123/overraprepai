import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  attempts_count: number;
}

interface DeleteQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: Quiz | null;
  onSuccess: () => void;
}

export function DeleteQuizDialog({
  open,
  onOpenChange,
  quiz,
  onSuccess,
}: DeleteQuizDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!quiz) return;

    setIsLoading(true);

    try {
      // First delete quiz_questions (related records)
      const { error: questionsError } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", quiz.id);

      if (questionsError) throw questionsError;

      // Delete quiz_ratings
      const { error: ratingsError } = await supabase
        .from("quiz_ratings")
        .delete()
        .eq("quiz_id", quiz.id);

      if (ratingsError) throw ratingsError;

      // Then delete the quiz
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quiz.id);

      if (error) throw error;

      toast.success("Quiz deleted successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      toast.error(error.message || "Failed to delete quiz");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Quiz
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Are you sure you want to delete <strong>"{quiz?.title}"</strong>?
            </span>
            {quiz && quiz.attempts_count > 0 && (
              <span className="block text-destructive">
                Warning: This quiz has {quiz.attempts_count} attempt(s). Student attempt history will remain but the quiz will no longer be accessible.
              </span>
            )}
            <span className="block">This action cannot be undone.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Delete Quiz
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
