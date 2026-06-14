import AppScreen from "@/components/app-shell/AppScreen";
import { FolderOpen, Sparkles, FileText, Upload, Layers, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import { useUserResources } from "@/hooks/useUserResources";
import OutlineActionsMenu from "@/components/student/library/OutlineActionsMenu";
import { LoadingState } from "@/components/ui/loading-state";
import { format } from "date-fns";

const StudyPacks = () => {
  const navigate = useNavigate();
  const { data: resources = [], isLoading, isError, refetch } = useUserResources();
  // Anything we can extract text from for one-click AI
  const docs = resources.filter((r) =>
    r.kind === "pdf" || r.kind === "note" || r.kind === "study_pack" ||
    (r.meta as any)?.material_type === "outline",
  );

  return (
    <>
      <SEO title="My Study Packs" description="Your AI-generated study packs — summaries, quizzes, flashcards and audio." noindex />
      <AppScreen title="Study Packs" subtitle="One-click summaries, quizzes & flashcards from any document">
        <div className="max-w-3xl mx-auto py-2">
          {/* CTA strip */}
          <Card className="p-4 mb-5 bg-gradient-to-br from-amber-50 to-background border-amber-200/60 flex items-center gap-3 flex-wrap">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-200 to-amber-300 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-800" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <p className="font-semibold leading-tight">Turn any document into a study pack</p>
              <p className="text-xs text-muted-foreground mt-0.5">Quizzes, summaries and flashcards in seconds.</p>
            </div>
            <Button onClick={() => navigate("/library?upload=1")} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Upload className="w-4 h-4 mr-1.5" /> Upload
            </Button>
          </Card>

          {/* Quick action legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-sky-600" /> Summary</span>
            <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-orange-600" /> Flashcards</span>
            <span className="inline-flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5 text-violet-600" /> Practice quiz</span>
            <span className="ml-auto">Tap the gold <strong className="text-amber-700">AI</strong> button on any item.</span>
          </div>

          {isLoading || isError ? (
            <LoadingState variant="card" error={isError} onRetry={() => refetch()} />
          ) : docs.length === 0 ? (
            <div className="text-center py-10">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mb-5 shadow-[0_8px_24px_-12px_rgba(180,140,40,0.4)]">
                <FolderOpen className="h-9 w-9 text-amber-700" />
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight">No documents yet</h2>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
                Upload a PDF, paste notes, or save tutor materials to your library. We'll generate everything from there.
              </p>
              <div className="mt-5 flex justify-center gap-2.5 flex-wrap">
                <Button onClick={() => navigate("/library?upload=1")} className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Upload className="w-4 h-4 mr-1.5" /> Upload a document
                </Button>
                <Button variant="outline" onClick={() => navigate("/student/tutor-courses")}>Browse tutor courses</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {docs.map((r) => (
                <Card key={r.id} className="p-4 hover:shadow-md transition-shadow border-border/70">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <OutlineActionsMenu resource={r} />
                  </div>
                  <p className="font-semibold text-sm leading-snug line-clamp-2">{r.title}</p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] capitalize">{r.kind.replace("_", " ")}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.folder}</Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {format(new Date(r.created_at), "MMM d")}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppScreen>
    </>
  );
};

export default StudyPacks;
