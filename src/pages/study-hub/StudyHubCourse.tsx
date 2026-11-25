import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SEO } from "@/components/seo/SEO";
import { ArrowLeft, FileText, Lock, Globe, Plus, Trash2, Sparkles, Download, BookOpen } from "lucide-react";
import { UploadMaterialDialog } from "@/components/study-hub/UploadMaterialDialog";
import { MaterialAIPanel } from "@/components/study-hub/MaterialAIPanel";
import { ExportStudyPackDialog } from "@/components/study-hub/ExportStudyPackDialog";
import { StudyCoachPanel } from "@/components/study-hub/StudyCoachPanel";
import { LearningGoalsPanel } from "@/components/study-hub/LearningGoalsPanel";
import { CourseChat } from "@/components/course/CourseChat";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_type: string;
  file_size: number;
  file_url?: string | null;
  visibility: "public" | "private";
  owner_id: string;
  created_at: string;
}

interface Course { id: string; code: string; name: string }

const StudyHubCourse = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [tutorOwners, setTutorOwners] = useState<Record<string, { name: string | null; avatar: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [openMaterial, setOpenMaterial] = useState<Material | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const load = async () => {
    if (!courseId) return;
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from("courses").select("id, code, name").eq("id", courseId).single(),
      supabase.from("study_materials").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
    ]);
    if (c) setCourse(c as Course);
    const mats = (m as Material[]) ?? [];
    setMaterials(mats);

    // Identify which owners are tutors so we can mark verified materials
    const ownerIds = [...new Set(mats.map(x => x.owner_id).filter(Boolean))];
    if (ownerIds.length > 0) {
      const [{ data: roles }, { data: profs }] = await Promise.all([
        supabase.from("user_roles").select("user_id").in("user_id", ownerIds).eq("role", "tutor"),
        supabase.from("profiles").select("id, full_name, profile_image_url, avatar_url").in("id", ownerIds),
      ]);
      const tutorIds = new Set((roles ?? []).map((r: any) => r.user_id));
      const map: Record<string, { name: string | null; avatar: string | null }> = {};
      (profs ?? []).forEach((p: any) => {
        if (tutorIds.has(p.id)) {
          map[p.id] = { name: p.full_name, avatar: p.profile_image_url || p.avatar_url };
        }
      });
      setTutorOwners(map);
    } else {
      setTutorOwners({});
    }
    setLoading(false);
  };

  useEffect(() => { if (user && courseId) load(); }, [user, courseId]);

  const handleDelete = async (mat: Material) => {
    if (!confirm(`Delete "${mat.title}"? This removes the file and all AI artifacts.`)) return;
    const { error } = await supabase.from("study_materials").delete().eq("id", mat.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Material deleted");
    setOpenMaterial(null);
    load();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="flex justify-center pt-32"><LoadingSpinner /></div></div>;
  }
  if (!course) {
    return <div className="min-h-screen bg-background"><Navbar /><div className="container pt-24 text-center">Course not found.</div></div>;
  }

  const totalSize = materials.reduce((s, m) => s + m.file_size, 0);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${course.code} Study Hub | OverraPrep AI`} description="AI-powered study materials." />
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/study-hub"><ArrowLeft className="w-4 h-4" /> All Courses</Link>
        </Button>

        {/* Premium course hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-amber-100/60 bg-gradient-to-br from-white via-amber-50/40 to-white shadow-[0_8px_40px_-16px_rgba(180,140,40,0.30)] p-6 md:p-8 mb-6"
        >
          <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-300/30 via-amber-400/10 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-gradient-to-tr from-amber-200/30 to-transparent blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shrink-0">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <Badge variant="outline" className="mb-2 border-amber-200 text-amber-800 bg-amber-50/60">{course.code}</Badge>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">{course.name}</h1>
                <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {materials.length} {materials.length === 1 ? "material" : "materials"}</span>
                  {totalSize > 0 && <span>· {(totalSize / 1024 / 1024).toFixed(1)} MB total</span>}
                  <span>· AI summaries, flashcards & coach ready</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setExportOpen(true)} disabled={materials.length === 0} className="border-amber-200 hover:bg-amber-50">
                <Download className="w-4 h-4" /> Export Study Pack
              </Button>
              <Button onClick={() => setUploadOpen(true)} className="bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
                <Plus className="w-4 h-4" /> Upload Material
              </Button>
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Materials */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-serif text-xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" /> Study Materials
            </h2>

            {materials.length === 0 ? (
              <Card className="border-amber-100 bg-gradient-to-br from-white to-amber-50/30">
                <CardContent className="py-16 text-center">
                  <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <p className="font-display text-lg mb-1">No materials yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Upload your first PDF, slide deck, or notes to start generating AI summaries, flashcards, and likely exam questions.
                  </p>
                  <Button onClick={() => setUploadOpen(true)} className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                    <Plus className="w-4 h-4" /> Upload Material
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {materials.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <Card
                      className="group h-full border-amber-100/60 bg-gradient-to-br from-white to-amber-50/20 hover:border-amber-300 hover:shadow-[0_12px_36px_-12px_rgba(180,140,40,0.30)] hover:-translate-y-0.5 transition-all cursor-pointer"
                      onClick={() => setOpenMaterial(m)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="font-serif text-base line-clamp-2 group-hover:text-amber-800 transition-colors">{m.title}</CardTitle>
                            {m.description && (
                              <CardDescription className="line-clamp-2 mt-1">{m.description}</CardDescription>
                            )}
                          </div>
                          <Badge variant={m.visibility === "public" ? "secondary" : "outline"} className="shrink-0 text-xs">
                            {m.visibility === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                            {m.visibility}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          {((m.file_size || 45000) / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs font-semibold border-amber-200 text-amber-900 hover:bg-amber-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              void downloadMaterialExternally({
                                id: m.id,
                                title: m.title,
                                courseCode: course.code,
                                fileUrl: m.file_url,
                                fileType: m.file_type,
                                description: m.description,
                              });
                            }}
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-amber-600" />
                            Download
                          </Button>
                          {m.owner_id === user?.id && (
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(m); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* AI Coach + Goals */}
          <div className="lg:col-span-1 space-y-6">
            <div className="lg:sticky lg:top-24 space-y-6">
              <StudyCoachPanel
                course={{ code: course.code, name: course.name }}
                materials={materials.map(m => {
                  const t = tutorOwners[m.owner_id];
                  return { id: m.id, title: m.title, description: m.description, file_type: m.file_type, tutor_id: t ? m.owner_id : null, tutor_name: t?.name ?? null, tutor_avatar_url: t?.avatar ?? null };
                })}
                mode="study_hub"
              />
              {courseId && <LearningGoalsPanel courseId={courseId} />}
              {courseId && <CourseChat courseId={courseId} courseCode={course.code} />}
            </div>
          </div>
        </div>
      </main>

      <UploadMaterialDialog open={uploadOpen} onOpenChange={setUploadOpen} courseId={courseId!} onUploaded={load} />
      <ExportStudyPackDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        courseCode={course.code}
        courseName={course.name}
        materials={materials.map((m) => ({ id: m.id, title: m.title, description: m.description }))}
      />
      {openMaterial && (
        <MaterialAIPanel material={openMaterial} open={!!openMaterial} onOpenChange={(v) => !v && setOpenMaterial(null)} />
      )}
    </div>
  );
};

export default StudyHubCourse;
