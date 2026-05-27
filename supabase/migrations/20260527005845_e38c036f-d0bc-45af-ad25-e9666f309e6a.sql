
-- ============================================================
-- Badge definitions
-- ============================================================
CREATE TABLE public.badge_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'award',
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badge_definitions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_definitions TO authenticated;
GRANT ALL ON public.badge_definitions TO service_role;

ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are viewable by everyone"
  ON public.badge_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins manage badges"
  ON public.badge_definitions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Challenges (admin-curated + seeded)
-- ============================================================
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'target',
  -- 'study_days' | 'quizzes' | 'flashcards' | 'audio_sessions' | 'early_revision'
  goal_type TEXT NOT NULL,
  goal_target INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 7,
  reward_tokens INTEGER NOT NULL DEFAULT 0,
  badge_slug TEXT REFERENCES public.badge_definitions(slug) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_seeded BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active challenges are viewable by everyone"
  ON public.challenges FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage challenges"
  ON public.challenges FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Enrollments
-- ============================================================
CREATE TABLE public.challenge_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active | completed | claimed | expired
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  UNIQUE (user_id, challenge_id, starts_at)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_enrollments TO authenticated;
GRANT ALL ON public.challenge_enrollments TO service_role;

ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own enrollments"
  ON public.challenge_enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users enroll self"
  ON public.challenge_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own enrollments"
  ON public.challenge_enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own enrollments"
  ON public.challenge_enrollments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_challenge_enrollments_user ON public.challenge_enrollments(user_id, status);
CREATE INDEX idx_challenge_enrollments_challenge ON public.challenge_enrollments(challenge_id);

-- ============================================================
-- Progress events (audit / per-day log)
-- ============================================================
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID NOT NULL REFERENCES public.challenge_enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own progress"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own progress"
  ON public.challenge_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_challenge_progress_enrollment ON public.challenge_progress(enrollment_id, created_at DESC);

-- ============================================================
-- User badges
-- ============================================================
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_slug TEXT NOT NULL REFERENCES public.badge_definitions(slug) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT,
  UNIQUE (user_id, badge_slug)
);

GRANT SELECT ON public.user_badges TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges publicly viewable"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "Users insert own badges"
  ON public.user_badges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete badges"
  ON public.user_badges FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Helper: increment enrollment value and auto-complete
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_challenge_progress(
  _user_id UUID,
  _goal_type TEXT,
  _delta INTEGER DEFAULT 1,
  _source TEXT DEFAULT 'auto'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enr RECORD;
  ch RECORD;
BEGIN
  FOR enr IN
    SELECT ce.* FROM public.challenge_enrollments ce
    JOIN public.challenges c ON c.id = ce.challenge_id
    WHERE ce.user_id = _user_id
      AND ce.status = 'active'
      AND c.goal_type = _goal_type
      AND ce.ends_at > now()
  LOOP
    SELECT * INTO ch FROM public.challenges WHERE id = enr.challenge_id;

    UPDATE public.challenge_enrollments
    SET current_value = LEAST(current_value + _delta, ch.goal_target),
        status = CASE
          WHEN current_value + _delta >= ch.goal_target THEN 'completed'
          ELSE status
        END,
        completed_at = CASE
          WHEN current_value + _delta >= ch.goal_target AND completed_at IS NULL THEN now()
          ELSE completed_at
        END
    WHERE id = enr.id;

    INSERT INTO public.challenge_progress (enrollment_id, user_id, delta, source)
    VALUES (enr.id, _user_id, _delta, _source);
  END LOOP;
END;
$$;

-- ============================================================
-- Triggers wiring real activity → bump_challenge_progress
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_quiz_attempt_to_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.bump_challenge_progress(NEW.user_id, 'quizzes', 1, 'quiz_attempt');
    PERFORM public.bump_challenge_progress(NEW.user_id, 'study_days', 1, 'quiz_attempt');
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='quiz_attempts') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_quiz_attempt_challenge ON public.quiz_attempts';
    EXECUTE 'CREATE TRIGGER trg_quiz_attempt_challenge AFTER INSERT ON public.quiz_attempts FOR EACH ROW EXECUTE FUNCTION public.trg_quiz_attempt_to_challenge()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_srs_review_to_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.bump_challenge_progress(NEW.user_id, 'flashcards', 1, 'srs_review');
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='srs_reviews') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_srs_review_challenge ON public.srs_reviews';
    EXECUTE 'CREATE TRIGGER trg_srs_review_challenge AFTER INSERT ON public.srs_reviews FOR EACH ROW EXECUTE FUNCTION public.trg_srs_review_to_challenge()';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_audio_session_to_challenge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.bump_challenge_progress(NEW.user_id, 'audio_sessions', 1, 'audio_session');
  END IF;
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audio_sessions') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_audio_session_challenge ON public.audio_sessions';
    EXECUTE 'CREATE TRIGGER trg_audio_session_challenge AFTER INSERT ON public.audio_sessions FOR EACH ROW EXECUTE FUNCTION public.trg_audio_session_to_challenge()';
  END IF;
END $$;

-- ============================================================
-- Seed badges + challenges
-- ============================================================
INSERT INTO public.badge_definitions (slug, name, description, icon, tier) VALUES
  ('consistent-scholar', 'Consistent Scholar', '7 days of study in a row', 'flame', 'gold'),
  ('quiz-master', 'Quiz Master', 'Completed 5 quizzes in a week', 'trophy', 'silver'),
  ('flashcard-champion', 'Flashcard Champion', '50 flashcards reviewed in a week', 'zap', 'silver'),
  ('audio-learner', 'Audio Learner', '3 audio learning sessions in a week', 'headphones', 'bronze'),
  ('early-reviser', 'Early Reviser', 'Started revising ahead of schedule', 'clock', 'bronze')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.challenges (slug, title, description, icon, goal_type, goal_target, duration_days, reward_tokens, badge_slug, is_seeded, sort_order) VALUES
  ('consistent-study-7d', 'Consistent Study', 'Study every day for 7 days straight.', 'flame', 'study_days', 7, 7, 30, 'consistent-scholar', true, 1),
  ('quiz-master-5', 'Quiz Master', 'Complete 5 quizzes this week.', 'trophy', 'quizzes', 5, 7, 20, 'quiz-master', true, 2),
  ('flashcard-50', 'Flashcard Champion', 'Review 50 flashcards this week.', 'zap', 'flashcards', 50, 7, 20, 'flashcard-champion', true, 3),
  ('audio-3', 'Audio Learner', 'Complete 3 audio learning sessions.', 'headphones', 'audio_sessions', 3, 7, 15, 'audio-learner', true, 4),
  ('early-revision', 'Early Reviser', 'Start revising before exam week.', 'clock', 'early_revision', 1, 14, 10, 'early-reviser', true, 5)
ON CONFLICT (slug) DO NOTHING;
