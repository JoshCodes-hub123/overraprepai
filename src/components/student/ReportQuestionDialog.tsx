import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ReportQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText: string;
}

const REPORT_REASONS = [
  { value: "incorrect_answer", label: "Incorrect answer marked as correct" },
  { value: "unclear_question", label: "Question is unclear or confusing" },
  { value: "typo_error", label: "Typo or grammatical error" },
  { value: "wrong_options", label: "Options are incorrect or missing" },
  { value: "outdated_content", label: "Content is outdated" },
  { value: "other", label: "Other issue" },
];

const ReportQuestionDialog = ({
  open,
  onOpenChange,
  questionId,
  questionText,
}: ReportQuestionDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) {
      toast.error("Please select a reason for your report");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert the report
      const { error } = await supabase.from("question_reports").insert({
        question_id: questionId,
        reporter_id: user.id,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      // Notification to the tutor is dispatched server-side by admins/triggers,
      // so we no longer look up the tutor's email from the client.

      toast.success("Report submitted successfully", {
        description: "The tutor will review your feedback.",
      });
      
      // Reset form
      setReason("");
      setDescription("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting report:", error);
      if (error.message?.includes("duplicate")) {
        toast.error("You've already reported this question");
      } else {
        toast.error("Failed to submit report. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" />
            Report Question
          </DialogTitle>
          <DialogDescription>
            Help improve the platform by reporting issues with this question.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question Preview */}
          <div className="p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-foreground line-clamp-3">{questionText}</p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label>What's wrong with this question?</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Additional Details */}
          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide more context about the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Submit Report"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReportQuestionDialog;
