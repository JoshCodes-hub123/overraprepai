import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Layers, ListChecks, Sparkles, Loader2, RefreshCw, Headphones, MessageSquare, Download } from "lucide-react";
import { OverraAudioSuite } from "./OverraAudioSuite";
import { ChatWithNotesPanel } from "./ChatWithNotesPanel";
import { SaveToLibraryButton } from "@/components/student/SaveToLibraryButton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeAIText } from "@/lib/sanitizeAI";
import { downloadMaterialExternally } from "@/lib/downloadMaterial";

type Kind = "summary" | "key_points" | "flashcards" | "likely_questions";
type Tab = Kind | "audio" | "chat";

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url?: string | null;
  file_type?: string | null;
}

interface Props {
  material: Material;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface KeyPoint { point: string; importance: "high" | "medium" | "low" }
interface Flashcard { question: string; answer: string; topic?: string }
interface LikelyQuestion { question: string; type: "objective" | "theory"; probability: "high" | "medium" | "low"; reasoning: string }

export const MaterialAIPanel = ({ material, open, onOpenChange }: Props) => {
  const [tab, setTab] = useState<Tab>("summary");
  const [loadingKind, setLoadingKind] = useState<Kind | null>(null);
  const [data, setData] = useState<Record<Kind, unknown>>({
    summary: null,
    key_points: null,
    flashcards: null,
    likely_questions: null,
  });
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  const fetchKind = async (kind: Kind, force = false) => {
    setLoadingKind(kind);
    try {
      const { data: res, error } = await supabase.functions.invoke("process-study-material", {
        body: { material_id: material.id, kind, force },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      setData((d) => ({ ...d, [kind]: res?.content }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate";
      toast.error(msg);
    } finally {
      setLoadingKind(null);
    }
  };

  useEffect(() => {
    if (open && tab !== "audio" && tab !== "chat" && !data[tab as Kind] && loadingKind !== tab) {
      fetchKind(tab as Kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  useEffect(() => {
    if (!open) {
      setData({ summary: null, key_points: null, flashcards: null, likely_questions: null });
      setTab("summary");
      setFlashIndex(0);
      setFlashFlipped(false);
    }
  }, [open]);

  const renderSummary = () => {
    const c = data.summary as { text?: string } | null;
    if (loadingKind === "summary") return <CenterLoader label="Reading and summarizing..." />;
    if (!c?.text) return <Empty />;
    const clean = sanitizeAIText(c.text);
    return (
      <div className="space-y-3">
        <div className="ai-prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{clean}</ReactMarkdown>
        </div>
        <div className="flex justify-end">
          <SaveToLibraryButton
            kind="study_pack"
            defaultTitle={`${material.title} — Summary`}
            defaultFolder="Study Packs"
            textContent={clean}
            meta={{ material_id: material.id, source: "summary" }}
          />
        </div>
      </div>
    );
  };

  const renderPoints = () => {
    const c = data.key_points as KeyPoint[] | null;
    if (loadingKind === "key_points") return <CenterLoader label="Extracting key points..." />;
    if (!c?.length) return <Empty />;
    return (
      <ul className="space-y-2">
        {c.map((p, i) => (
          <li key={i} className="flex gap-2 items-start p-3 rounded-lg bg-muted/30 border border-border/50">
            <Badge
              variant={p.importance === "high" ? "default" : p.importance === "medium" ? "secondary" : "outline"}
              className="shrink-0 capitalize"
            >
              {p.importance}
            </Badge>
            <span className="text-sm leading-relaxed">{p.point}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderFlashcards = () => {
    const c = data.flashcards as Flashcard[] | null;
    if (loadingKind === "flashcards") return <CenterLoader label="Building flashcards..." />;
    if (!c?.length) return <Empty />;
    const card = c[flashIndex];
    return (
      <div className="space-y-3">
        <div
          className="min-h-[200px] rounded-xl border-2 border-primary/30 bg-gradient-to-br from-card to-muted/30 p-6 cursor-pointer flex flex-col justify-center text-center hover:border-primary/60 transition-all"
          onClick={() => setFlashFlipped((f) => !f)}
        >
          <div className="text-xs uppercase tracking-wider text-primary mb-2">
            {flashFlipped ? "Answer" : "Question"}
          </div>
          <p className="text-base font-medium leading-relaxed">{flashFlipped ? card.answer : card.question}</p>
          {card.topic && <p className="text-xs text-muted-foreground mt-3">{card.topic}</p>}
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={flashIndex === 0} onClick={() => { setFlashIndex(i => i - 1); setFlashFlipped(false); }}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {flashIndex + 1} / {c.length}
          </span>
          <Button variant="outline" size="sm" disabled={flashIndex >= c.length - 1} onClick={() => { setFlashIndex(i => i + 1); setFlashFlipped(false); }}>
            Next
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">Tap card to flip</p>
      </div>
    );
  };

  const renderLikely = () => {
    const c = data.likely_questions as LikelyQuestion[] | null;
    if (loadingKind === "likely_questions") return <CenterLoader label="Predicting likely questions..." />;
    if (!c?.length) return <Empty />;
    return (
      <ul className="space-y-3">
        {c.map((q, i) => (
          <li key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <Badge variant={q.probability === "high" ? "default" : q.probability === "medium" ? "secondary" : "outline"} className="capitalize">
                {q.probability} probability
              </Badge>
              <Badge variant="outline" className="capitalize">{q.type}</Badge>
            </div>
            <p className="text-sm font-medium leading-relaxed">{q.question}</p>
            {q.reasoning && <p className="text-xs text-muted-foreground mt-1.5 italic">{q.reasoning}</p>}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 pr-6">
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <span className="line-clamp-1">{material.title}</span>
          </DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold shrink-0"
            onClick={() =>
              void downloadMaterialExternally({
                id: material.id,
                title: material.title,
                fileUrl: material.file_url,
                fileType: material.file_type,
                description: material.description,
              })
            }
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Download Document
          </Button>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="summary"><FileText className="w-4 h-4 mr-1" /> Summary</TabsTrigger>
              <TabsTrigger value="key_points"><ListChecks className="w-4 h-4 mr-1" /> Key Points</TabsTrigger>
              <TabsTrigger value="flashcards"><Layers className="w-4 h-4 mr-1" /> Flashcards</TabsTrigger>
              <TabsTrigger value="likely_questions"><Sparkles className="w-4 h-4 mr-1" /> Likely Q</TabsTrigger>
              <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-1" /> Chat</TabsTrigger>
              <TabsTrigger value="audio"><Headphones className="w-4 h-4 mr-1" /> Audio</TabsTrigger>
            </TabsList>
            {tab !== "audio" && tab !== "chat" && data[tab as Kind] && (
              <Button variant="ghost" size="sm" onClick={() => fetchKind(tab as Kind, true)} disabled={!!loadingKind}>
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </Button>
            )}
          </div>

          <TabsContent value="summary" className="mt-4">{renderSummary()}</TabsContent>
          <TabsContent value="key_points" className="mt-4">{renderPoints()}</TabsContent>
          <TabsContent value="flashcards" className="mt-4">{renderFlashcards()}</TabsContent>
          <TabsContent value="likely_questions" className="mt-4">{renderLikely()}</TabsContent>
          <TabsContent value="chat" className="mt-4">
            <ChatWithNotesPanel
              materialId={material.id}
              materialTitle={material.title}
              materialText={(data.summary as { text?: string } | null)?.text}
            />
          </TabsContent>
          <TabsContent value="audio" className="mt-4">
            <OverraAudioSuite
              text={(data.summary as { text?: string } | null)?.text}
              fileName={`${material.title.replace(/[^\w\-]+/g, "_")}.mp3`}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const CenterLoader = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
    <span className="text-sm">{label}</span>
  </div>
);

const Empty = () => <p className="text-sm text-muted-foreground text-center py-8">No content yet.</p>;
