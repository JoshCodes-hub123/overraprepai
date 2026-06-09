import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, FileType } from "lucide-react";
import {
  exportStudyPackPdf,
  type StudyPackMaterial,
} from "@/lib/exportStudyPack";


interface Material {
  id: string;
  title: string;
  description: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseCode: string;
  courseName: string;
  materials: Material[];
}

type Kind = "summary" | "key_points" | "flashcards" | "likely_questions";

export const ExportStudyPackDialog = ({ open, onOpenChange, courseCode, courseName, materials }: Props) => {
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeKeyPoints, setIncludeKeyPoints] = useState(true);
  const [includeFlashcards, setIncludeFlashcards] = useState(true);
  const [includeLikely, setIncludeLikely] = useState(true);
  const [generateMissing, setGenerateMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const fetchKind = async (materialId: string, kind: Kind) => {
    const { data: cached } = await supabase
      .from("study_material_artifacts")
      .select("content")
      .eq("material_id", materialId)
      .eq("kind", kind)
      .maybeSingle();
    if (cached?.content) return cached.content;

    if (!generateMissing) return null;

    const { data, error } = await supabase.functions.invoke("process-study-material", {
      body: { material_id: materialId, kind },
    });
    if (error || data?.error) return null;
    return data?.content ?? null;
  };

  const handleExport = async () => {
    if (materials.length === 0) {
      toast.error("No materials in this course yet");
      return;
    }
    const wanted: Kind[] = [];
    if (includeSummary) wanted.push("summary");
    if (includeKeyPoints) wanted.push("key_points");
    if (includeFlashcards) wanted.push("flashcards");
    if (includeLikely) wanted.push("likely_questions");

    if (wanted.length === 0) {
      toast.error("Pick at least one section to include");
      return;
    }

    const { aiGate } = await import("@/lib/aiGate");
    const gateKind = generateMissing ? "study_pack_generate" : "pdf_export";
    const ok = await aiGate.consume(gateKind, {
      action: gateKind === "study_pack_generate" ? "Generate Study Pack" : "Open Study Pack PDF",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const built: StudyPackMaterial[] = [];
      for (let i = 0; i < materials.length; i++) {
        const m = materials[i];
        setProgress(`Loading ${i + 1}/${materials.length}: ${m.title}`);
        const pack: StudyPackMaterial = { title: m.title, description: m.description };
        for (const k of wanted) {
          const content = await fetchKind(m.id, k);
          if (!content) continue;
          if (k === "summary") pack.summary = (content as { text?: string }).text ?? null;
          if (k === "key_points") pack.keyPoints = content as StudyPackMaterial["keyPoints"];
          if (k === "flashcards") pack.flashcards = content as StudyPackMaterial["flashcards"];
          if (k === "likely_questions") pack.likelyQuestions = content as StudyPackMaterial["likelyQuestions"];
        }
        built.push(pack);
      }

      setProgress("Opening PDF...");
      await exportStudyPackPdf({
        courseCode,
        courseName,
        materials: built,
        include: {
          summary: includeSummary,
          keyPoints: includeKeyPoints,
          flashcards: includeFlashcards,
          likelyQuestions: includeLikely,
        },
      });

      toast.success("Study pack opened in a new tab");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };


  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" /> Export Study Pack
          </DialogTitle>
          <DialogDescription>
            Bundle AI summaries, flashcards & likely questions for <span className="font-medium">{courseCode}</span> into one file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "pdf" | "md")} className="grid grid-cols-2 gap-2">
              <Label
                htmlFor="fmt-pdf"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${format === "pdf" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <RadioGroupItem id="fmt-pdf" value="pdf" />
                <FileType className="w-4 h-4" /> PDF
              </Label>
              <Label
                htmlFor="fmt-md"
                className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${format === "md" ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <RadioGroupItem id="fmt-md" value="md" />
                <FileText className="w-4 h-4" /> Markdown
              </Label>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Include</Label>
            <div className="space-y-2">
              {[
                { id: "sum", label: "AI Summary", v: includeSummary, set: setIncludeSummary },
                { id: "kp", label: "Key Points", v: includeKeyPoints, set: setIncludeKeyPoints },
                { id: "fc", label: "Flashcards", v: includeFlashcards, set: setIncludeFlashcards },
                { id: "lq", label: "Likely Exam Questions", v: includeLikely, set: setIncludeLikely },
              ].map((o) => (
                <label key={o.id} htmlFor={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox id={o.id} checked={o.v} onCheckedChange={(c) => o.set(!!c)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <label htmlFor="gen-missing" className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox id="gen-missing" checked={generateMissing} onCheckedChange={(c) => setGenerateMissing(!!c)} />
              <span>
                <span className="font-medium">Generate missing content</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Slower; runs AI for any material that hasn't been processed yet. Otherwise only cached AI content is included.
                </span>
              </span>
            </label>
          </div>

          {busy && progress && (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {busy ? "Exporting..." : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
