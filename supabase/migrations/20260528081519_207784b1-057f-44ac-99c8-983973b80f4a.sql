
-- Filtered student leaderboard
CREATE OR REPLACE FUNCTION public.get_student_leaderboard_filtered(
  _limit integer DEFAULT 20,
  _scope text DEFAULT 'overall',
  _course_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid, full_name text, avatar_url text, university text,
  score numeric, quiz_accuracy numeric, cards_reviewed integer,
  streak_days integer, ai_activity integer, engagement integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH win AS (
    SELECT CASE
      WHEN _scope = 'weekly' THEN now() - interval '7 days'
      ELSE now() - interval '365 days'
    END AS since
  ),
  quiz AS (
    SELECT qa.user_id,
           CASE WHEN SUM(qa.total_questions) > 0
                THEN (SUM(qa.correct_answers)::numeric / SUM(qa.total_questions)) * 100
                ELSE 0 END AS accuracy
    FROM public.quiz_attempts qa
    LEFT JOIN public.quizzes q ON q.id = qa.quiz_id
    , win
    WHERE qa.completed_at IS NOT NULL
      AND qa.completed_at >= win.since
      AND (_course_id IS NULL OR q.course_id = _course_id)
    GROUP BY qa.user_id
  ),
  cards AS (
    SELECT s.user_id, COUNT(*)::int AS reviewed
    FROM public.srs_cards s, win
    WHERE s.last_reviewed_at IS NOT NULL AND s.last_reviewed_at >= win.since
    GROUP BY s.user_id
  ),
  ai AS (
    SELECT user_id, COUNT(*)::int AS gens
    FROM public.ai_generation_history, win
    WHERE created_at >= win.since
    GROUP BY user_id
  ),
  eng AS (
    SELECT user_id, COUNT(*)::int AS msgs
    FROM public.course_chat_messages, win
    WHERE created_at >= win.since
    GROUP BY user_id
  )
  SELECT p.id,
         p.full_name,
         COALESCE(p.profile_image_url, p.avatar_url),
         p.university,
         (
           COALESCE(quiz.accuracy, 0) * 0.40 +
           LEAST(COALESCE(cards.reviewed, 0), 200) * 0.5 * 0.20 +
           LEAST(COALESCE(ss.current_streak, 0), 60) * 1.0 * 0.15 +
           LEAST(COALESCE(ai.gens, 0), 100) * 0.6 * 0.15 +
           LEAST(COALESCE(eng.msgs, 0), 200) * 0.3 * 0.10
         )::numeric,
         COALESCE(quiz.accuracy, 0)::numeric,
         COALESCE(cards.reviewed, 0),
         COALESCE(ss.current_streak, 0),
         COALESCE(ai.gens, 0),
         COALESCE(eng.msgs, 0)
  FROM public.profiles p
  LEFT JOIN public.study_streaks ss ON ss.user_id = p.id
  LEFT JOIN quiz ON quiz.user_id = p.id
  LEFT JOIN cards ON cards.user_id = p.id
  LEFT JOIN ai ON ai.user_id = p.id
  LEFT JOIN eng ON eng.user_id = p.id
  WHERE (
    COALESCE(quiz.accuracy, 0) + COALESCE(cards.reviewed, 0) +
    COALESCE(ai.gens, 0) + COALESCE(eng.msgs, 0)
  ) > 0
  ORDER BY 5 DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_leaderboard_filtered(integer, text, uuid) TO authenticated, anon;

-- Recent scoring activity for the leaderboard page
CREATE OR REPLACE FUNCTION public.get_recent_scoring_activity(_limit integer DEFAULT 25)
RETURNS TABLE(
  id uuid, actor_id uuid, full_name text, avatar_url text,
  verb text, object_type text, course_id uuid, meta jsonb, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.actor_id, p.full_name,
         COALESCE(p.profile_image_url, p.avatar_url),
         e.verb, e.object_type, e.course_id, e.meta, e.created_at
  FROM public.activity_events e
  LEFT JOIN public.profiles p ON p.id = e.actor_id
  WHERE e.verb IN (
    'quiz_completed','quiz_attempted','flashcard_reviewed',
    'srs_reviewed','streak_updated','streak_milestone',
    'badge_earned','challenge_progress','challenge_completed'
  )
  ORDER BY e.created_at DESC
  LIMIT _limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_scoring_activity(integer) TO authenticated, anon;
