import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Target, Calendar, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PremiumPageHero } from '@/components/shell/PremiumPageHero';

interface Attempt { score: number | null; total_questions: number | null; quiz_id: string }
interface Quiz { id: string; title: string }

export default function CopilotPage() {
  const [loading, setLoading] = useState(true);
  const [weakTopics, setWeakTopics] = useState<{ topic: string; accuracy: number; n: number }[]>([]);
  const [examDate, setExamDate] = useState<string>(typeof window !== 'undefined' ? localStorage.getItem('exam_date') ?? '' : '');
  const [recentScore, setRecentScore] = useState<number | null>(null);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: attempts } = await supabase
      .from('quiz_attempts').select('score, total_questions, quiz_id, completed_at')
      .eq('user_id', user.id).order('completed_at', { ascending: false }).limit(60);
    const list: Attempt[] = (attempts as any[] | null) ?? [];
    const pct = (a: Attempt) => a.total_questions && a.total_questions > 0 ? Math.round(((a.score ?? 0) / a.total_questions) * 100) : 0;
    if (list.length) {
      const last5 = list.slice(0, 5);
      setRecentScore(Math.round(last5.reduce((s, a) => s + pct(a), 0) / last5.length));
    }

    const map = new Map<string, { sum: number; n: number; title: string }>();
    if (list.length) {
      const quizIds = [...new Set(list.map(a => a.quiz_id))];
      const { data: quizzes } = await supabase.from('quizzes').select('id, title').in('id', quizIds);
      const titleMap = new Map(((quizzes as Quiz[] | null) ?? []).map(q => [q.id, q.title]));
      for (const a of list) {
        const t = titleMap.get(a.quiz_id) ?? 'Unknown';
        const cur = map.get(t) ?? { sum: 0, n: 0, title: t };
        cur.sum += pct(a); cur.n += 1; map.set(t, cur);
      }
    }
    const weak = [...map.values()]
      .map(v => ({ topic: v.title, accuracy: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
    setWeakTopics(weak);
    setLoading(false);
  })(); }, []);

  const daysToExam = examDate ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000)) : null;

  return (
    <div className="container max-w-3xl py-6 px-4 space-y-4">
      <PremiumPageHero
        eyebrow="AI COPILOT"
        title="Your exam-day copilot"
        subtitle="Plan your countdown, see your weak topics, and get personalised next steps."
        icon={Sparkles}
        back="/student/dashboard"
      />


      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Exam day</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <input type="date" value={examDate} onChange={(e) => { setExamDate(e.target.value); localStorage.setItem('exam_date', e.target.value); }}
            className="border rounded-md px-3 py-2 text-sm w-full" />
          {daysToExam !== null && (
            <p className="text-sm text-muted-foreground">
              {daysToExam === 0 ? 'Exam is today — breathe and trust your prep.' : `${daysToExam} day${daysToExam === 1 ? '' : 's'} until exam.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Weakest topics</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : weakTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">Take a few quizzes to unlock topic insights.</p>
          ) : (
            <ul className="space-y-2">
              {weakTopics.map(t => (
                <li key={t.topic} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{t.topic}</p>
                    <p className="text-xs text-muted-foreground">{t.n} attempt{t.n === 1 ? '' : 's'}</p>
                  </div>
                  <span className={`text-sm font-semibold ${t.accuracy < 50 ? 'text-destructive' : t.accuracy < 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {t.accuracy}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {recentScore !== null && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Recent average</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{recentScore}%</p>
            <p className="text-xs text-muted-foreground">Last 5 quizzes</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Button asChild className="w-full"><Link to="/coach">Open Socratic Study Chat →</Link></Button>
        <Button asChild variant="outline" className="w-full"><Link to="/review">Run an SRS review session</Link></Button>
      </div>
    </div>
  );
}
