import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, Loader2, Trash2, ExternalLink, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import FilePreview from "@/components/lecture/FilePreview";
import InAppDocViewer from "@/components/viewer/InAppDocViewer";

interface Note {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_path: string;
  file_type: string | null;
  file_size_bytes: number | null;
  view_count: number;
  download_count: number;
  thumbnail_url: string | null;
  created_at: string;
  tutor_id: string;
}

type Step = "select" | "preview";

export default function LectureNotes() {
  const { user, hasRole } = useAuth();
  const isTutor = !!user && hasRole("tutor");
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("select");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [thumbBlob, setThumbBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterMine, setFilterMine] = useState(false);
  const [viewing, setViewing] = useState<Note | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("lecture_notes").select("*").order("created_at", { ascending: false }).limit(100);
    if (filterMine && user) q = q.eq("tutor_id", user.id);
    const { data, error } = await q;
    if (error) toast.error("Couldn't load lecture notes");
    setNotes((data as Note[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterMine, user?.id]);

  const resetForm = () => {
    setTitle(""); setDesc(""); setFile(null); setThumbBlob(null); setStep("select");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPickFile = (f: File | null) => {
    setFile(f);
    setThumbBlob(null);
    if (f) setStep("preview");
  };

  const upload = async () => {
    if (!user || !file || !title.trim()) return;
    if (file.size > 25 * 1024 * 1024) return toast.error("File too large (max 25MB)");
    setUploading(true);

    const ext = file.name.split(".").pop() || "bin";
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${user.id}/${slug}.${ext}`;
    const { error: upErr } = await supabase.storage.from("lecture-notes").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("lecture-notes").getPublicUrl(path);

    let thumbnail_url: string | null = null;
    if (thumbBlob) {
      const thumbPath = `${user.id}/${slug}-thumb.png`;
      const { error: tErr } = await supabase.storage
        .from("lecture-notes")
        .upload(thumbPath, thumbBlob, { contentType: "image/png", upsert: false });
      if (!tErr) {
        thumbnail_url = supabase.storage.from("lecture-notes").getPublicUrl(thumbPath).data.publicUrl;
      }
    }

    const { error: insErr } = await supabase.from("lecture_notes").insert({
      tutor_id: user.id,
      title: title.trim(),
      description: desc.trim() || null,
      file_url: pub.publicUrl,
      file_path: path,
      file_type: file.type,
      file_size_bytes: file.size,
      thumbnail_url,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Lecture note published");
    resetForm();
    setOpen(false);
    load();
  };

  const remove = async (n: Note) => {
    if (!confirm(`Delete "${n.title}"?`)) return;
    await supabase.storage.from("lecture-notes").remove([n.file_path]);
    const { error } = await supabase.from("lecture_notes").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const trackView = async (n: Note) => {
    setNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, view_count: x.view_count + 1 } : x));
    await (supabase as any).rpc("increment_lecture_note_view", { p_note_id: n.id });
  };

  const openViewer = (n: Note) => {
    setViewing(n);
    setNotes((prev) => prev.map((x) => x.id === n.id ? { ...x, view_count: x.view_count + 1 } : x));
    (supabase as any).rpc("increment_lecture_note_view", { p_note_id: n.id }).then(() => {});
  };

  const fmtSize = (b: number | null) => {
    if (!b) return "";
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <SEO title="Lecture Notes" description="Tutor-uploaded study materials and lecture notes." />
      <DashboardNav role={(hasRole?.("admin") ? "admin" : hasRole?.("tutor") ? "tutor" : "student")} />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6 gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lecture Notes</h1>
            <p className="text-muted-foreground">Materials shared by tutors. Free to read & download.</p>
          </div>
          <div className="flex gap-2">
            {isTutor && (
              <Button variant="outline" size="sm" onClick={() => setFilterMine((v) => !v)}>
                {filterMine ? "Show all" : "My notes"}
              </Button>
            )}
            {isTutor && (
              <Dialog
                open={open}
                onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}
              >
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white">
                    <Upload className="w-4 h-4 mr-2" /> Upload note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {step === "select" ? "Upload Lecture Note" : "Confirm before publishing"}
                    </DialogTitle>
                  </DialogHeader>

                  {step === "select" && (
                    <div className="space-y-3">
                      <div>
                        <Label>Title *</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} rows={3} />
                      </div>
                      <div>
                        <Label>File (PDF, DOCX, PPTX, image — max 25MB)</Label>
                        <Input
                          ref={fileRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*"
                          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          You'll see a preview/thumbnail in the next step.
                        </p>
                      </div>
                    </div>
                  )}

                  {step === "preview" && file && (
                    <div className="space-y-3">
                      <FilePreview file={file} onThumbnailReady={setThumbBlob} />
                      <div className="text-xs text-muted-foreground">
                        Title: <span className="font-medium text-foreground">{title || "(untitled)"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <Button variant="outline" onClick={() => { setStep("select"); setFile(null); setThumbBlob(null); if (fileRef.current) fileRef.current.value = ""; }}>
                          Choose a different file
                        </Button>
                        <Button
                          onClick={upload}
                          disabled={uploading || !title.trim()}
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                          Publish
                        </Button>
                      </div>
                      {!title.trim() && (
                        <p className="text-xs text-destructive">Add a title in the previous step before publishing.</p>
                      )}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          </div>
        ) : notes.length === 0 ? (
          <div className="border rounded-2xl bg-white p-10 text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 text-amber-500" />
            <p className="font-semibold">No lecture notes yet</p>
            <p className="text-sm text-muted-foreground">
              {isTutor ? "Tap Upload note to share your first material." : "Check back soon — tutors are adding materials."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((n) => (
              <div key={n.id} className="border rounded-2xl bg-white p-5 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  {n.thumbnail_url ? (
                    <img
                      src={n.thumbnail_url}
                      alt=""
                      className="h-16 w-12 rounded-md object-cover border bg-muted shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-16 w-12 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{n.title}</h3>
                    {n.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{n.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <span>{fmtSize(n.file_size_bytes)}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {n.view_count}</span>
                      <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {n.download_count}</span>
                      <span>{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    onClick={() => openViewer(n)}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Eye className="w-4 h-4 mr-1" /> View in app
                  </Button>
                  {isTutor && n.tutor_id === user?.id && (
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => remove(n)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {viewing && (
        <InAppDocViewer
          url={viewing.file_url}
          title={viewing.title}
          fileType={viewing.file_type}
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
        />
      )}
    </div>
  );
}
