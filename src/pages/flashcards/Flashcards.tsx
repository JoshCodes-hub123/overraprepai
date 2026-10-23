import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, Sparkles, Loader2, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/seo/SEO";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SpeakButton } from "@/components/audio/SpeakButton";

interface Flashcard {
  id: string;
  subject: string | null;
  topic: string | null;
  front: string;
  back: string;
}

export default function Flashcards() {
  const { user, profile, primaryRole, isLoading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const subjectFilter = params.get("subject") || "";

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ front: "", back: "", subject: subjectFilter, topic: "" });

  const loadCards = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("flashcards")
      .select("id, subject, topic, front, back")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (subjectFilter) q = q.eq("subject", subjectFilter);
    const { data } = await q;
    setCards((data || []) as Flashcard[]);
    setIndex(0);
    setFlipped(false);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, subjectFilter]);

  const current = cards[index];

  const handleCreate = async () => {
    if (!user) return;
    if (!form.front.trim() || !form.back.trim()) {
      toast({ title: "Missing content", description: "Both front and back are required.", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("flashcards").insert({
      user_id: user.id,
      front: form.front.trim(),
      back: form.back.trim(),
      subject: form.subject.trim() || null,
      topic: form.topic.trim() || null,
      academic_path: profile?.academic_path ?? null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    setShowCreate(false);
    setForm({ front: "", back: "", subject: subjectFilter, topic: "" });
    await loadCards();
  };

  const handleAIGenerate = async () => {
    if (!form.subject.trim() && !form.topic.trim()) {
      toast({ title: "Add a subject or topic first", description: "AI needs context to generate cards." });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-explanation", {
        body: {
          question: `Generate ONE concise flashcard (front=question/term, back=answer/definition) for: ${form.topic || form.subject}. Reply in this exact format:\nFRONT: <question>\nBACK: <answer>`,
          options: { A: "n/a", B: "n/a", C: "n/a", D: "n/a" },
          correctOption: "A",
          tone: "default",
        },
      });
      if (error) throw error;
      const text: string = data.explanation || "";
      const fm = text.match(/FRONT:\s*(.+?)(?:\n|$)/i);
      const bm = text.match(/BACK:\s*([\s\S]+)/i);
      if (fm && bm) {
        setForm((f) => ({ ...f, front: fm[1].trim(), back: bm[1].trim() }));
      } else {
        setForm((f) => ({ ...f, back: text.trim() }));
      }
    } catch (e: any) {
      toast({ title: "AI failed", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    await supabase.from("flashcards").delete().eq("id", current.id);
    await loadCards();
  };

  if (authLoading) return <LoadingSpinner />;

  return (
    <>
      <SEO title="Flashcards | OverraPrep AI" description="Quick-revision flashcards with AI generation and read-aloud." />
      <main className="min-h-screen bg-background">
        <DashboardNav role={(primaryRole as any) || "student"} />
        <div className="container mx-auto px-4 py-6">
          <DashboardBreadcrumb role="student" />

          <div className="mt-4 mb-6 flex items-end justify-between gap-3 flex-wrap">
            <div>
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <h1 className="font-display text-3xl font-bold">
                Flashcards{subjectFilter && <span className="text-muted-foreground"> · {subjectFilter}</span>}
              </h1>
              <p className="text-sm text-muted-foreground">
                Tap the card to flip · {cards.length} card{cards.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New card
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : cards.length === 0 ? (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <p className="text-muted-foreground mb-4">No flashcards yet. Create your first one!</p>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create flashcard
              </Button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* Card stack */}
              <div className="relative h-[320px] [perspective:1200px]">
                <AnimatePresence mode="wait">
                  <motion.button
                    type="button"
                    key={current.id + (flipped ? "-b" : "-f")}
                    initial={{ opacity: 0, y: 20, rotateY: flipped ? -90 : 90 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setFlipped((f) => !f)}
                    className="absolute inset-0 rounded-3xl border-2 border-primary/30 bg-gradient-to-br from-card to-card/60 p-8 flex flex-col items-center justify-center text-center shadow-2xl hover:shadow-primary/20 transition-shadow w-full"
                  >
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-4">
                      {flipped ? "Answer" : "Question"}
                    </p>
                    <p className="text-xl md:text-2xl font-display leading-relaxed">
                      {flipped ? current.back : current.front}
                    </p>
                    {current.topic && (
                      <p className="absolute bottom-4 right-4 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {current.topic}
                      </p>
                    )}
                  </motion.button>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between mt-6 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => { setIndex((i) => i - 1); setFlipped(false); }}
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  <SpeakButton text={flipped ? current.back : current.front} />
                  <Button variant="ghost" size="sm" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index >= cards.length - 1}
                  onClick={() => { setIndex((i) => i + 1); setFlipped(false); }}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-3">
                {index + 1} of {cards.length}
              </p>
            </div>
          )}
        </div>
      </main>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New flashcard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Physics" />
              </div>
              <div className="space-y-1.5">
                <Label>Topic (optional)</Label>
                <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Newton's Laws" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Front (question / term)</Label>
              <Textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Back (answer / definition)</Label>
              <Textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} rows={3} />
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleAIGenerate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1 text-accent" />}
                Generate with AI
              </Button>
              <Button type="button" onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                Save card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
