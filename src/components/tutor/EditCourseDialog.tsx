import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { LevelSelect, levelToDb, dbToLevel } from "@/components/shared/LevelSelect";

export interface EditableCourse {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
  level: string | null;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: EditableCourse | null;
  onSuccess: () => void;
}

export function EditCourseDialog({ open, onOpenChange, course, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("ALL");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (course) {
      setCode(course.code);
      setName(course.name);
      setDepartment(course.department ?? "");
      setDescription(course.description ?? "");
      setLevel(dbToLevel ? dbToLevel(course.level) : (course.level ?? "ALL"));
      setIsActive(course.is_active);
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    if (!code.trim() || !name.trim()) {
      toast.error("Course code and name are required");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase
      .from("courses")
      .update({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        department: department.trim() || null,
        description: description.trim() || null,
        level: levelToDb(level),
        is_active: isActive,
      } as any)
      .eq("id", course.id);
    setIsLoading(false);
    if (error) {
      toast.error(error.message || "Failed to update course");
      return;
    }
    toast.success("Course updated");
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>Update details for a course you created.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ec-code">Course Code *</Label>
              <Input id="ec-code" value={code} onChange={(e) => setCode(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-dept">Department</Label>
              <Input id="ec-dept" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-name">Course Name *</Label>
            <Input id="ec-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ec-desc">Description</Label>
            <Textarea id="ec-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <LevelSelect value={level} onChange={setLevel} label="Target Student Level" />
          <div className="flex items-center gap-2">
            <input
              id="ec-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <Label htmlFor="ec-active">Active (visible to students)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}