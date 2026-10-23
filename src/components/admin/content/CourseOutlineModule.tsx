import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ListOrdered,
  Plus,
  ArrowUp,
  ArrowDown,
  Clock,
  Target,
  Edit2,
  Trash2,
  Save,
  Loader2,
  BookMarked,
  CheckCircle2,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { CascadeSelection } from "./InstitutionalCascadeSelector";

export interface SyllabusTopic {
  id: string;
  course_id: string;
  name: string;
  order_index: number;
  description: string | null;
  estimated_minutes?: number;
  learning_objectives?: string[];
  subtopics?: string[];
}

interface Props {
  cascade: CascadeSelection;
}

export const CourseOutlineModule: React.FC<Props> = ({ cascade }) => {
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formMinutes, setFormMinutes] = useState<number>(45);
  const [formObjectives, setFormObjectives] = useState("");
  const [formSubtopics, setFormSubtopics] = useState("");

  // Bulk paste modal state
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  // Load topics whenever selected course changes
  const loadTopics = async () => {
    if (!cascade.courseId) {
      setTopics([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("topics")
        .select("id, course_id, name, order_index, description")
        .eq("course_id", cascade.courseId)
        .order("order_index", { ascending: true });

      if (error) throw error;

      const parsed: SyllabusTopic[] = (data || []).map((t: any) => {
        let estMin = 45;
        let objectives: string[] = [];
        let subs: string[] = [];

        // Parse structured metadata stored in description if formatted as JSON or delimited
        if (t.description) {
          try {
            if (t.description.startsWith("{")) {
              const parsedDesc = JSON.parse(t.description);
              estMin = parsedDesc.estimated_minutes ?? 45;
              objectives = parsedDesc.learning_objectives ?? [];
              subs = parsedDesc.subtopics ?? [];
            } else {
              // Plain text description
              objectives = [t.description];
            }
          } catch {
            objectives = [t.description];
          }
        }

        return {
          id: t.id,
          course_id: t.course_id,
          name: t.name,
          order_index: t.order_index,
          description: t.description,
          estimated_minutes: estMin,
          learning_objectives: objectives,
          subtopics: subs,
        };
      });

      setTopics(parsed);
    } catch (err: any) {
      console.error("Failed to load course topics:", err);
      toast.error(err.message || "Failed to load syllabus topics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [cascade.courseId]);

  // Open modal for new topic
  const handleOpenAdd = () => {
    setEditingTopicId(null);
    setFormName("");
    setFormOrder(topics.length + 1);
    setFormMinutes(45);
    setFormObjectives("");
    setFormSubtopics("");
    setIsModalOpen(true);
  };

  // Open modal for editing existing topic
  const handleOpenEdit = (t: SyllabusTopic) => {
    setEditingTopicId(t.id);
    setFormName(t.name);
    setFormOrder(t.order_index);
    setFormMinutes(t.estimated_minutes ?? 45);
    setFormObjectives((t.learning_objectives ?? []).join("\n"));
    setFormSubtopics((t.subtopics ?? []).join("\n"));
    setIsModalOpen(true);
  };

  // Save single topic
  const handleSaveTopic = async () => {
    if (!formName.trim()) {
      toast.error("Topic name is required");
      return;
    }
    if (!cascade.courseId) {
      toast.error("Please select a course first");
      return;
    }

    setSaving(true);
    try {
      const objectivesArray = formObjectives
        .split("\n")
        .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
        .filter(Boolean);

      const subtopicsArray = formSubtopics
        .split("\n")
        .map((s) => s.trim().replace(/^[-*•]\s*/, ""))
        .filter(Boolean);

      const structuredDescription = JSON.stringify({
        summary: formName.trim(),
        estimated_minutes: Number(formMinutes) || 45,
        learning_objectives: objectivesArray,
        subtopics: subtopicsArray,
        university: cascade.university,
        department: cascade.department,
        faculty: cascade.faculty,
        level: cascade.level,
        semester: cascade.semester,
      });

      if (editingTopicId) {
        // Update
        const { error } = await supabase
          .from("topics")
          .update({
            name: formName.trim(),
            order_index: Number(formOrder),
            description: structuredDescription,
          } as any)
          .eq("id", editingTopicId);

        if (error) throw error;
        toast.success("Topic updated successfully");
      } else {
        // Insert
        const { error } = await supabase.from("topics").insert({
          course_id: cascade.courseId,
          name: formName.trim(),
          order_index: Number(formOrder),
          description: structuredDescription,
        } as any);

        if (error) throw error;
        toast.success("New topic created in syllabus");
      }

      setIsModalOpen(false);
      loadTopics();
    } catch (err: any) {
      console.error("Save topic error:", err);
      toast.error(err.message || "Failed to save topic");
    } finally {
      setSaving(false);
    }
  };

  // Delete topic
  const handleDeleteTopic = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete topic "${name}"?`)) return;

    try {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
      toast.success("Topic removed");
      loadTopics();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete topic");
    }
  };

  // Re-order topic position up or down
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= topics.length) return;

    const currentTopic = topics[index];
    const swapTopic = topics[targetIndex];

    // Optimistically update local array
    const updated = [...topics];
    updated[index] = { ...swapTopic, order_index: index + 1 };
    updated[targetIndex] = { ...currentTopic, order_index: targetIndex + 1 };
    setTopics(updated);

    try {
      await Promise.all([
        supabase
          .from("topics")
          .update({ order_index: index + 1 } as any)
          .eq("id", swapTopic.id),
        supabase
          .from("topics")
          .update({ order_index: targetIndex + 1 } as any)
          .eq("id", currentTopic.id),
      ]);
      toast.success("Syllabus sequence reordered");
    } catch (err: any) {
      console.error("Failed to reorder:", err);
      toast.error("Failed to persist order in database");
      loadTopics();
    }
  };

  // Bulk Import syllabus outline from text
  const handleBulkImportSyllabus = async () => {
    if (!bulkText.trim()) {
      toast.error("Please paste handbook syllabus outline lines");
      return;
    }
    if (!cascade.courseId) {
      toast.error("Please select a course first");
      return;
    }

    setSaving(true);
    try {
      // Parse lines like "1. Introduction to Algorithms" or "Module 2: Binary Search Trees"
      const lines = bulkText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const parsedRows = lines.map((line, idx) => {
        // Strip leading numbers or Roman numerals
        const cleanName = line.replace(/^(\d+[\.\):]|\b[IVXLCDM]+[\.\):]|Module\s*\d+:?|Topic\s*\d+:?)\s*/i, "").trim();
        const structuredDesc = JSON.stringify({
          summary: cleanName,
          estimated_minutes: 50,
          learning_objectives: [`Understand foundational principles of ${cleanName}`],
          subtopics: [],
          university: cascade.university,
          department: cascade.department,
          faculty: cascade.faculty,
        });

        return {
          course_id: cascade.courseId,
          name: cleanName || line,
          order_index: topics.length + idx + 1,
          description: structuredDesc,
        };
      });

      const { error } = await supabase.from("topics").insert(parsedRows as any);
      if (error) throw error;

      toast.success(`Imported ${parsedRows.length} topics into official syllabus!`);
      setIsBulkOpen(false);
      setBulkText("");
      loadTopics();
    } catch (err: any) {
      console.error("Bulk syllabus error:", err);
      toast.error(err.message || "Failed to bulk import syllabus");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-amber-600" />
              Course Outline &amp; Syllabus Structure
            </h3>
            <Badge className="bg-amber-500 text-white font-mono text-xs">
              {cascade.courseCode || "No Course Selected"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Build and sequence syllabus modules according to the official {cascade.university} department handbook.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkOpen(true)}
            disabled={!cascade.courseId}
            className="border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 text-xs font-semibold"
          >
            <ClipboardList className="w-4 h-4 mr-1.5" />
            Bulk Paste Syllabus
          </Button>

          <Button
            size="sm"
            onClick={handleOpenAdd}
            disabled={!cascade.courseId}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Syllabus Topic
          </Button>
        </div>
      </div>

      {/* Topics list card */}
      <Card className="border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden rounded-2xl">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-neutral-200 flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-amber-600" />
                Structured Topics &amp; Learning Objectives
              </CardTitle>
              <CardDescription className="text-xs">
                Total Topics: <span className="font-semibold text-slate-900 dark:text-white">{topics.length}</span>
                {topics.length > 0 && ` · Estimated Total Study: ${topics.reduce((acc, t) => acc + (t.estimated_minutes ?? 45), 0)} mins`}
              </CardDescription>
            </div>

            {cascade.courseCode && (
              <span className="text-xs font-mono font-medium text-slate-500 dark:text-neutral-400">
                {cascade.university} / {cascade.department}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!cascade.courseId ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <BookMarked className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-60" />
              <p className="font-semibold text-slate-700 dark:text-neutral-300">No Course Selected</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please select or create a course in the cascade bar above to manage its syllabus.
              </p>
            </div>
          ) : loading ? (
            <div className="p-12 text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
              <p className="text-xs text-muted-foreground">Loading syllabus topics…</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              <Sparkles className="w-10 h-10 mx-auto mb-2 text-amber-500 opacity-70" />
              <p className="font-bold text-slate-800 dark:text-neutral-200">Syllabus is Empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                No syllabus topics created yet for {cascade.courseCode}. Click "Add Syllabus Topic" or "Bulk Paste Syllabus" to populate modules.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-neutral-800">
              {topics.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-amber-50/20 dark:hover:bg-neutral-800/30 transition-colors"
                >
                  {/* Left: order badge & details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="flex flex-col items-center">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs border border-amber-300/40">
                        {t.order_index}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                          {t.name}
                        </h4>
                        <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> {t.estimated_minutes ?? 45} mins
                        </Badge>
                      </div>

                      {/* Objectives */}
                      {t.learning_objectives && t.learning_objectives.length > 0 && (
                        <div className="text-xs text-slate-600 dark:text-neutral-400 space-y-1 mt-1">
                          <div className="font-semibold text-[11px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Target className="w-3 h-3 text-emerald-600" /> Key Learning Objectives:
                          </div>
                          <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600 dark:text-neutral-400">
                            {t.learning_objectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Subtopics tags */}
                      {t.subtopics && t.subtopics.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          {t.subtopics.map((sub, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 px-2 py-0.5 rounded-md"
                            >
                              • {sub}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: re-order buttons and actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <div className="flex items-center bg-slate-100 dark:bg-neutral-800 rounded-lg p-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-600 dark:text-neutral-300 disabled:opacity-30"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, "up")}
                        title="Move Up in Handbook Order"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-600 dark:text-neutral-300 disabled:opacity-30"
                        disabled={idx === topics.length - 1}
                        onClick={() => handleMoveOrder(idx, "down")}
                        title="Move Down in Handbook Order"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-600 hover:text-amber-600"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit Topic"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => handleDeleteTopic(t.id, t.name)}
                      title="Delete Topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Topic Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookMarked className="w-5 h-5 text-amber-600" />
              {editingTopicId ? "Edit Syllabus Topic" : "Add New Syllabus Topic"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Assign topic structure, study duration, and objectives for {cascade.courseCode}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Topic Title / Module Name *</Label>
              <Input
                placeholder="e.g. Logic Gates & Boolean Algebra"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Sequence Number (Order)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formOrder}
                  onChange={(e) => setFormOrder(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Est. Study Time (Mins)</Label>
                <Input
                  type="number"
                  min="10"
                  step="5"
                  value={formMinutes}
                  onChange={(e) => setFormMinutes(Number(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Key Learning Objectives</span>
                <span className="text-[10px] text-muted-foreground font-normal">(One per line)</span>
              </Label>
              <Textarea
                placeholder="• Express Boolean functions in canonical sum-of-products&#10;• Minimize logic circuits using Karnaugh Maps&#10;• Implement NAND and NOR universal logic networks"
                value={formObjectives}
                onChange={(e) => setFormObjectives(e.target.value)}
                rows={4}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Sub-topics &amp; Keywords</span>
                <span className="text-[10px] text-muted-foreground font-normal">(One per line)</span>
              </Label>
              <Textarea
                placeholder="Truth Tables&#10;De Morgan's Theorems&#10;Karnaugh Maps (K-maps)"
                value={formSubtopics}
                onChange={(e) => setFormSubtopics(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleSaveTopic}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Saving…
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Topic
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Paste Outline Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-600" />
              Bulk Import Handbook Syllabus
            </DialogTitle>
            <DialogDescription className="text-xs">
              Copy and paste the table of contents or syllabus topics directly from your department handbook.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              placeholder={`1. Introduction to Digital Systems\n2. Number Systems and Binary Arithmetic\n3. Boolean Algebra & Logic Gates\n4. Karnaugh Maps and Combinational Logic\n5. Flip-Flops and Sequential Logic Circuits`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: Numbering prefixes like "1.", "Module 1:", or "Topic A:" are automatically stripped and used to generate ordered syllabus modules.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleBulkImportSyllabus}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Importing…
                </>
              ) : (
                "Ingest Syllabus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CourseOutlineModule;
