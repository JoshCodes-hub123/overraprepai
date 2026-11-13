import React, { useState } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  X,
  FolderUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    toast.success(`Added ${newItems.length} resource(s) to upload queue`);
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
        await new Promise((r) => setTimeout(r, 500));
        setFiles((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "success" } : item))
        );
      }
      toast.success(
        `Published ${files.length} study resource(s) to ${adminEnv.current.institution} repository!`
      );
    } catch {
      toast.error("Batch upload encountered an error.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#E8E2D6] dark:border-border bg-white dark:bg-card p-5 sm:p-7 shadow-[0_14px_34px_-12px_rgba(24,24,27,0.06)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E8E2D6] dark:border-border/60">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#18181B] text-[#F5D77F] flex items-center justify-center shadow-xs shrink-0">
            <FolderUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base sm:text-lg text-[#18181B] dark:text-foreground">
              Quick Resource &amp; Material Uploader
            </h3>
            <p className="text-xs text-[#71717A] dark:text-muted-foreground">
              Batch upload PDFs, CSV question sets, and study notes with auto-tagging for{" "}
              <strong className="font-mono text-[#18181B] dark:text-foreground">
                {adminEnv.current.institution}
              </strong>
              .
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#FAF0D6] border border-[#D4AF37]/40 px-3 py-1 text-xs font-extrabold text-[#996515] self-start sm:self-center">
          <Sparkles className="w-3.5 h-3.5" />
          Auto-Tagging Active
        </span>
      </div>

      {/* Auto-Tagging Default Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-muted/40 border border-[#E8E2D6] dark:border-border">
        <div>
          <label className="block text-[11px] font-extrabold text-[#52525B] uppercase tracking-wider mb-1.5">
            Default Course Code
          </label>
          <Input
            value={globalCourse}
            onChange={(e) => setGlobalCourse(e.target.value)}
            placeholder="e.g. CSC 201"
            className="h-10 rounded-xl bg-white border-[#E8E2D6] font-mono text-xs font-bold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-extrabold text-[#52525B] uppercase tracking-wider mb-1.5">
            Academic Year
          </label>
          <Input
            value={globalYear}
            onChange={(e) => setGlobalYear(e.target.value)}
            placeholder="e.g. 2024/2025"
            className="h-10 rounded-xl bg-white border-[#E8E2D6] font-mono text-xs font-bold"
          />
        </div>
        <div>
          <label className="block text-[11px] font-extrabold text-[#52525B] uppercase tracking-wider mb-1.5">
            Resource Category
          </label>
          <select
            value={globalCategory}
            onChange={(e) => setGlobalCategory(e.target.value)}
            className="w-full h-10 rounded-xl border border-[#E8E2D6] bg-white px-3 text-xs font-bold text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          >
            <option value="Lecture Notes">Lecture Notes</option>
            <option value="Past Questions">Past Questions</option>
            <option value="Syllabus">Syllabus &amp; Curriculum</option>
            <option value="Formula Sheets">Formula Sheets &amp; Summary</option>
          </select>
        </div>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div className="relative border-2 border-dashed border-[#D4AF37]/60 hover:border-[#18181B] rounded-3xl p-8 text-center bg-[#FAF8F5]/70 transition-all group cursor-pointer">
        <input
          type="file"
          multiple
          accept=".pdf,.csv,.docx,.xlsx"
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
        <div className="flex flex-col items-center pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-[#F5D77F] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
            <Upload className="w-5 h-5" />
          </div>
          <h4 className="font-display font-extrabold text-sm sm:text-base text-[#18181B]">
            Drop PDF study materials or CSV question banks here
          </h4>
          <p className="text-xs text-[#71717A] mt-1">
            Supports batch .pdf, .csv, and .docx uploads with automatic course &amp; year tagging
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8E2D6] bg-white text-xs font-bold text-[#18181B] shadow-2xs">
            Browse Files on Device
          </span>
        </div>
      </div>

      {/* File Queue Preview */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-extrabold text-sm text-[#18181B] font-mono tabular-nums">
              Upload Queue ({files.length} items)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiles([])}
              className="text-xs text-[#71717A] hover:text-rose-600 h-7 px-2 font-bold"
            >
              Clear All
            </Button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E2D6] text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#18181B] text-[#F5D77F] flex items-center justify-center shrink-0">
                    {item.type === "csv" ? (
                      <FileSpreadsheet className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#18181B] truncate">{item.name}</p>
                    <p className="font-mono text-[11px] text-[#71717A] flex items-center gap-2 tabular-nums">
                      <span>{item.size}</span>
                      <span>·</span>
                      <span className="font-extrabold text-[#996515]">{item.courseCode}</span>
                      <span>·</span>
                      <span>{item.academicYear}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "success" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-500/15 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Published
                    </span>
                  )}
                  {item.status === "uploading" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#996515] bg-[#FAF0D6] px-2.5 py-1 rounded-lg animate-pulse">
                      Uploading…
                    </span>
                  )}
                  {item.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-white text-[#71717A] transition"
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
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C5A059] hover:brightness-105 text-[#18181B] font-display font-black text-xs sm:text-sm cursor-pointer"
            >
              {isUploading ? "Publishing Batch…" : `Publish ${files.length} Resource(s) Now`}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickResourceUpload;
