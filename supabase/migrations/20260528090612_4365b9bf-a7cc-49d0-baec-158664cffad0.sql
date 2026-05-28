-- Log quiz completions into activity_events so the scoring activity feed is auto-populated.
CREATE OR REPLACE FUNCTION public.log_quiz_completion_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course uuid;
  v_pct numeric;
BEGIN
  SELECT course_id INTO v_course FROM public.quizzes WHERE id = NEW.quiz_id;
  v_pct := CASE
    WHEN NEW.total_questions IS NOT NULL AND NEW.total_questions > 0
      THEN ROUND((COALESCE(NEW.correct_answers,0)::numeric / NEW.total_questions) * 100)
    ELSE COALESCE(NEW.score, 0)
  END;

  INSERT INTO public.activity_events (actor_id, verb, object_type, object_id, course_id, visibility, meta)
  VALUES (
    NEW.user_id,
    'quiz_completed',
    'quiz_attempt',
    NEW.id,
    v_course,
    'public',
    jsonb_build_object(
      'quiz_id', NEW.quiz_id,
      'score', v_pct,
      'correct', NEW.correct_answers,
      'total', NEW.total_questions
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_quiz_completion_activity ON public.quiz_attempts;
CREATE TRIGGER trg_log_quiz_completion_activity
AFTER UPDATE ON public.quiz_attempts
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.log_quiz_completion_activity();