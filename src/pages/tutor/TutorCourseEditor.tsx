import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, BookOpen, Layers, Image as ImageIcon, FileText, Loader2, ListChecks } from "lucide-react";
import CourseQuizUploader from "@/components/tutor/CourseQuizUploader";

const TutorCourseEditor = () => {
  const { courseId } = useParams();
  const isNew = !courseId || courseId === "new";
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const qc = useQueryClient();

  if (primaryRole !== "tutor" && primaryRole !== "admin") {
    return (
      <div className="min-h-screen bg-background p-6">
        <p className="text-sm text-muted-foreground">Only tutors can manage courses.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title={isNew ? "New course" : "Manage course"} description="Create courses, add topics, and upload materials, quizzes and flashcards." />
      <DashboardNav role="tutor" />
      <div className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <DashboardBreadcrumb role="tutor" />
        {isNew ? <NewCourseForm userId={user?.id} onCreated={(id) => navigate(`/tutor/courses/${id}/manage`)} /> : (
          <ManageCourse courseId={courseId!} userId={user?.id} qc={qc} />
        )}
      </div>
    </div>
  );
};

const NewCourseForm = ({ userId, onCreated }: { userId?: string; onCreated: (id: string) => void }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!userId) return;
    if (!code.trim() || !name.trim()) {
      toast.error("Course code and name are required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("courses")
      .insert({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        department: department.trim() || null,
        level: level.trim() || null,
        description: description.trim() || null,
        created_by: userId,
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Course created");
    if (data?.id) onCreated(data.id);
  };

  return (
    <Card className="p-5 max-w-2xl">
      <h1 className="font-display text-xl flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500" /> New course</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Course code *</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. GNS101" />
        </div>
        <div>
          <label className="text-xs font-medium">Level</label>
          <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="100, 200…" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Course name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Use of English I" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Department</label>
          <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="GST / Sciences …" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Short description</label>
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />}
          Create course
        </Button>
      </div>
    </Card>
  );
};

const ManageCourse = ({ courseId, userId, qc }: { courseId: string; userId?: string; qc: ReturnType<typeof useQueryClient> }) => {
  const { data: course } = useQuery({
    queryKey: ["manage-course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId).maybeSingle();
      return data;
    },
  });
  const { data: topics = [] } = useQuery({
    queryKey: ["manage-topics", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("topics").select("*").eq("course_id", courseId).order("order_index");
      return data ?? [];
    },
  });

  const [newTopic, setNewTopic] = useState("");
  const addTopic = async () => {
    if (!newTopic.trim()) return;
    const { error } = await supabase.from("topics").insert({ course_id: courseId, name: newTopic.trim(), order_index: topics.length });
    if (error) { toast.error(error.message); return; }
    setNewTopic("");
    toast.success("Topic added");
    qc.invalidateQueries({ queryKey: ["manage-topics", courseId] });
  };

  return (
    <div className="space-y-5">
      <Card className="p-5 bg-gradient-to-br from-white to-amber-50/30">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-xl flex items-center gap-2"><BookOpen className="w-5 h-5 text-amber-500" /> {course?.code} — {course?.name}</h1>
            <p className="text-xs text-muted-foreground mt-1">Add topics and upload materials below. Students will see everything organised under this course.</p>
          </div>
          <Button asChild variant="outline" size="sm"><Link to={`/courses/${courseId}`}>View as student</Link></Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Layers className="w-4 h-4 text-amber-500" /> Topics</h3>
        <div className="flex gap-2">
          <Input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="New topic name…" onKeyDown={(e) => e.key === "Enter" && addTopic()} />
          <Button onClick={addTopic} className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="w-4 h-4" /></Button>
        </div>
        {topics.length > 0 && (
          <ul className="mt-3 space-y-1">
            {topics.map((t: any) => (
              <li key={t.id} className="text-sm px-2 py-1.5 rounded bg-muted/40 flex items-center justify-between">
                <span>{t.name}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Tabs defaultValue="quizzes">
        <TabsList className="w-full justify-start gap-1 h-auto p-1 overflow-x-auto bg-muted/50">
          <TabsTrigger value="quizzes" className="gap-1.5"><ListChecks className="w-3.5 h-3.5" /> Quizzes</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Documents</TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Flashcards</TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Images</TabsTrigger>
        </TabsList>
        <TabsContent value="quizzes" className="mt-3">
          <CourseQuizUploader courseId={courseId} userId={userId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-3">
          <DocumentsUploader courseId={courseId} userId={userId} />
        </TabsContent>
        <TabsContent value="flashcards" className="mt-3">
          <FlashcardsUploader courseId={courseId} userId={userId} />
        </TabsContent>
        <TabsContent value="images" className="mt-3">
          <ImagesUploader courseId={courseId} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const DocumentsUploader = ({ courseId, userId }: { courseId: string; userId?: string }) => {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const { data: docs = [] } = useQuery({
    queryKey: ["manage-docs", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("lecture_notes").select("id, title, file_url, created_at").eq("course_id", courseId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const upload = async () => {
    if (!file || !userId) { toast.error("Pick a file"); return; }
    if (file.size > 25 * 1024 * 1024) { toast.error("File too large (max 25 MB)"); return; }
    setBusy(true);
    // Sanitize filename — special chars and spaces break storage paths.
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${userId}/${courseId}/${slug}.${ext}`;
    const { error: upErr } = await supabase.storage.from("lecture-notes").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upErr) {
      console.error("lecture-notes upload failed", upErr);
      toast.error(`Upload failed: ${upErr.message}`);
      setBusy(false);
      return;
    }
    // lecture-notes bucket is private — mint a long-lived signed URL so
    // students can open the file. We refresh on view if it expires.
    const { data: signed } = await supabase.storage
      .from("lecture-notes")
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year
    const fileUrl = signed?.signedUrl ?? "";
    const { error } = await supabase.from("lecture_notes").insert({
      tutor_id: userId, course_id: courseId,
      title: title.trim() || file.name,
      file_url: fileUrl, file_path: path, file_type: file.type,
      file_size_bytes: file.size, is_published: true,
    });
    setBusy(false);
    if (error) {
      console.error("lecture_notes insert failed", error);
      toast.error(`Saved file but couldn't index it: ${error.message}`);
      return;
    }
    toast.success("Document uploaded");
    setTitle(""); setFile(null);
    qc.invalidateQueries({ queryKey: ["manage-docs", courseId] });
    qc.invalidateQueries({ queryKey: ["course-docs", courseId] });
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Upload a document / PDF</h3>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Button onClick={upload} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
        </Button>
      </div>
      {docs.length > 0 && (
        <ul className="mt-3 divide-y text-sm">
          {docs.map((d: any) => (
            <li key={d.id} className="py-1.5 flex items-center justify-between gap-2">
              <span className="truncate">{d.title}</span>
              <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline">Open</a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

const FlashcardsUploader = ({ courseId, userId }: { courseId: string; userId?: string }) => {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const add = async () => {
    if (!front.trim() || !back.trim() || !userId) return;
    setBusy(true);
    const { error } = await supabase.from("flashcards").insert({
      user_id: userId, front: front.trim(), back: back.trim(),
      is_public: true, course_id: courseId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Flashcard added");
    setFront(""); setBack("");
    qc.invalidateQueries({ queryKey: ["course-flashcards", courseId] });
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Add a flashcard</h3>
      <div className="space-y-2">
        <Input placeholder="Front (question / term)" value={front} onChange={(e) => setFront(e.target.value)} />
        <Textarea placeholder="Back (answer / definition)" rows={2} value={back} onChange={(e) => setBack(e.target.value)} />
        <div className="flex justify-end">
          <Button onClick={add} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1.5" />} Add
          </Button>
        </div>
      </div>
    </Card>
  );
};

const ImagesUploader = ({ courseId, userId }: { courseId: string; userId?: string }) => {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const upload = async () => {
    if (!file || !userId) return;
    setBusy(true);
    const path = `${userId}/${courseId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("course-images").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); setBusy(false); return; }
    const { data: pub } = supabase.storage.from("course-images").getPublicUrl(path);
    const { error } = await supabase.from("course_images").insert({
      course_id: courseId,
      uploaded_by: userId,
      storage_path: path,
      url: pub.publicUrl,
      caption: caption.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Image uploaded");
    setFile(null); setCaption("");
    qc.invalidateQueries({ queryKey: ["course-images", userId, courseId] });
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Upload an image / visual material</h3>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Input placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <Button onClick={upload} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Upload"}
        </Button>
      </div>
    </Card>
  );
};

export default TutorCourseEditor;