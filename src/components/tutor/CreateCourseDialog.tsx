import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import useEnvironment from "@/hooks/useEnvironment";
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
import { Loader2, Plus, X } from "lucide-react";
import { LevelSelect, levelToDb } from "@/components/shared/LevelSelect";

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateCourseDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCourseDialogProps) {
  const { user } = useAuth();
  const { environment, institution, isConfigured } = useEnvironment();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [topics, setTopics] = useState<string[]>([""]);
  const [level, setLevel] = useState("ALL");

  const addTopic = () => {
    setTopics([...topics, ""]);
  };

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index));
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!isConfigured || (environment === "university" && !institution)) {
      toast.error("Set a supported university in your profile before creating a course");
      return;
    }

    if (!code.trim() || !name.trim()) {
      toast.error("Course code and name are required");
      return;
    }

    setIsLoading(true);

    try {
      // Create course
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .insert({
          code: code.toUpperCase().trim(),
          name: name.trim(),
          department: department.trim() || null,
          description: description.trim() || null,
          level: levelToDb(level),
          created_by: user.id,
          environment_type: environment,
          path_type: environment,
          university: institution,
          university_code: institution,
        })
        .select()
        .single();

      if (courseError) throw courseError;

      // Create topics if any
      const validTopics = topics.filter((t) => t.trim());
      if (validTopics.length > 0 && course) {
        const topicsToInsert = validTopics.map((topic, index) => ({
          course_id: course.id,
          name: topic.trim(),
          order_index: index,
        }));

        const { error: topicsError } = await supabase
          .from("topics")
          .insert(topicsToInsert);

        if (topicsError) throw topicsError;
      }

      toast.success("Course created successfully!");
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error creating course:", error);
      toast.error(error.message || "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setName("");
    setDepartment("");
    setDescription("");
    setTopics([""]);
    setLevel("ALL");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Add a new course with topics that students can practice.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Course Code *</Label>
              <Input
                id="code"
                placeholder="e.g., PHY 101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                placeholder="e.g., Physics"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Course Name *</Label>
            <Input
              id="name"
              placeholder="e.g., General Physics I"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the course..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <LevelSelect value={level} onChange={setLevel} label="Target Student Level" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Topics</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addTopic}>
                <Plus className="w-4 h-4 mr-1" />
                Add Topic
              </Button>
            </div>
            <div className="space-y-2">
              {topics.map((topic, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Topic ${index + 1}`}
                    value={topic}
                    onChange={(e) => updateTopic(index, e.target.value)}
                  />
                  {topics.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTopic(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
