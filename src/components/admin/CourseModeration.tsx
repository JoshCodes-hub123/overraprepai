import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EnvironmentScope, scopeCourseQuery } from "@/lib/environmentScope";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Search, Edit, Trash2, Eye, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  topics_count: number;
  questions_count: number;
  tutor_name: string | null;
}

interface Topic {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
}

export function CourseModeration({ scope }: { scope?: EnvironmentScope | null } = {}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    department: "",
    description: "",
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchCourses = async () => {
    try {
      const { data: coursesData } = await scopeCourseQuery(
        supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false }),
        scope,
      );

      if (coursesData) {
        const coursesWithCounts = await Promise.all(
          coursesData.map(async (course) => {
            const { count: topicsCount } = await supabase
              .from("topics")
              .select("*", { count: "exact", head: true })
              .eq("course_id", course.id);

            const { count: questionsCount } = await supabase
              .from("questions")
              .select("*", { count: "exact", head: true })
              .eq("course_id", course.id);

            let tutorName = null;
            if (course.created_by) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", course.created_by)
                .single();
              tutorName = profile?.full_name;
            }

            return {
              ...course,
              topics_count: topicsCount || 0,
              questions_count: questionsCount || 0,
              tutor_name: tutorName,
            };
          })
        );

        setCourses(coursesWithCounts);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchCourses();
    // Refetch whenever the admin switches academic environment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope?.environment_type, scope?.university]);

  const fetchTopics = async (courseId: string) => {
    const { data } = await supabase
      .from("topics")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index");

    if (data) {
      setTopics(data);
    }
  };

  const handleViewCourse = async (course: Course) => {
    setSelectedCourse(course);
    setIsEditing(false);
    await fetchTopics(course.id);
  };

  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setEditForm({
      code: course.code,
      name: course.name,
      department: course.department || "",
      description: course.description || "",
      is_active: course.is_active,
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCourse) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("courses")
        .update({
          code: editForm.code.toUpperCase().trim(),
          name: editForm.name.trim(),
          department: editForm.department.trim() || null,
          description: editForm.description.trim() || null,
          is_active: editForm.is_active,
        })
        .eq("id", selectedCourse.id);

      if (error) throw error;

      toast.success("Course updated successfully");
      setSelectedCourse(null);
      setIsEditing(false);
      fetchCourses();
    } catch (error: any) {
      console.error("Error updating course:", error);
      toast.error(error.message || "Failed to update course");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (courseId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_active: !currentStatus })
        .eq("id", courseId);

      if (error) throw error;

      toast.success(`Course ${!currentStatus ? "activated" : "deactivated"}`);
      fetchCourses();
    } catch (error: any) {
      console.error("Error toggling course:", error);
      toast.error(error.message || "Failed to update course");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This will also delete all associated topics, questions, and quizzes.")) {
      return;
    }

    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseId);

      if (error) throw error;

      toast.success("Course deleted successfully");
      fetchCourses();
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast.error(error.message || "Failed to delete course");
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead className="text-center">Topics</TableHead>
              <TableHead className="text-center">Questions</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              filteredCourses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{course.code}</Badge>
                        <span className="font-medium text-foreground">{course.name}</span>
                      </div>
                      {course.department && (
                        <p className="text-sm text-muted-foreground mt-1">{course.department}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {course.tutor_name || "System"}
                  </TableCell>
                  <TableCell className="text-center">{course.topics_count}</TableCell>
                  <TableCell className="text-center">{course.questions_count}</TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={course.is_active}
                      onCheckedChange={() => handleToggleActive(course.id, course.is_active)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewCourse(course)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCourse(course)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteCourse(course.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View/Edit Dialog */}
      <Dialog
        open={!!selectedCourse}
        onOpenChange={() => {
          setSelectedCourse(null);
          setIsEditing(false);
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Course" : "Course Details"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update course information"
                : `${selectedCourse?.code} - ${selectedCourse?.name}`}
            </DialogDescription>
          </DialogHeader>

          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Course Code</Label>
                  <Input
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Course Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Inactive courses are hidden from students
                  </p>
                </div>
                <Switch
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-foreground">
                  {selectedCourse?.description || "No description"}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Topics ({topics.length})</p>
                {topics.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No topics added</p>
                ) : (
                  <div className="space-y-2">
                    {topics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
                      >
                        <span className="text-muted-foreground text-sm">{index + 1}.</span>
                        <span className="text-foreground">{topic.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => handleEditCourse(selectedCourse!)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}