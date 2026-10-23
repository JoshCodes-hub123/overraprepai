import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Sparkles,
  ClipboardList,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { MathMarkdown } from "@/components/quiz/MathMarkdown";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  courseCode: string;
  courseTitle?: string;
  content: string;
  topicId?: string;
  onOpenExplainer?: () => void;
  onLaunchPractice?: () => void;
}

export const LectureNoteReaderModal: React.FC<Props> = ({
  open,
  onOpenChange,
  title,
  courseCode,
  courseTitle,
  content,
  onOpenExplainer,
  onLaunchPractice,
}) => {
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Lecture notes copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const textClasses = {
    sm: "text-xs sm:text-[13px] leading-relaxed",
    base: "text-sm sm:text-[15px] leading-relaxed",
    lg: "text-base sm:text-[17px] leading-relaxed",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-amber-200/80 shadow-2xl">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 bg-amber-50/40 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500 text-white font-bold text-[11px] hover:bg-amber-500">
                {courseCode}
              </Badge>
              {courseTitle && (
                <span className="text-xs text-neutral-500 truncate max-w-xs">
                  {courseTitle}
                </span>
              )}
              <span className="text-[10px] text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-full font-medium">
                Verified Syllabus Note
              </span>
            </div>
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-neutral-900 leading-tight">
              {title}
            </DialogTitle>
          </div>

          {/* Reader controls */}
          <div className="flex items-center gap-1 shrink-0 pt-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-neutral-200 text-neutral-600 hover:bg-white"
              title="Decrease Font Size"
              onClick={() => setFontSize(fontSize === "lg" ? "base" : "sm")}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-neutral-200 text-neutral-600 hover:bg-white"
              title="Increase Font Size"
              onClick={() => setFontSize(fontSize === "sm" ? "base" : "lg")}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg border-neutral-200 text-neutral-600 hover:bg-white"
              title="Copy Note Text"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {/* Scrollable Reader Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4">
          <div className={`prose max-w-none text-neutral-800 ${textClasses[fontSize]}`}>
            <MathMarkdown content={content} />
          </div>
        </div>

        {/* Action Footer Bar */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {onOpenExplainer && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenExplainer}
                className="h-8 text-xs font-bold border-amber-300 text-amber-800 hover:bg-amber-100/50"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                Explain with AI Tutor
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onLaunchPractice && (
              <Button
                size="sm"
                onClick={onLaunchPractice}
                className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
              >
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                CBT Questions
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs font-semibold text-neutral-600"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
