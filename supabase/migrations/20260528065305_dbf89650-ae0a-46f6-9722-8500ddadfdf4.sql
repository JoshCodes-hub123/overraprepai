
-- 1. Seed badge definitions
INSERT INTO public.badge_definitions (slug, name, description, icon, tier) VALUES
  ('consistent-learner', 'Consistent Learner', 'Studied across 7 different days', 'flame', 'bronze'),
  ('quiz-master',       'Quiz Master',        'Answered 50 quiz questions in a week', 'trophy', 'silver'),
  ('flashcard-pro',     'Flashcard Pro',      'Reviewed 100 flashcards in a week', 'layers', 'silver'),
  ('audio-scholar',     'Audio Scholar',      'Completed 3 audio study sessions', 'headphones', 'bronze'),
  ('streak-legend',     'Streak Legend',      'Maintained a 14-day study streak', 'zap', 'gold'),
  ('top-10',            'Top 10',             'Reached the Top 10 on the leaderboard', 'crown', 'gold'),
  ('rising-star',       'Rising Star',        'Reached the Top 50 on the leaderboard', 'star', 'silver'),
  ('champion',          'Champion',           'Earned 5 weekly challenge badges', 'award', 'gold')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed weekly challenges
INSERT INTO public.challenges (slug, title, description, icon, goal_type, goal_target, duration_days, reward_tokens, badge_slug, is_active, is_seeded, sort_order) VALUES
  ('weekly-50-questions', 'Answer 50 Questions',   'Tackle 50 quiz questions this week to sharpen your speed.', 'brain',      'quizzes',       50, 7, 20, 'quiz-master',       true, true, 10),
  ('weekly-100-cards',    'Review 100 Flashcards', 'Build long-term recall by reviewing 100 cards this week.',  'layers',     'flashcards',   100, 7, 25, 'flashcard-pro',     true, true, 20),
  ('weekly-7-day-streak', '7-Day Study Streak',    'Study every day for a full week — no skips.',               'flame',      'study_days',     7, 7, 30, 'consistent-learner', true, true, 30),
  ('weekly-3-audio',      '3 Audio Sessions',      'Listen to 3 audio study sessions this week.',               'headphones', 'audio_sessions', 3, 7, 15, 'audio-scholar',     true, true, 40),
  ('biweekly-14-streak',  '14-Day Streak Legend',  'Push your streak to 14 days for legendary status.',         'zap',        'study_days',    14, 14, 50, 'streak-legend',    true, true, 50),
  ('weekly-200-questions','Power Week: 200 Qs',    'For grinders — clear 200 questions in 7 days.',             'trophy',     'quizzes',      200, 7, 40, 'top-10',            true, true, 60)
ON CONFLICT (slug) DO NOTHING;

-- 3. My-rank RPC mirroring get_student_leaderboard scoring
CREATE OR REPLACE FUNCTION public.get_my_leaderboard_rank(_user uuid)
RETURNS TABLE(rank int, total int, score numeric, percentile int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH win AS (SELECT (now() - interval '30 days') AS since),
  quiz AS (
    SELECT qa.user_id,
           CASE WHEN SUM(qa.total_questions) > 0
                THEN (SUM(qa.correct_answers)::numeric / SUM(qa.total_questions)) * 100
                ELSE 0 END AS accuracy
    FROM public.quiz_attempts qa, win
    WHERE qa.completed_at IS NOT NULL AND qa.completed_at >= win.since
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
  ),
  scored AS (
    SELECT p.id AS uid,
           (
             COALESCE(quiz.accuracy, 0) * 0.40 +
             LEAST(COALESCE(cards.reviewed, 0), 200) * 0.5 * 0.20 +
             LEAST(COALESCE(ss.current_streak, 0), 60) * 1.0 * 0.15 +
             LEAST(COALESCE(ai.gens, 0), 100) * 1.0 * 0.15 +
             LEAST(COALESCE(eng.msgs, 0), 200) * 0.5 * 0.10
           )::numeric AS s
    FROM public.profiles p
    LEFT JOIN quiz   ON quiz.user_id   = p.id
    LEFT JOIN cards  ON cards.user_id  = p.id
    LEFT JOIN public.study_streaks ss ON ss.user_id = p.id
    LEFT JOIN ai     ON ai.user_id     = p.id
    LEFT JOIN eng    ON eng.user_id    = p.id
  ),
  ranked AS (
    SELECT uid, s,
           RANK() OVER (ORDER BY s DESC NULLS LAST)::int AS r,
           COUNT(*) OVER ()::int AS t
    FROM scored
    WHERE s > 0
  )
  SELECT
    COALESCE((SELECT r FROM ranked WHERE uid = _user), 0) AS rank,
    COALESCE((SELECT t FROM ranked LIMIT 1), 0) AS total,
    COALESCE((SELECT s FROM ranked WHERE uid = _user), 0)::numeric AS score,
    CASE
      WHEN (SELECT t FROM ranked LIMIT 1) > 0 AND (SELECT r FROM ranked WHERE uid = _user) IS NOT NULL
      THEN GREATEST(0, 100 - ROUND(((SELECT r FROM ranked WHERE uid = _user)::numeric / (SELECT t FROM ranked LIMIT 1)) * 100))::int
      ELSE 0
    END AS percentile;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_leaderboard_rank(uuid) TO authenticated, anon;
