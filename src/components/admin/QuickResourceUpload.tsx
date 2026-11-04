import React, { useState } from "react";
import { Upload, FileText, FileSpreadsheet, CheckCircle2, Sparkles, AlertCircle, X, Plus, FolderUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAdminEnvironment } from "@/hooks/useAdminEnvironment";

interface UploadItem {
  id: string;
  name: string;
  size: string;
  type: "pdf" | "csv" | "docx";
  courseCode: string;
  academicYear: string;
  category: string;
  status: "pending" | "uploading" | "success" | "error";
}

export const QuickResourceUpload: React.FC = () => {
  const adminEnv = useAdminEnvironment();
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [globalCourse, setGlobalCourse] = useState("CSC 201");
  const [globalYear, setGlobalYear] = useState("2024/2025");
  const [globalCategory, setGlobalCategory] = useState("Lecture Notes");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files;
    if (!rawFiles || rawFiles.length === 0) return;

    const newItems: UploadItem[] = Array.from(rawFiles).map((f, i) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "pdf";
      return {
        id: `${Date.now()}-${i}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: ext === "csv" ? "csv" : ext === "docx" ? "docx" : "pdf",
        courseCode: globalCourse,
        academicYear: globalYear,
        category: globalCategory,
        status: "pending",
      };
    });

    setFiles((prev) => [...prev, ...newItems]);
    toast.added ? toast.added(`Added ${newItems.length} resource(s) to queue`) : toast.success(`Added ${newItems.length} resource(s) to upload queue`);
  };

  const removeItem = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartBatchUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select or drop files to upload first.");
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        setFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "uploading" } : item))
        );
        await new Promise((r) => setTimeout(r, 600));
        setFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "success" } : item))
        );
      }
      toast.success(`Successfully published ${files.length} study resource(s) to ${adminEnv.current.institution} repository!`);
    } catch (err) {
      toast.error("Batch upload encountered an error.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6 border-amber-300/60 bg-gradient-to-br from-card via-card to-amber-50/30 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm">
            <FolderUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground">
              Quick Resource &amp; Material Uploader
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Batch upload PDFs, CSV question sets, and study notes with auto-tagging for {adminEnv.current.institution}.
            </p>
          </div>
        </div>
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 self-start sm:self-center">
          Auto-Tagging Enabled
        </Badge>
      </div>

      {/* Auto-Tagging Default Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border border-border/60 mb-6">
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
            Default Course Code
          </label>
          <Input
            value={globalCourse}
            onChange={(e) => setGlobalCourse(e.target.value)}
            placeholder="e.g. CSC 201"
            className="h-9 bg-card text-xs font-semibold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
            Academic Year
          </label>
          <Input
            value={globalYear}
            onChange={(e) => setGlobalYear(e.target.value)}
            placeholder="e.g. 2024/2025"
            className="h-9 bg-card text-xs font-semibold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground uppercase mb-1">
            Resource Category
          </label>
          <select
            value={globalCategory}
            onChange={(e) => setGlobalCategory(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="Lecture Notes">Lecture Notes</option>
            <option value="Past Questions">Past Questions</option>
            <option value="Syllabus">Syllabus &amp; Curriculum</option>
            <option value="Formula Sheets">Formula Sheets &amp; Summary</option>
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="relative border-2 border-dashed border-amber-400/40 hover:border-amber-500 rounded-3xl p-8 text-center bg-amber-50/20 dark:bg-amber-950/10 transition group cursor-pointer mb-6">
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.docx,.xlsx"
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-110 transition">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="font-display font-bold text-sm text-foreground">
            Drop PDF study materials or CSV datasets here
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            Supports multiple .pdf, .csv, and .docx files with automatic metadata tagging
          </p>
          <Button variant="outline" size="sm" className="mt-4 border-amber-500/40 text-amber-700 dark:text-amber-300">
            Browse Files on Device
          </Button>
        </div>
      </div>

      {/* File Queue Preview */}
      {files.length > 0 && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-sm text-foreground">
              Upload Queue ({files.length} items)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/80 text-xs shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    {item.type === "csv" ? <FileSpreadsheet className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                      <span>{item.size}</span>
                      <span>•</span>
                      <span className="font-semibold text-primary">{item.courseCode}</span>
                      <span>•</span>
                      <span>{item.academicYear}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "success" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Published
                    </span>
                  )}
                  {item.status === "uploading" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse">
                      Uploading...
                    </span>
                  )}
                  {item.status === "pending" && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 rounded-full hover:bg-muted text-muted-foreground transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleStartBatchUpload}
              disabled={isUploading || files.every((f) => f.status === "success")}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isUploading ? "Publishing Batch..." : `Publish ${files.length} Resource(s) Now`}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default QuickResourceUpload;
