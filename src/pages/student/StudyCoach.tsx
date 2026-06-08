import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTodayCoachPlan, useGenerateCoachPlan, useTopicMastery } from '@/hooks/useStudyCoach';
import { Sparkles, Brain, Clock } from 'lucide-react';
import { PremiumPageHero } from '@/components/shell/PremiumPageHero';

export default function StudyCoach() {
  const { data: planRow, isLoading } = useTodayCoachPlan();
  const generate = useGenerateCoachPlan();
  const mastery = useTopicMastery();
  const plan = planRow?.plan_json as any;

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4">
      <PremiumPageHero
        eyebrow="STUDY COACH"
        title="Your AI study coach"
        subtitle="A personalised plan for today, built around your weak topics and time."
        icon={Brain}
        back
        right={
          <Button onClick={() => generate.mutate()} disabled={generate.isPending} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
            <Sparkles className="w-4 h-4 mr-1"/>
            {generate.isPending ? 'Thinking…' : plan ? 'Refresh Plan' : 'Generate Plan'}
          </Button>
        }
      />

      {isLoading ? <p>Loading…</p> : !plan ? (
        <Card><CardContent className="p-6 text-center text-muted-foreground">No plan yet. Click "Generate Plan" to get today's focus.</CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{plan.headline}</CardTitle>
            {plan.focus_topic && <Badge variant="secondary" className="w-fit">Focus: {plan.focus_topic}</Badge>}
          </CardHeader>
          <CardContent className="space-y-3">
            {(plan.tasks ?? []).map((t: any, i: number) => (
              <div key={i} className="flex items-start justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                </div>
                <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3"/>{t.minutes}m</Badge>
              </div>
            ))}
            {plan.tip && <div className="p-3 bg-primary/10 rounded-lg text-sm"><strong>Tip:</strong> {plan.tip}</div>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Topic Mastery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(mastery.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Take quizzes to build your mastery profile.</p>}
          {(mastery.data ?? []).slice(0, 8).map((m: any) => (
            <div key={m.id}>
              <div className="flex justify-between text-sm mb-1"><span>{m.topic}</span><span className="text-muted-foreground">{Math.round(m.mastery_score)}%</span></div>
              <Progress value={m.mastery_score} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
