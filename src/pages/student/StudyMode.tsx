import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/seo/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, ArrowLeft, BookOpen, Brain, Trophy, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLatestReadinessAttempt } from "@/hooks/useReadiness";

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  topic?: string;
};
type Exam = { id: string; title: string; questions: Question[] };

export default function StudyMode() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("study");
  const [exam, setExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A"|"B"|"C"|"D">>({});
  const [generating, setGenerating] = useState(false);
  const [grading, setGrading] = useState(false);
  const [attempt, setAttempt] = useState<any | null>(null);

  const { data: course } = useQuery({
    queryKey: ["course-min", courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, code, name, department").eq("id", courseId!).maybeSingle();
      return data;
    },
  });

  const { data: latest } = useLatestReadinessAttempt(courseId);
  useEffect(() => { if (latest && !attempt) setAttempt(latest); }, [latest]);

  const generate = async () => {
    if (!courseId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("readiness-exam-generate", { body: { course_id: courseId, count: 10 } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      setExam(data as Exam);
      setAnswers({});
      setTab("readiness");
    } catch (e: any) {
      toast.error(e?.message || "Could not generate exam");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async () => {
    if (!exam) return;
    setGrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("readiness-exam-grade", { body: { exam_id: exam.id, answers } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAttempt(data);
      setExam(null);
      setAnswers({});
      setTab("results");
      qc.invalidateQueries({ queryKey: ["readiness-latest"] });
      qc.invalidateQueries({ queryKey: ["weakness-signals"] });
    } catch (e: any) {
      toast.error(e?.message || "Grading failed");
    } finally {
      setGrading(false);
    }
  };

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const total = exam?.questions.length || 0;

  return (
    <>
      <SEO title={`Study Mode · ${course?.code || ""}`} description="AI-powered study + readiness exam" noindex />
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 pt-5 pb-24 max-w-3xl">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-3 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-2">
            <Sparkles className="h-3 w-3" /> AI Study Mode
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
            {course?.code || "Course"} — {course?.name || "Study Mode"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Read, then test yourself. Get a calm, honest readiness score.
          </p>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="study"><BookOpen className="h-3.5 w-3.5 mr-1" />Study</TabsTrigger>
              <TabsTrigger value="readiness"><Brain className="h-3.5 w-3.5 mr-1" />Readiness</TabsTrigger>
              <TabsTrigger value="results"><Trophy className="h-3.5 w-3.5 mr-1" />Results</TabsTrigger>
            </TabsList>

            <TabsContent value="study" className="mt-4 space-y-3">
              <Card className="p-4">
                <h3 className="font-semibold text-sm mb-1">Course materials</h3>
                <p className="text-[12.5px] text-muted-foreground">Open the Course Hub for notes, past questions, and the full Study Pack experience.</p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <Link to={`/courses/${courseId}`}><Button size="sm" variant="outline">Open Course Hub</Button></Link>
                  <Link to={`/study-hub/${courseId}`}><Button size="sm" variant="outline">Study Hub</Button></Link>
                  <Link to={`/pq-intelligence/${courseId}`}><Button size="sm" variant="outline">PQ Intelligence</Button></Link>
                </div>
              </Card>
              <Card className="p-4 border-amber-200/70 bg-amber-50/30">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-amber-600" /> When you feel ready</h3>
                <p className="text-[12.5px] text-muted-foreground">Run a 10-question AI exam tailored to this course's materials.</p>
                <Button size="sm" className="mt-3 bg-amber-500 hover:bg-amber-600 text-white" onClick={generate} disabled={generating}>
                  {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating…</> : "Start readiness exam"}
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="readiness" className="mt-4">
              {!exam && (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No active exam. Generate a fresh one when you're ready.</p>
                  <Button onClick={generate} disabled={generating} className="bg-amber-500 hover:bg-amber-600 text-white">
                    {generating ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generating…</> : "Generate exam"}
                  </Button>
                </Card>
              )}
              {exam && (
                <div className="space-y-3">
                  <Card className="p-3 sticky top-2 z-10 bg-background/90 backdrop-blur border-amber-200/60 flex items-center justify-between">
                    <div className="text-[12.5px] text-muted-foreground">{answeredCount} / {total} answered</div>
                    <Button size="sm" onClick={submit} disabled={grading || answeredCount === 0} className="bg-amber-500 hover:bg-amber-600 text-white">
                      {grading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Grading…</> : "Submit"}
                    </Button>
                  </Card>
                  {exam.questions.map((q, i) => (
                    <Card key={q.id} className="p-4">
                      <div className="text-[11.5px] text-muted-foreground mb-1">Question {i + 1}{q.topic ? ` · ${q.topic}` : ""}</div>
                      <p className="text-[14px] font-medium text-foreground mb-3 leading-snug">{q.question_text}</p>
                      <div className="grid gap-2">
                        {(["A","B","C","D"] as const).map((opt) => {
                          const text = (q as any)[`option_${opt.toLowerCase()}`];
                          const picked = answers[q.id] === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt }))}
                              className={`text-left p-2.5 rounded-lg border text-[13px] transition ${picked ? "border-amber-400 bg-amber-50 text-amber-900" : "border-border hover:border-amber-200 hover:bg-amber-50/40"}`}
                            >
                              <span className="font-bold mr-2">{opt}.</span>{text}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-4 space-y-3">
              {!attempt && (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Take a readiness exam to see your strengths and weak topics.
                </Card>
              )}
              {attempt && <ResultsView attempt={attempt} onRetake={generate} retaking={generating} />}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}

function ResultsView({ attempt, onRetake, retaking }: { attempt: any; onRetake: () => void; retaking: boolean }) {
  const pct = attempt.readiness_pct ?? 0;
  const verdict =
    pct >= 80 ? { label: "Exam ready", tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" } :
    pct >= 60 ? { label: "Almost there", tone: "text-amber-700", bg: "bg-amber-50 border-amber-200" } :
    { label: "Keep building", tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" };

  return (
    <>
      <Card className={`p-5 border ${verdict.bg}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Readiness</div>
            <div className={`font-display text-4xl font-extrabold ${verdict.tone}`}>{pct}%</div>
            <div className={`text-[13px] font-semibold ${verdict.tone}`}>{verdict.label}</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted-foreground">{attempt.correct} / {attempt.total} correct</div>
            <Button size="sm" variant="outline" onClick={onRetake} disabled={retaking} className="mt-2">
              {retaking ? "Generating…" : "Retake"}
            </Button>
          </div>
        </div>
        <div className="mt-3"><Progress value={pct} className="h-1.5" /></div>
      </Card>

      {Array.isArray(attempt.weaknesses) && attempt.weaknesses.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-amber-600" />Focus next</h3>
          <ul className="space-y-1.5">
            {attempt.weaknesses.map((w: any) => (
              <li key={w.topic} className="text-[13px] flex items-center justify-between border-b border-border/40 last:border-b-0 py-1">
                <span className="text-foreground">{w.topic}</span>
                <span className="text-muted-foreground text-[12px]">{w.missed}/{w.seen} missed</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {Array.isArray(attempt.strengths) && attempt.strengths.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />You've got these</h3>
          <div className="flex flex-wrap gap-1.5">
            {attempt.strengths.map((s: any) => (
              <span key={s.topic} className="text-[12px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">{s.topic}</span>
            ))}
          </div>
        </Card>
      )}

      {Array.isArray(attempt.recommendations) && attempt.recommendations.length > 0 && (
        <Card className="p-4 border-amber-100">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-amber-600" />AI study plan</h3>
          <ul className="space-y-1.5 text-[13px]">
            {attempt.recommendations.map((r: any, i: number) => (
              <li key={i} className="text-foreground leading-snug">
                <span className="font-semibold">{r.topic ? `${r.topic}: ` : ""}</span>
                <span className="text-muted-foreground">{r.action}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}