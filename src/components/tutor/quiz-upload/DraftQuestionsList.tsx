import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
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
import { GripVertical, Pencil, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraftQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation?: string;
  difficulty?: "easy" | "medium" | "hard";
  image_url?: string;
  year?: number | null;
  is_past_question?: boolean;
}

interface Props {
  questions: DraftQuestion[];
  onChange: (next: DraftQuestion[]) => void;
}

function isValid(q: DraftQuestion) {
  return !!(
    q.question_text?.trim() &&
    q.option_a?.trim() &&
    q.option_b?.trim() &&
    q.option_c?.trim() &&
    q.option_d?.trim() &&
    q.correct_option
  );
}

export default function DraftQuestionsList({ questions, onChange }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggle = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === questions.length) setSelected(new Set());
    else setSelected(new Set(questions.map((_, i) => i)));
  };

  const bulkDelete = () => {
    if (!selected.size) return;
    onChange(questions.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  };

  const removeOne = (i: number) => {
    onChange(questions.filter((_, idx) => idx !== i));
    setSelected((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < i) next.add(v);
        else if (v > i) next.add(v - 1);
      });
      return next;
    });
  };

  const saveEdit = (i: number, q: DraftQuestion) => {
    const next = [...questions];
    next[i] = q;
    onChange(next);
    setEditingIndex(null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    onChange(arrayMove(questions, from, to));
    setSelected(new Set()); // indices shifted, simpler to reset
  };

  if (!questions.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No questions yet — use Upload, Paste, or AI Generate to add some.
      </p>
    );
  }

  const allSelected = selected.size === questions.length;
  const invalidCount = questions.filter((q) => !isValid(q)).length;

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-2">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          Select all
        </label>
        <div className="flex items-center gap-2 text-xs">
          {invalidCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="w-3 h-3" /> {invalidCount} need fixing
            </Badge>
          )}
          {selected.size > 0 && (
            <Button size="sm" variant="destructive" onClick={bulkDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete {selected.size}
            </Button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={questions.map((_, i) => i.toString())}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {questions.map((q, i) => (
              <SortableRow
                key={i}
                index={i}
                question={q}
                checked={selected.has(i)}
                onToggle={() => toggle(i)}
                onEdit={() => setEditingIndex(i)}
                onDelete={() => removeOne(i)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {editingIndex !== null && questions[editingIndex] && (
        <EditQuestionDialog
          index={editingIndex}
          question={questions[editingIndex]}
          onClose={() => setEditingIndex(null)}
          onSave={(q) => saveEdit(editingIndex, q)}
        />
      )}
    </>
  );
}

function SortableRow({
  index,
  question,
  checked,
  onToggle,
  onEdit,
  onDelete,
}: {
  index: number;
  question: DraftQuestion;
  checked: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: index.toString(),
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const valid = isValid(question);
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 py-2 px-2 rounded-md border bg-card",
        !valid && "border-rose-300 bg-rose-50/40 dark:bg-rose-500/5",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing pt-1"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <Checkbox className="mt-1" checked={checked} onCheckedChange={onToggle} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          {index + 1}. {question.question_text || <span className="italic text-rose-600">(empty)</span>}
        </p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          {valid ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3 h-3 text-rose-600" />
          )}
          Answer: {question.correct_option}
          {question.difficulty && <> · {question.difficulty}</>}
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Edit">
        <Pencil className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Delete">
        <Trash2 className="w-4 h-4 text-rose-600" />
      </Button>
    </li>
  );
}

function EditQuestionDialog({
  index,
  question,
  onClose,
  onSave,
}: {
  index: number;
  question: DraftQuestion;
  onClose: () => void;
  onSave: (q: DraftQuestion) => void;
}) {
  const [draft, setDraft] = useState<DraftQuestion>({ ...question });

  const update = <K extends keyof DraftQuestion>(k: K, v: DraftQuestion[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit question {index + 1}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Question text</Label>
            <Textarea
              rows={3}
              value={draft.question_text}
              onChange={(e) => update("question_text", e.target.value)}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {(["A", "B", "C", "D"] as const).map((k) => {
              const key = (`option_${k.toLowerCase()}`) as "option_a" | "option_b" | "option_c" | "option_d";
              return (
                <div key={k}>
                  <Label className="text-xs">Option {k}</Label>
                  <Input
                    value={(draft as any)[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <div>
            <Label className="text-xs mb-1 block">Correct answer</Label>
            <RadioGroup
              className="flex gap-3"
              value={draft.correct_option}
              onValueChange={(v) => update("correct_option", v as any)}
            >
              {(["A", "B", "C", "D"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-sm">
                  <RadioGroupItem value={k} /> {k}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Difficulty</Label>
              <Select
                value={draft.difficulty || "medium"}
                onValueChange={(v: any) => update("difficulty", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Year (optional)</Label>
              <Input
                type="number"
                value={draft.year ?? ""}
                onChange={(e) => update("year", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Explanation</Label>
            <Textarea
              rows={2}
              value={draft.explanation || ""}
              onChange={(e) => update("explanation", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSave(draft)}
            className="bg-amber-500 hover:bg-amber-600 text-white"
            disabled={!isValid(draft)}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}