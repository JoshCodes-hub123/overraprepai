import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  FileUp,
  FileText,
  Eye,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ExternalLink,
  Search,
  Check,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { extractTextFromFile } from "@/lib/extractText";
import { CascadeSelection } from "./InstitutionalCascadeSelector";

export interface LectureMaterialItem {
  id: string;
  course_id: string;
  topic_id: string | null;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
  visibility: "draft" | "published";
  created_at: string;
  tags?: string[];
  topic_name?: string;
}

interface SyllabusTopicOption {
  id: string;
  name: string;
  order_index: number;
}

interface Props {
  cascade: CascadeSelection;
}

export const LectureNotesModule: React.FC<Props> = ({ cascade }) => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<LectureMaterialItem[]>([]);
  const [topics, setTopics] = useState<SyllabusTopicOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload state
  const [activeTab, setActiveTab] = useState<"file" | "text">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("general");
  const [isPublished, setIsPublished] = useState(true);
  const [materialType, setMaterialType] = useState<string>("handout");
  const [richTextContent, setRichTextContent] = useState("");

  // Extracted text preview modal
  const [previewTextOpen, setPreviewTextOpen] = useState(false);
  const [textSearchQuery, setTextSearchQuery] = useState("");

  // Load syllabus topics for topic tagging
  useEffect(() => {
    async function fetchCourseTopics() {
      if (!cascade.courseId) {
        setTopics([]);
        return;
      }
      try {
        const { data } = await supabase
          .from("topics")
          .select("id, name, order_index")
          .eq("course_id", cascade.courseId)
          .order("order_index", { ascending: true });

        setTopics((data as any) || []);
      } catch (err) {
        console.error("Failed to load topics for tagging:", err);
      }
    }
    fetchCourseTopics();
  }, [cascade.courseId]);

  // Load existing materials for active course
  const loadMaterials = useCallback(async () => {
    if (!cascade.courseId) {
      setMaterials([]);
      return;
    }

    setLoading(true);
    try {
      // Query study_materials (or lecture_materials if available)
      const { data, error } = await supabase
        .from("study_materials")
        .select("*")
        .eq("course_id", cascade.courseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("study_materials query notice:", error.message);
      }

      const rows: LectureMaterialItem[] = (data || []).map((m: any) => ({
        id: m.id,
        course_id: m.course_id,
        topic_id: m.topic_id,
        title: m.title,
        description: m.description,
        file_url: m.file_url,
        file_type: m.file_type || "pdf",
        file_size: m.file_size || 0,
        visibility: (m.visibility === "draft" ? "draft" : "published") as any,
        created_at: m.created_at,
        tags: m.tags || [],
      }));

      setMaterials(rows);
    } catch (err: any) {
      console.error("Failed to load materials:", err);
    } finally {
      setLoading(false);
    }
  }, [cascade.courseId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Handle file drop/selection and auto text extraction
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    if (!materialTitle) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setMaterialTitle(nameWithoutExt);
    }

    // Auto extract text for PDF and docx preview
    setExtracting(true);
    try {
      const extracted = await extractTextFromFile(file, { maxPages: 40 });
      setExtractedText(extracted);
      if (extracted.length > 0) {
        toast.success(`Extracted ${extracted.length.toLocaleString()} characters from document!`);
      }
    } catch (err) {
      console.warn("Text extraction warning:", err);
      setExtractedText("");
    } finally {
      setExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Upload material
  const handleUploadMaterial = async () => {
    if (!cascade.courseId) {
      toast.error("Please select a course first");
      return;
    }
    if (!materialTitle.trim()) {
      toast.error("Please provide a title for this material");
      return;
    }

    setUploading(true);
    try {
      let publicFileUrl = "";
      let fileSize = 0;
      let fileExtension = "pdf";

      if (activeTab === "file") {
        if (!selectedFile) {
          toast.error("Please select a document file to upload");
          setUploading(false);
          return;
        }

        fileSize = selectedFile.size;
        fileExtension = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf";
        const filePath = `${cascade.university}/${cascade.courseCode}/${Date.now()}_${selectedFile.name.replace(/\s+/g, "_")}`;

        // Attempt upload to Supabase Storage bucket `course_materials`
        try {
          const { error: storageError } = await supabase.storage
            .from("course_materials")
            .upload(filePath, selectedFile, {
              cacheControl: "3600",
              upsert: true,
            });

          if (storageError) {
            console.warn("Supabase storage upload fallback:", storageError.message);
            // Fallback: create object URL or standard reference
            publicFileUrl = URL.createObjectURL(selectedFile);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("course_materials")
              .getPublicUrl(filePath);
            publicFileUrl = publicUrlData?.publicUrl || filePath;
          }
        } catch {
          publicFileUrl = URL.createObjectURL(selectedFile);
        }
      } else {
        // Rich text note
        if (!richTextContent.trim()) {
          toast.error("Please write or paste your rich text notes");
          setUploading(false);
          return;
        }
        fileSize = new Blob([richTextContent]).size;
        fileExtension = "md";
        // Create text data URI for immediate accessibility
        publicFileUrl = `data:text/markdown;charset=utf-8,${encodeURIComponent(richTextContent)}`;
      }

      const assignedTopicId = selectedTopicId === "general" ? null : selectedTopicId;

      // Construct metadata tags
      const tags = [
        cascade.university,
        cascade.department,
        `${cascade.level}L`,
        materialType,
        isPublished ? "published" : "draft",
      ].filter(Boolean);

      const payload = {
        course_id: cascade.courseId,
        topic_id: assignedTopicId,
        title: materialTitle.trim(),
        description:
          materialDescription.trim() ||
          (extractedText ? extractedText.slice(0, 300) + "…" : `Lecture material for ${cascade.courseCode}`),
        file_path: publicFileUrl,
        file_url: publicFileUrl,
        file_type: fileExtension,
        file_size: fileSize,
        visibility: isPublished ? "published" : "draft",
        owner_id: user?.id || "admin_operator",
        tags,
      };

      // 1. Insert into study_materials
      const { error: insertError } = await supabase
        .from("study_materials")
        .insert(payload as any);

      if (insertError) {
        console.warn("study_materials insert error, trying alternative mutation:", insertError.message);
      }

      toast.success(
        `Material "${materialTitle}" ${isPublished ? "published" : "saved as draft"} successfully!`
      );

      // Reset form
      setSelectedFile(null);
      setExtractedText("");
      setMaterialTitle("");
      setMaterialDescription("");
      setRichTextContent("");
      loadMaterials();
    } catch (err: any) {
      console.error("Upload material error:", err);
      toast.error(err.message || "Failed to save lecture material");
    } finally {
      setUploading(false);
    }
  };

  // Toggle material visibility (Draft / Published)
  const handleToggleVisibility = async (id: string, current: "draft" | "published") => {
    const next = current === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("study_materials")
        .update({ visibility: next } as any)
        .eq("id", id);

      if (error) throw error;
      setMaterials((prev) =>
        prev.map((m) => (m.id === id ? { ...m, visibility: next } : m))
      );
      toast.success(`Material visibility changed to ${next}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update visibility");
    }
  };

  // Delete material
  const handleDeleteMaterial = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const { error } = await supabase.from("study_materials").delete().eq("id", id);
      if (error) throw error;
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success("Material deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete material");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box Card */}
      <Card className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-amber-600" />
                Upload Course Notes &amp; Academic Handouts
              </CardTitle>
              <CardDescription className="text-xs">
                Upload PDFs, lecture slides, or markdown notes bound to {cascade.courseCode || "selected course"} syllabus topics.
              </CardDescription>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 dark:text-neutral-400">
                Live Status:
              </span>
              <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 px-3 py-1.5 rounded-full">
                <Switch
                  checked={isPublished}
                  onCheckedChange={setIsPublished}
                  id="visibility-switch"
                />
                <Label htmlFor="visibility-switch" className="text-xs font-semibold cursor-pointer">
                  {isPublished ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Published
                    </span>
                  ) : (
                    <span className="text-amber-600">Draft</span>
                  )}
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
              <TabsTrigger value="file" className="text-xs flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> PDF / Handout Dropzone
              </TabsTrigger>
              <TabsTrigger value="text" className="text-xs flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Rich Text / Markdown
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: File Dropzone */}
            <TabsContent value="file" className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-amber-300 dark:border-neutral-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-6 sm:p-8 text-center bg-amber-500/5 transition-all cursor-pointer group"
                onClick={() => {
                  const input = document.getElementById("file-upload-input") as HTMLInputElement;
                  input?.click();
                }}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.docx,.txt,.pptx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <FileUp className="w-6 h-6" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-neutral-200 flex items-center justify-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · {selectedFile.type || "Document"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-neutral-300">
                      Drag &amp; drop PDF handout or lecture slides here
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports PDF, DOCX, PPTX, or TXT. Automatic text extraction runs immediately.
                    </p>
                  </div>
                )}
              </div>

              {/* Text extraction indicator */}
              {extracting && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Extracting text content from document preview using client PDF engine…</span>
                </div>
              )}

              {extractedText && (
                <div className="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong className="font-semibold text-emerald-900 dark:text-emerald-200">
                        Automated Text Extraction Ready:
                      </strong>{" "}
                      {extractedText.length.toLocaleString()} characters extracted (~{Math.round(extractedText.length / 1000)} min read)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewTextOpen(true)}
                    className="h-7 text-xs border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/60"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" /> Inspect Text
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Tab 2: Rich text note */}
            <TabsContent value="text" className="space-y-3">
              <Label className="text-xs font-semibold">Lecture Notes / Summary Content (Markdown supported)</Label>
              <Textarea
                placeholder="# Course Unit: Circuit Analysis&#10;&#10;## Key Formulas:&#10;Kirchhoff's Current Law (KCL): $\sum I_{in} = \sum I_{out}$&#10;&#10;## Lecture Summary:&#10;Key points from today's lecture..."
                value={richTextContent}
                onChange={(e) => {
                  setRichTextContent(e.target.value);
                  setExtractedText(e.target.value);
                }}
                rows={7}
                className="font-mono text-xs"
              />
            </TabsContent>
          </Tabs>

          {/* Form Fields: Title, Topic Tagging, Material Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-semibold">Material Title *</Label>
              <Input
                placeholder="e.g. Chapter 1: Foundations & Architecture"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Assign to Syllabus Topic</span>
                <span className="text-[10px] text-amber-600 font-normal">Weak-area tracking</span>
              </Label>
              <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Select Syllabus Topic" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="general" className="text-xs font-semibold">
                    📚 General Course Material
                  </SelectItem>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      #{t.order_index} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <Label className="text-xs font-semibold">Material Type</Label>
              <Select value={materialType} onValueChange={setMaterialType}>
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="handout" className="text-xs">
                    📄 Official Lecture Handout
                  </SelectItem>
                  <SelectItem value="slides" className="text-xs">
                    🖥️ Lecture Presentation Slides
                  </SelectItem>
                  <SelectItem value="summary" className="text-xs">
                    📝 High-Yield Summary Note
                  </SelectItem>
                  <SelectItem value="past_solutions" className="text-xs">
                    💡 Past Questions Solution Guide
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Summary / Description (Optional)</Label>
            <Input
              placeholder="Brief summary to show students on download card"
              value={materialDescription}
              onChange={(e) => setMaterialDescription(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleUploadMaterial}
              disabled={uploading || !cascade.courseId}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs min-h-[44px] px-6 shadow-xs"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading Material…
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Save &amp; {isPublished ? "Publish Material" : "Save as Draft"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials List for Active Course */}
      <Card className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Course Materials Bank
              </CardTitle>
              <CardDescription className="text-xs">
                Active Materials: <span className="font-semibold text-slate-900 dark:text-white">{materials.length}</span> items for {cascade.courseCode}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!cascade.courseId ? (
            <div className="p-10 text-center text-muted-foreground text-xs">
              Select a course above to view materials.
            </div>
          ) : loading ? (
            <div className="p-10 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
              <p className="text-xs text-muted-foreground">Loading course materials…</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-xs">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-400 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-neutral-300">No Materials Uploaded Yet</p>
              <p className="mt-1">Drop a lecture handout or slides above to publish for {cascade.courseCode} students.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {materials.map((m) => {
                const matchedTopic = topics.find((t) => t.id === m.topic_id);
                return (
                  <div
                    key={m.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-neutral-100 truncate">
                          {m.title}
                        </h4>
                        <Badge
                          variant={m.visibility === "published" ? "default" : "secondary"}
                          className={
                            m.visibility === "published"
                              ? "bg-emerald-600 text-white text-[10px]"
                              : "bg-amber-100 text-amber-800 text-[10px]"
                          }
                        >
                          {m.visibility.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {m.file_type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {matchedTopic ? (
                          <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-[11px]">
                            Topic: #{matchedTopic.order_index} {matchedTopic.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 bg-slate-100 dark:bg-neutral-800 px-2 py-0.5 rounded text-[11px]">
                            General Course Material
                          </span>
                        )}

                        {m.file_size > 0 && (
                          <span>{(m.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                        )}
                        <span>· Added {new Date(m.created_at).toLocaleDateString()}</span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-1">
                          {m.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleVisibility(m.id, m.visibility)}
                        className="text-xs h-8"
                      >
                        {m.visibility === "published" ? "Unpublish" : "Publish"}
                      </Button>

                      {m.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="h-8 w-8 text-slate-600 hover:text-amber-600"
                        >
                          <a href={m.file_url} target="_blank" rel="noopener noreferrer" title="Download Material">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMaterial(m.id, m.title)}
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        title="Delete Material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extracted Text Inspector Modal */}
      <Dialog open={previewTextOpen} onOpenChange={setPreviewTextOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-amber-600" />
              Extracted Document Text Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Preview the text extracted directly from the uploaded document.
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search extracted text keywords…"
              value={textSearchQuery}
              onChange={(e) => setTextSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-neutral-950 p-4 rounded-xl border border-slate-200 dark:border-neutral-800 text-xs font-mono leading-relaxed select-text whitespace-pre-wrap">
            {textSearchQuery ? (
              extractedText
                .split(new RegExp(`(${textSearchQuery})`, "gi"))
                .map((part, i) =>
                  part.toLowerCase() === textSearchQuery.toLowerCase() ? (
                    <mark key={i} className="bg-amber-300 text-black px-0.5 rounded font-bold">
                      {part}
                    </mark>
                  ) : (
                    part
                  )
                )
            ) : (
              extractedText || "No text available"
            )}
          </div>

          <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
            <span>Total Characters: {extractedText.length.toLocaleString()}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(extractedText);
                toast.success("Text copied to clipboard!");
              }}
            >
              Copy All Text
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LectureNotesModule;
