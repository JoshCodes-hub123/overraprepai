import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardNav from "@/components/layout/DashboardNav";
import { DashboardBreadcrumb } from "@/components/layout/DashboardBreadcrumb";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Flame, Repeat2, Target, TrendingUp, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QRow {
  id: string;
  question_text: string;
  year: number | null;
  is_past_question: boolean;
  course_id: string;
  topic_id: string;
}

interface AttemptRow {
  score: number;
  total_questions: number;
  correct_answers: number;
  quiz_id: string;
}

const JambIntelligence = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [questions, setQuestions] = useState<QRow[]>([]);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [topicMap, setTopicMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const subjects: string[] = (profile?.academic_metadata?.subjects as string[] | undefined) ?? [];
  const targetCourse: string | undefined = profile?.academic_metadata?.target_course as string | undefined;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && profile && profile.academic_path !== "jamb") {
      navigate("/student/dashboard");
    }
  }, [user, profile, authLoading, navigate]);

  useEffect(() => {
    if (!user || profile?.academic_path !== "jamb") return;
    (async () => {
      try {
        // Fetch all past questions (year tagged or marked as past)
        const { data: qData } = await supabase
          .from("questions")
          .select("id, question_text, year, is_past_question, course_id, topic_id")
          .or("is_past_question.eq.true,year.not.is.null")
          .eq("is_approved", true)
          .limit(2000);

        const qs = (qData ?? []) as QRow[];
        setQuestions(qs);

        const topicIds = Array.from(new Set(qs.map((q) => q.topic_id).filter(Boolean)));
        if (topicIds.length) {
          const { data: tData } = await supabase
            .from("topics")
            .select("id, name")
            .in("id", topicIds);
          const map: Record<string, string> = {};
          (tData ?? []).forEach((t: any) => (map[t.id] = t.name));
          setTopicMap(map);
        }

        const { data: aData } = await supabase
          .from("quiz_attempts")
          .select("score, total_questions, correct_answers, quiz_id")
          .eq("user_id", user.id)
          .not("completed_at", "is", null)
          .order("started_at", { ascending: false })
          .limit(50);
        setAttempts((aData ?? []) as AttemptRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile]);

  // Repeated questions: cluster by normalized text prefix
  const repeated = useMemo(() => {
    const groups = new Map<string, QRow[]>();
    questions.forEach((q) => {
      const key = q.question_text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    });
    return Array.from(groups.values())
      .filter((g) => {
        const years = new Set(g.map((q) => q.year).filter(Boolean));
        return years.size >= 2;
      })
      .sort((a, b) => b.length - a.length)
      .slice(0, 20);
  }, [questions]);

  // Topic frequency heatmap
  const topicHeat = useMemo(() => {
    const counts = new Map<string, { count: number; years: Set<number> }>();
    questions.forEach((q) => {
      const name = topicMap[q.topic_id] ?? "Uncategorized";
      const entry = counts.get(name) ?? { count: 0, years: new Set<number>() };
      entry.count += 1;
      if (q.year) entry.years.add(q.year);
      counts.set(name, entry);
    });
    const max = Math.max(1, ...Array.from(counts.values()).map((c) => c.count));
    return Array.from(counts.entries())
      .map(([topic, c]) => ({
        topic,
        count: c.count,
        years: Array.from(c.years).sort(),
        intensity: Math.round((c.count / max) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);
  }, [questions, topicMap]);

  // Score predictor: average accuracy * 100 per subject (UTME max ~100/subject)
  const predictor = useMemo(() => {
    if (!attempts.length) return { perSubject: 0, total: 0, sample: 0 };
    const totalQ = attempts.reduce((s, a) => s + a.total_questions, 0);
    const totalC = attempts.reduce((s, a) => s + a.correct_answers, 0);
    const accuracy = totalQ ? totalC / totalQ : 0;
    const perSubject = Math.round(accuracy * 100);
    const total = perSubject * 4; // 4-subject UTME
    return { perSubject, total, sample: attempts.length };
  }, [attempts]);

  const targetCutoff = 250; // generic competitive cutoff for predictor display

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="JAMB Intelligence — OverraPrep AI" description="Repeated past questions, high-probability topics and UTME score predictor for JAMB candidates." />
      <DashboardNav role="student" />
      <DashboardBreadcrumb role="student" />

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Flame className="w-7 h-7 text-primary" /> JAMB Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Spot repeated questions, hot topics, and project your UTME score.
            </p>
          </div>
          {targetCourse && (
            <Badge variant="secondary" className="text-sm">
              <Target className="w-3.5 h-3.5 mr-1" /> Target: {targetCourse}
            </Badge>
          )}
        </div>

        {/* Score predictor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Score Predictor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {predictor.sample === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a few quizzes — your projected UTME score will appear here.
              </p>
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Per subject</p>
                    <p className="text-3xl font-bold text-foreground">{predictor.perSubject}<span className="text-base text-muted-foreground">/100</span></p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected UTME</p>
                    <p className="text-3xl font-bold text-primary">{predictor.total}<span className="text-base text-muted-foreground">/400</span></p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/40">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference cutoff</p>
                    <p className="text-3xl font-bold text-foreground">{targetCutoff}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progress to {targetCutoff}</span>
                    <span>{Math.min(100, Math.round((predictor.total / targetCutoff) * 100))}%</span>
                  </div>
                  <Progress value={Math.min(100, (predictor.total / targetCutoff) * 100)} />
                  <p className="text-xs text-muted-foreground">
                    Based on {predictor.sample} recent attempt{predictor.sample === 1 ? "" : "s"}.
                    {predictor.total >= targetCutoff
                      ? " You're on track — keep the momentum."
                      : ` Add ~${Math.max(0, targetCutoff - predictor.total)} marks to reach a competitive score.`}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="repeated">
          <TabsList>
            <TabsTrigger value="repeated"><Repeat2 className="w-4 h-4 mr-1" /> Repeated</TabsTrigger>
            <TabsTrigger value="hot"><Flame className="w-4 h-4 mr-1" /> Hot Topics</TabsTrigger>
            <TabsTrigger value="subjects"><Trophy className="w-4 h-4 mr-1" /> My Subjects</TabsTrigger>
          </TabsList>

          <TabsContent value="repeated" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Questions appearing in multiple years</CardTitle>
              </CardHeader>
              <CardContent>
                {repeated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No repeated questions detected yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {repeated.map((group, i) => {
                      const years = Array.from(new Set(group.map((g) => g.year).filter(Boolean))).sort();
                      return (
                        <li key={i} className="p-3 rounded-lg border border-border bg-card">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <Badge>{group.length}× appearances</Badge>
                            {years.map((y) => (
                              <Badge key={y} variant="outline">{y}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-foreground">{group[0].question_text}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hot" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High-probability topics</CardTitle>
              </CardHeader>
              <CardContent>
                {topicHeat.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topic data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {topicHeat.map((t) => (
                      <div key={t.topic} className="flex items-center gap-3">
                        <div className="w-40 text-sm text-foreground truncate">{t.topic}</div>
                        <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${t.intensity}%` }}
                          />
                        </div>
                        <div className="w-12 text-right text-xs text-muted-foreground">{t.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">UTME Subject Combination</CardTitle>
              </CardHeader>
              <CardContent>
                {subjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>You haven't picked your UTME subjects yet.</p>
                    <Button size="sm" onClick={() => navigate("/profile/preparation")}>Set subjects</Button>
                  </div>
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {subjects.map((s) => (
                      <li key={s} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{s}</span>
                        <Badge variant="secondary">~{predictor.perSubject || 0}/100</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default JambIntelligence;
