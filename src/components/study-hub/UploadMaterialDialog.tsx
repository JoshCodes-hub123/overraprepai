import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Loader2, Upload, FileText, File as FileIcon, X, AlertTriangle,
  CloudUpload, Cog, CheckCircle2, Clock, Sparkles,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  onUploaded: () => void;
}

const ACCEPTED = ".pdf,.docx,.doc,.pptx,.ppt,.xls,.xlsx,.txt,.md,.csv,.zip";
const ACCEPTED_EXT = ["pdf", "docx", "doc", "pptx", "ppt", "xls", "xlsx", "txt", "md", "csv", "zip"];
const MAX_BYTES = 500 * 1024 * 1024; // 500MB

type Stage = "idle" | "uploading" | "processing" | "ready" | "failed";

const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const STAGES: { key: Exclude<Stage, "idle" | "failed">; label: string; icon: typeof Clock }[] = [
  { key: "uploading",  label: "Uploading",  icon: CloudUpload },
  { key: "processing", label: "Saving",     icon: Cog },
  { key: "ready",      label: "Ready",      icon: CheckCircle2 },
];

export const UploadMaterialDialog = ({ open, onOpenChange, courseId, onUploaded }: Props) => {
  const { user, hasRole } = useAuth();
  const canPublish = hasRole("tutor") || hasRole("admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">(canPublish ? "public" : "private");
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setTitle("");
      setDescription("");
      setVisibility(canPublish ? "public" : "private");
      setStage("idle");
      setFileError(null);
      setDragOver(false);
    }
  }, [open, canPublish]);

  const handleFile = (f: File | null) => {
    setFileError(null);
    if (!f) return;
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPTED_EXT.includes(ext)) {
      setFileError(`Unsupported file type (.${ext}). Allowed: PDF, DOCX, PPTX, TXT, MD.`);
      return;
    }
    if (f.size === 0) {
      setFileError("This file appears to be empty.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFileError(`File too large (${formatBytes(f.size)} > 20 MB).`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!user || !file || !title.trim()) {
      toast.error("Pick a file and add a title");
      return;
    }
    setUploading(true);
    setStage("uploading");
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const materialId = crypto.randomUUID();
      const path = `${user.id}/${materialId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("study-materials")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      setStage("processing");
      const { data: signed } = await supabase.storage
        .from("study-materials")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: insErr } = await supabase.from("study_materials").insert({
        id: materialId,
        course_id: courseId,
        owner_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        file_url: signed?.signedUrl ?? "",
        file_path: path,
        file_type: file.type || ext,
        file_size: file.size,
        visibility,
      });
      if (insErr) throw insErr;

      setStage("ready");
      toast.success("Material uploaded");
      onUploaded();
      setTimeout(() => onOpenChange(false), 700);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setStage("failed");
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const fileIcon = file?.type === "application/pdf"
    ? <FileText className="w-5 h-5 text-rose-500" />
    : <FileIcon className="w-5 h-5 text-primary" />;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!uploading) onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" /> Upload Study Material
          </DialogTitle>
          <DialogDescription>
            PDF, DOCX, PPTX or text up to 20 MB. Once uploaded, tap <span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Sparkles className="w-3 h-3" />AI</span> on the material to generate summaries, flashcards or quizzes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          <div>
            <Label className="text-xs">File</Label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`mt-1.5 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/60 hover:bg-primary/5"
              } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <Upload className="w-7 h-7 mx-auto text-muted-foreground mb-1.5" />
              <p className="text-sm font-medium">Tap or drag a file here</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                PDF · DOCX · PPTX · TXT · MD · max 20 MB
              </p>
              <input
                ref={inputRef}
                id="file"
                type="file"
                accept={ACCEPTED}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {fileError && (
              <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {file && !fileError && (
              <div className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 flex items-center gap-2">
                {fileIcon}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{formatBytes(file.size)}</p>
                </div>
                {!uploading && (
                  <button
                    onClick={() => { setFile(null); setTitle(""); }}
                    className="p-1.5 rounded hover:bg-destructive/10 text-destructive shrink-0"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Stage tracker */}
            {stage !== "idle" && (
              <div className="mt-3">
                {stage === "failed" ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Upload failed — please try again.
                  </p>
                ) : (
                  <div className="flex items-center gap-1">
                    {STAGES.map((s, i) => {
                      const currentIdx = STAGES.findIndex((x) => x.key === stage);
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      const Icon = s.icon;
                      return (
                        <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
                          <div
                            className={`h-6 w-6 shrink-0 rounded-full grid place-items-center transition-colors ${
                              done ? "bg-emerald-500 text-white"
                              : active ? "bg-amber-500 text-white"
                              : "bg-muted text-muted-foreground"
                            }`}
                            aria-label={s.label}
                          >
                            {active && s.key !== "ready" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Icon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate">{s.label}</span>
                          {i < STAGES.length - 1 && (
                            <div className={`h-0.5 flex-1 rounded-full ${done ? "bg-emerald-500" : "bg-muted"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
              disabled={uploading}
              placeholder="e.g. Week 3 — Calculus notes"
            />
          </div>

          <div>
            <Label htmlFor="desc">Description (optional)</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={500}
              disabled={uploading}
              placeholder="A short note so classmates know what's inside."
            />
          </div>

          <div>
            <Label>Visibility</Label>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as "public" | "private")}
              className="mt-2"
              disabled={uploading}
            >
              {canPublish && (
                <div className="flex items-start gap-2">
                  <RadioGroupItem value="public" id="vpub" className="mt-1" />
                  <Label htmlFor="vpub" className="font-normal cursor-pointer">
                    <span className="font-medium">Public</span>
                    <p className="text-xs text-muted-foreground">All students in this course can view it.</p>
                  </Label>
                </div>
              )}
              <div className="flex items-start gap-2">
                <RadioGroupItem value="private" id="vpriv" className="mt-1" />
                <Label htmlFor="vpriv" className="font-normal cursor-pointer">
                  <span className="font-medium">Private</span>
                  <p className="text-xs text-muted-foreground">Only you can view it.</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* AI nudge */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-start gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-lg bg-amber-100 grid place-items-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <p className="text-xs text-amber-900/90 leading-relaxed">
              <span className="font-semibold">Next:</span> after upload, open this material and use{" "}
              <b>✨ AI</b> to instantly generate a Summary, Flashcards or a Practice Quiz.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={uploading || !file || !title.trim()}>
              {uploading
                ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Uploading…</>
                : <><Upload className="w-4 h-4 mr-1.5" /> Upload</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
