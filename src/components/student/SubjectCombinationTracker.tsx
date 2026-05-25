import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * UTME subject combination tracker — only renders for JAMB students.
 * Shows readiness per subject (proxy: overall accuracy across attempts).
 */
export const SubjectCombinationTracker = () => {
  const { user, profile } = useAuth();
  const [accuracy, setAccuracy] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  const subjects = useMemo<string[]>(() => {
    const s = profile?.academic_metadata?.subjects;
    return Array.isArray(s) ? (s as string[]) : [];
  }, [profile]);

  const targetCourse = profile?.academic_metadata?.target_course as string | undefined;

  useEffect(() => {
    if (!user || profile?.academic_path !== "jamb") return;
    (async () => {
      const { data } = await supabase
        .from("quiz_attempts")
        .select("total_questions, correct_answers")
        .eq("user_id", user.id)
        .not("completed_at", "is", null)
        .limit(50);
      const totalQ = (data ?? []).reduce((s, a) => s + (a.total_questions || 0), 0);
      const totalC = (data ?? []).reduce((s, a) => s + (a.correct_answers || 0), 0);
      setAccuracy(totalQ ? Math.round((totalC / totalQ) * 100) : 0);
      setLoaded(true);
    })();
  }, [user, profile]);

  if (profile?.academic_path !== "jamb") return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" /> UTME Subject Combination
          </span>
          {targetCourse && (
            <Badge variant="secondary" className="text-xs">
              <Target className="w-3 h-3 mr-1" /> {targetCourse}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {subjects.length === 0 ? (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>You haven't picked your 4 UTME subjects yet.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/profile/preparation">Pick subjects</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {subjects.map((s) => (
                <li key={s}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-foreground">{s}</span>
                    <span className="text-muted-foreground">{loaded ? `${accuracy}/100` : "—"}</span>
                  </div>
                  <Progress value={accuracy} />
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/jamb-intelligence">Open JAMB Intelligence</Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SubjectCombinationTracker;
