import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import DashboardNav from "@/components/layout/DashboardNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react";
import { ADMIN_ENVIRONMENTS } from "@/config/environments";

const LEVELS = ["100", "200", "300", "400", "500", "600"];

interface Course {
  id: string;
  code: string;
  name: string;
  department: string | null;
  level: string | null;
  description: string | null;
  is_active: boolean;
}

const empty = { id: "", code: "", name: "", department: "", level: "", description: "", is_active: true };

const AdminCourses = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<typeof empty>(empty);
  const [newEnvironmentId, setNewEnvironmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const newEnvironment = ADMIN_ENVIRONMENTS.find((option) => option.id === newEnvironmentId);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("courses")
      .select("id, code, name, department, level, description, is_active")
      .order("code");
    setCourses((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(empty); setNewEnvironmentId(""); setOpen(true); };
  const openEdit = (c: Course) => {
    setEditing({
      id: c.id, code: c.code, name: c.name,
      department: c.department || "", level: c.level || "",
      description: c.description || "", is_active: c.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing.code.trim() || !editing.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    if (!editing.id && !newEnvironment) {
      toast.error("Choose an academic environment for this course");
      return;
    }
    setSaving(true);
    const payload = {
      code: editing.code.toUpperCase().trim(),
      name: editing.name.trim(),
      department: editing.department || null,
      level: editing.level || null,
      description: editing.description || null,
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("courses").update(payload as any).eq("id", editing.id)
      : await supabase.from("courses").insert({
          ...payload,
          created_by: user!.id,
          environment_type: newEnvironment!.env,
          path_type: newEnvironment!.env,
          university: newEnvironment!.institution,
          university_code: newEnvironment!.institution,
        } as any);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "Course updated" : "Course created");
    setOpen(false);
    load();
  };

  const remove = async (c: Course) => {
    if (!confirm(`Delete ${c.code}? This will cascade to its quizzes and questions.`)) return;
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  const filtered = courses.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.department || "").toLowerCase().includes(q);
  });

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Course Management | Admin" description="Create and manage courses." />
      <Navbar />
      <div className="pt-16 md:pt-[72px]"><DashboardNav role="admin" /></div>
      <main className="container mx-auto px-4 pt-6 pb-16 max-w-6xl">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold mb-1">Course Management</h1>
            <p className="text-muted-foreground">Create courses, set their level, and manage availability.</p>
          </div>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Course</Button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="mb-2">{c.code}</Badge>
                    <CardTitle className="text-base font-display">{c.name}</CardTitle>
                  </div>
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {c.level ? `${c.level} Level` : "Any level"} {c.department ? `· ${c.department}` : ""} {!c.is_active && "· Inactive"}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(c)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">No courses match.</CardContent></Card>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing.id ? "Edit Course" : "New Course"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {!editing.id && (
                <div className="space-y-1.5">
                  <Label>Academic environment *</Label>
                  <Select value={newEnvironmentId} onValueChange={setNewEnvironmentId}>
                    <SelectTrigger><SelectValue placeholder="Choose an environment" /></SelectTrigger>
                    <SelectContent>
                      {ADMIN_ENVIRONMENTS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Code *</Label>
                  <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value })} placeholder="CSC 201" />
                </div>
                <div className="space-y-1.5">
                  <Label>Level</Label>
                  <Select value={editing.level} onValueChange={(v) => setEditing({ ...editing, level: v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l} Level</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Computer Programming II" />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Input value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} placeholder="Computer Science" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminCourses;
