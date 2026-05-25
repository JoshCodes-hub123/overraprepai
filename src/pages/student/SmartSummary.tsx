import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Wand2,
  Loader2,
  FileDown,
  ShieldCheck,
  Lock,
  Sparkles,
  ListChecks,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { extractTextFromFile } from "@/lib/extractText";
import { exportSummaryPdf } from "@/lib/exportSummaryPdf";
import { isVerifiedStudent } from "@/lib/profileCompleteness";
import logoUrl from "@/assets/logo.png";

type Style = "bullets" | "structured" | "qa";

const STYLE_OPTIONS: Array<{
  value: Style;
  label: string;
  hint: string;
  icon: typeof ListChecks;
}> = [
  { value: "bullets", label: "Crash-course bullets", hint: "Night-before-exam cheat sheet", icon: ListChecks },
  { value: "structured", label: "Structured notes", hint: "Rewritten lecture-style notes", icon: BookOpen },
  { value: "qa", label: "Q&A flashcards", hint: "Likely questions + concise answers", icon: HelpCircle },
];

const STYLE_LABEL: Record<Style, string> = {
  bullets: "Crash-course bullets",
  structured: "Structured study notes",
  qa: "Q&A flashcards",
};

async function loadLogoDataUrl(): Promise<string | undefined> {
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export default function SmartSummary() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, matric_no, university, onboarding_completed")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const verified = isVerifiedStudent(profile);
  const studentName = profile?.full_name?.trim() || user?.email?.split("@")[0] || "Student";

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<Style>("bullets");
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [markdown, setMarkdown] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const canGenerate = !generating && !extracting && charCount >= 200;

  useEffect(() => {
    // Reset summary if user changes source materially
    setMarkdown("");
  }, [style]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }
    setExtracting(true);
    setExtractProgress(15);
    try {
      const extracted = await extractTextFromFile(file, { maxPages: 80 });
      setExtractProgress(85);
      if (!extracted || extracted.length < 200) {
        toast.error("Couldn't get enough readable text from that file");
        return;
      }
      setText((prev) => (prev ? prev + "\n\n" + extracted : extracted));
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 80));
      toast.success(`Extracted ${extracted.length.toLocaleString()} characters`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to read file");
    } finally {
      setExtracting(false);
      setExtractProgress(0);
    }
  };

  const generate = async () => {
    if (text.trim().length < 200) {
      toast.error("Upload or paste at least a few paragraphs (200+ chars)");
      return;
    }
    setGenerating(true);
    setMarkdown("");
    try {
      const { data, error } = await supabase.functions.invoke("summarize-material", {
        body: { content: text, style, title: title || "Untitled material" },
      });
      if (error) throw error;
      if ((data as any)?.error === "rate_limited") {
        toast.error("AI is busy — try again in a moment");
        return;
      }
      if ((data as any)?.error === "credits_exhausted") {
        toast.error("AI credits exhausted. Please top up to keep summarising.");
        return;
      }
      const md = (data as any)?.markdown as string;
      if (!md) {
        toast.error("AI couldn't generate a summary — try shorter or different material");
        return;
      }
      setMarkdown(md);
      toast.success("Summary ready");
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate summary");
    } finally {
      setGenerating(false);
    }
  };

  const download = async () => {
    if (!verified) {
      toast.info("Verify your student profile to download the branded PDF");
      navigate("/profile/edit");
      return;
    }
    if (!markdown) return;
    setDownloading(true);
    try {
      const logoDataUrl = await loadLogoDataUrl();
      await exportSummaryPdf({
        title: title || "OverraPrep AI Study Summary",
        subtitle: `Study summary · ${new Date().toLocaleDateString()}`,
        bodyMarkdown: markdown,
        filename: `overraprep_${(title || "summary").toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`,
        logoDataUrl,
        studentName,
        verified: true,
        matricNo: profile?.matric_no || undefined,
        style: STYLE_LABEL[style],
      });
      toast.success("Branded PDF saved 🎉");
    } catch (e: any) {
      toast.error(e?.message || "Could not generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Smart Summary — OverraPrep AI"
        description="Turn your course material into a branded study summary PDF in seconds."
      />

      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold leading-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Smart Summary
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Cram-mode study notes from your own material
            </p>
          </div>
          <div className="ml-auto">
            {verified ? (
              <Badge className="bg-emerald-500 text-white gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Lock className="w-3 h-3" /> Unverified
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Step 1: source */}
        <Card className="p-4 space-y-3">
          <div>
            <Label className="text-xs">Material title</Label>
            <Input
              placeholder="e.g. PHY 101 — Mechanics, Lecture 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              disabled={extracting || generating}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={extracting || generating}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" /> Upload PDF / Word / TXT
            </Button>
          </div>
          {extracting && (
            <div className="space-y-1">
              <Progress value={extractProgress} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">Reading file…</p>
            </div>
          )}
          <div>
            <Label className="text-xs">…or paste your notes</Label>
            <Textarea
              rows={6}
              placeholder="Paste lecture notes, slide content, textbook chapter…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={extracting || generating}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {charCount.toLocaleString()} characters {charCount < 200 && "(need at least 200)"}
            </p>
          </div>
        </Card>

        {/* Step 2: style picker */}
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Choose summary style</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {STYLE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = style === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStyle(opt.value)}
                  className={cn(
                    "text-left rounded-xl border p-3 transition",
                    active
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-sm"
                      : "hover:border-amber-200",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("w-4 h-4", active ? "text-amber-600" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{opt.hint}</p>
                </button>
              );
            })}
          </div>
          <Button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-1.5" />
            )}
            {generating ? "Summarising…" : "Generate summary"}
          </Button>
        </Card>

        {/* Step 3: reader */}
        {markdown && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" /> Your summary
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Free preview — anyone can read. Branded PDF is for verified students.
                  </p>
                </div>
                <Button
                  onClick={download}
                  disabled={downloading}
                  className={cn(
                    "gap-1.5",
                    verified
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted",
                  )}
                  title={verified ? "Download branded PDF" : "Verify your profile to download"}
                >
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : verified ? (
                    <FileDown className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {verified ? "Download branded PDF" : "Verify to download"}
                </Button>
              </div>

              {!verified && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs flex items-start gap-2">
                  <Lock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium">Unlock the branded PDF</p>
                    <p className="text-muted-foreground">
                      Complete your profile (matric number + university) to download the
                      OverraPrep AI branded PDF with your name on it.
                    </p>
                    <Button
                      size="sm"
                      variant="link"
                      className="px-0 h-auto text-amber-700"
                      onClick={() => navigate("/profile/edit")}
                    >
                      Complete profile →
                    </Button>
                  </div>
                </div>
              )}

              <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
              </article>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}