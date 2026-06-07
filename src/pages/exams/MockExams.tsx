import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, FileText, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePublishedExams, useMyAttempts } from "@/hooks/useMockExams";
import { SEO } from "@/components/seo/SEO";
import { EmptyState } from "@/components/ui/empty-state";
import { format } from "date-fns";

export default function MockExams() {
  const nav = useNavigate();
  const { data: exams = [], isLoading } = usePublishedExams();
  const { data: attempts = [] } = useMyAttempts();

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="Mock Exams" description="Full-length CBT mock exams" />
      <header className="flex items-center gap-2 px-3 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={() => nav(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-base font-semibold flex-1">Mock Exams</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        <section>
          <h2 className="text-sm font-semibold mb-2">Available exams</h2>
          {isLoading ? <Loader2 className="w-6 h-6 mx-auto mt-8 animate-spin" />
            : exams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No mock exams published yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exams.map(e => (
                  <button
                    key={e.id}
                    onClick={() => nav(`/exams/${e.id}/take`)}
                    className="w-full text-left rounded-xl border bg-card p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm">{e.title}</h3>
                        {e.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.duration_min}m</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {e.total_questions} Qs</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </section>

        {attempts.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-2">Your past attempts</h2>
            <div className="space-y-2">
              {attempts.map((a: any) => (
                <div key={a.id} className="rounded-xl border bg-card p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.exam?.title ?? "Exam"}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, p")}</p>
                  </div>
                  <Badge variant={a.score / a.total >= 0.7 ? "default" : "secondary"} className="ml-2">
                    <Trophy className="w-3 h-3 mr-1" /> {a.score}/{a.total}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
