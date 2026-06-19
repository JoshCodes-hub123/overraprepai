
-- Enums
DO $$ BEGIN
  CREATE TYPE public.arena_kind AS ENUM ('daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.arena_status AS ENUM ('draft', 'scheduled', 'live', 'ended', 'settled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.arena_entry_status AS ENUM ('in_progress', 'submitted', 'disqualified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE public.wallet_txn_kind ADD VALUE IF NOT EXISTS 'arena_entry';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.wallet_txn_kind ADD VALUE IF NOT EXISTS 'arena_prize';
EXCEPTION WHEN others THEN NULL; END $$;

-- arena_challenges
CREATE TABLE IF NOT EXISTS public.arena_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.arena_kind NOT NULL DEFAULT 'daily',
  title text NOT NULL,
  description text,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  entry_token_cost integer NOT NULL DEFAULT 0 CHECK (entry_token_cost >= 0),
  prize_pool_tokens integer NOT NULL DEFAULT 0 CHECK (prize_pool_tokens >= 0),
  num_questions integer NOT NULL DEFAULT 10 CHECK (num_questions BETWEEN 1 AND 100),
  time_limit_seconds integer NOT NULL DEFAULT 600 CHECK (time_limit_seconds BETWEEN 30 AND 7200),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status public.arena_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  payout_split jsonb NOT NULL DEFAULT '{"1":0.5,"2":0.3,"3":0.2}'::jsonb,
  cover_image_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.arena_challenges TO authenticated;
GRANT ALL ON public.arena_challenges TO service_role;
ALTER TABLE public.arena_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_challenges_read_public"
  ON public.arena_challenges FOR SELECT TO authenticated
  USING (status IN ('scheduled','live','ended','settled') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "arena_challenges_admin_write"
  ON public.arena_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_arena_challenges_status_ends ON public.arena_challenges(status, ends_at);
CREATE INDEX IF NOT EXISTS idx_arena_challenges_kind_featured ON public.arena_challenges(kind, featured);

-- arena_challenge_questions
CREATE TABLE IF NOT EXISTS public.arena_challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  ord integer NOT NULL,
  UNIQUE (challenge_id, ord),
  UNIQUE (challenge_id, question_id)
);

GRANT SELECT ON public.arena_challenge_questions TO authenticated;
GRANT ALL ON public.arena_challenge_questions TO service_role;
ALTER TABLE public.arena_challenge_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_questions_admin_read"
  ON public.arena_challenge_questions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "arena_questions_admin_write"
  ON public.arena_challenge_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_arena_qs_challenge ON public.arena_challenge_questions(challenge_id, ord);

-- arena_entries
CREATE TABLE IF NOT EXISTS public.arena_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.arena_entry_status NOT NULL DEFAULT 'in_progress',
  score integer NOT NULL DEFAULT 0,
  accuracy numeric(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds integer NOT NULL DEFAULT 0,
  tokens_spent integer NOT NULL DEFAULT 0,
  entered_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  UNIQUE (challenge_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.arena_entries TO authenticated;
GRANT ALL ON public.arena_entries TO service_role;
ALTER TABLE public.arena_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_entries_own_or_admin_read"
  ON public.arena_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "arena_entries_admin_write"
  ON public.arena_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS idx_arena_entries_challenge_rank ON public.arena_entries(challenge_id, score DESC, time_taken_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_arena_entries_user ON public.arena_entries(user_id, entered_at DESC);

-- arena_entry_answers
CREATE TABLE IF NOT EXISTS public.arena_entry_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.arena_entries(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option char(1),
  is_correct boolean NOT NULL DEFAULT false,
  elapsed_ms integer NOT NULL DEFAULT 0,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, question_id)
);

GRANT SELECT ON public.arena_entry_answers TO authenticated;
GRANT ALL ON public.arena_entry_answers TO service_role;
ALTER TABLE public.arena_entry_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_answers_own_or_admin"
  ON public.arena_entry_answers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.arena_entries e WHERE e.id = entry_id AND e.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_arena_answers_entry ON public.arena_entry_answers(entry_id);

-- arena_rewards
CREATE TABLE IF NOT EXISTS public.arena_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.arena_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  tokens_awarded integer NOT NULL DEFAULT 0,
  badge_slug text,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

GRANT SELECT ON public.arena_rewards TO authenticated;
GRANT ALL ON public.arena_rewards TO service_role;
ALTER TABLE public.arena_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arena_rewards_read_all"
  ON public.arena_rewards FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_arena_rewards_challenge ON public.arena_rewards(challenge_id, rank);

CREATE OR REPLACE FUNCTION public.arena_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_arena_challenges_touch ON public.arena_challenges;
CREATE TRIGGER trg_arena_challenges_touch
  BEFORE UPDATE ON public.arena_challenges
  FOR EACH ROW EXECUTE FUNCTION public.arena_touch_updated_at();

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.arena_enter_challenge(_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ch public.arena_challenges%ROWTYPE;
  v_bal int;
  v_entry_id uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;

  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;

  IF v_ch.status = 'scheduled' AND now() >= v_ch.starts_at AND now() <= v_ch.ends_at THEN
    UPDATE public.arena_challenges SET status = 'live' WHERE id = v_ch.id;
    v_ch.status := 'live';
  END IF;

  IF v_ch.status <> 'live' OR now() < v_ch.starts_at OR now() > v_ch.ends_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_open');
  END IF;

  SELECT id INTO v_entry_id FROM public.arena_entries
    WHERE challenge_id = v_ch.id AND user_id = v_user;
  IF v_entry_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'already_entered', true);
  END IF;

  IF v_ch.entry_token_cost > 0 THEN
    SELECT ai_token_balance INTO v_bal FROM public.profiles WHERE id = v_user FOR UPDATE;
    IF v_bal IS NULL OR v_bal < v_ch.entry_token_cost THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_tokens',
        'balance', COALESCE(v_bal,0), 'required', v_ch.entry_token_cost);
    END IF;
    UPDATE public.profiles SET ai_token_balance = ai_token_balance - v_ch.entry_token_cost
      WHERE id = v_user RETURNING ai_token_balance INTO v_bal;
    INSERT INTO public.wallet_transactions(user_id, kind, tokens, ref_id, reason, balance_after)
      VALUES (v_user, 'arena_entry', -v_ch.entry_token_cost,
              'arena_entry:' || v_ch.id::text || ':' || v_user::text,
              'Arena entry: ' || v_ch.title, v_bal);
  END IF;

  INSERT INTO public.arena_entries(challenge_id, user_id, tokens_spent, status)
    VALUES (v_ch.id, v_user, v_ch.entry_token_cost, 'in_progress')
    RETURNING id INTO v_entry_id;

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'balance', COALESCE(v_bal, 0));
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_enter_challenge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_get_play_questions(_challenge_id uuid)
RETURNS TABLE (
  ord integer, question_id uuid, question_text text,
  option_a text, option_b text, option_c text, option_d text, image_url text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ok boolean := false;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF public.has_role(v_user, 'admin') THEN
    v_ok := true;
  ELSE
    SELECT true INTO v_ok FROM public.arena_entries e
      WHERE e.challenge_id = _challenge_id AND e.user_id = v_user
        AND e.status = 'in_progress' LIMIT 1;
  END IF;
  IF NOT COALESCE(v_ok, false) THEN RAISE EXCEPTION 'no_active_entry'; END IF;

  RETURN QUERY
    SELECT q.ord, qu.id, qu.question_text, qu.option_a, qu.option_b, qu.option_c, qu.option_d, qu.image_url
    FROM public.arena_challenge_questions q
    JOIN public.questions qu ON qu.id = q.question_id
    WHERE q.challenge_id = _challenge_id
    ORDER BY q.ord ASC;
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_get_play_questions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_submit_entry(_entry_id uuid, _answers jsonb, _time_taken_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.arena_entries%ROWTYPE;
  v_ch public.arena_challenges%ROWTYPE;
  v_total int := 0; v_correct int := 0; v_time int;
  v_row jsonb; v_qid uuid; v_sel char(1); v_elapsed int;
  v_is_correct boolean; v_correct_opt char(1);
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO v_entry FROM public.arena_entries WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.user_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF v_entry.status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted', 'score', v_entry.score);
  END IF;
  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = v_entry.challenge_id;
  v_time := GREATEST(0, LEAST(COALESCE(_time_taken_seconds, 0), v_ch.time_limit_seconds));
  SELECT COUNT(*) INTO v_total FROM public.arena_challenge_questions WHERE challenge_id = v_ch.id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(_answers, '[]'::jsonb))
  LOOP
    v_qid := NULLIF(v_row->>'question_id','')::uuid;
    v_sel := UPPER(NULLIF(v_row->>'selected',''))::char(1);
    v_elapsed := COALESCE((v_row->>'elapsed_ms')::int, 0);
    IF v_qid IS NULL THEN CONTINUE; END IF;
    SELECT qu.correct_option INTO v_correct_opt
      FROM public.arena_challenge_questions cq
      JOIN public.questions qu ON qu.id = cq.question_id
      WHERE cq.challenge_id = v_ch.id AND cq.question_id = v_qid;
    IF v_correct_opt IS NULL THEN CONTINUE; END IF;
    v_is_correct := (v_sel IS NOT NULL AND v_sel = v_correct_opt);
    IF v_is_correct THEN v_correct := v_correct + 1; END IF;
    INSERT INTO public.arena_entry_answers(entry_id, question_id, selected_option, is_correct, elapsed_ms)
      VALUES (_entry_id, v_qid, v_sel, v_is_correct, v_elapsed)
      ON CONFLICT (entry_id, question_id) DO NOTHING;
  END LOOP;

  UPDATE public.arena_entries
    SET status = 'submitted', score = v_correct,
        accuracy = CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 100, 2) ELSE 0 END,
        time_taken_seconds = v_time, submitted_at = now()
    WHERE id = _entry_id;

  RETURN jsonb_build_object('ok', true, 'score', v_correct, 'total', v_total,
    'accuracy', CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 100, 2) ELSE 0 END,
    'time_taken_seconds', v_time);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_submit_entry(uuid, jsonb, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_publish_challenge(_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ch public.arena_challenges%ROWTYPE;
  v_existing int;
  v_new_status public.arena_status;
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  SELECT COUNT(*) INTO v_existing FROM public.arena_challenge_questions WHERE challenge_id = v_ch.id;

  IF v_existing = 0 THEN
    IF v_ch.course_id IS NULL THEN
      INSERT INTO public.arena_challenge_questions(challenge_id, question_id, ord)
        SELECT v_ch.id, sub.id, row_number() OVER ()
        FROM (SELECT q.id FROM public.questions q
              WHERE q.is_approved = true
              ORDER BY random() LIMIT v_ch.num_questions) sub;
    ELSE
      INSERT INTO public.arena_challenge_questions(challenge_id, question_id, ord)
        SELECT v_ch.id, sub.id, row_number() OVER ()
        FROM (SELECT q.id FROM public.questions q
              WHERE q.is_approved = true AND q.course_id = v_ch.course_id
              ORDER BY random() LIMIT v_ch.num_questions) sub;
    END IF;
    SELECT COUNT(*) INTO v_existing FROM public.arena_challenge_questions WHERE challenge_id = v_ch.id;
    IF v_existing < 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_questions_available');
    END IF;
  END IF;

  v_new_status := CASE
    WHEN now() >= v_ch.starts_at AND now() <= v_ch.ends_at THEN 'live'::public.arena_status
    WHEN now() < v_ch.starts_at THEN 'scheduled'::public.arena_status
    ELSE 'ended'::public.arena_status
  END;
  UPDATE public.arena_challenges SET status = v_new_status WHERE id = v_ch.id;
  RETURN jsonb_build_object('ok', true, 'status', v_new_status, 'questions', v_existing);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_publish_challenge(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_settle_challenge(_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ch public.arena_challenges%ROWTYPE;
  v_count int := 0; v_winners int := 0;
  r record; v_share numeric; v_award int; v_split jsonb; v_badge text;
BEGIN
  IF v_user IS NOT NULL AND NOT public.has_role(v_user, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_ch.status = 'settled' THEN
    RETURN jsonb_build_object('ok', true, 'already_settled', true);
  END IF;
  v_split := v_ch.payout_split;

  FOR r IN
    SELECT user_id, score, time_taken_seconds,
           row_number() OVER (ORDER BY score DESC, time_taken_seconds ASC, submitted_at ASC) AS rnk
    FROM public.arena_entries
    WHERE challenge_id = v_ch.id AND status = 'submitted'
  LOOP
    v_count := v_count + 1;
    v_share := COALESCE((v_split ->> r.rnk::text)::numeric, 0);
    v_award := FLOOR(v_ch.prize_pool_tokens * v_share)::int;
    v_badge := CASE WHEN r.rnk = 1 THEN 'arena-champion'
                    WHEN r.rnk BETWEEN 2 AND 3 THEN 'arena-podium'
                    ELSE NULL END;
    INSERT INTO public.arena_rewards(challenge_id, user_id, rank, tokens_awarded, badge_slug)
      VALUES (v_ch.id, r.user_id, r.rnk, v_award, v_badge)
      ON CONFLICT (challenge_id, user_id) DO NOTHING;
    IF v_award > 0 THEN
      PERFORM public.credit_wallet(r.user_id, v_award, NULL,
        'arena_prize:' || v_ch.id::text || ':' || r.user_id::text,
        'arena_prize'::public.wallet_txn_kind);
      v_winners := v_winners + 1;
    END IF;
    IF v_badge IS NOT NULL THEN
      INSERT INTO public.user_badges(user_id, badge_slug) VALUES (r.user_id, v_badge)
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  INSERT INTO public.user_badges(user_id, badge_slug)
    SELECT user_id, 'arena-debut' FROM public.arena_entries
    WHERE challenge_id = v_ch.id AND status = 'submitted'
    ON CONFLICT DO NOTHING;

  UPDATE public.arena_challenges SET status = 'settled' WHERE id = v_ch.id;
  RETURN jsonb_build_object('ok', true, 'entrants', v_count, 'paid', v_winners);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_settle_challenge(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.arena_leaderboard(_challenge_id uuid, _limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, university text,
  score integer, accuracy numeric, time_taken_seconds integer,
  rank bigint, submitted_at timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT e.user_id, p.full_name, p.avatar_url, p.university,
         e.score, e.accuracy, e.time_taken_seconds,
         row_number() OVER (ORDER BY e.score DESC, e.time_taken_seconds ASC, e.submitted_at ASC) AS rank,
         e.submitted_at
  FROM public.arena_entries e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  WHERE e.challenge_id = _challenge_id AND e.status = 'submitted'
  ORDER BY rank ASC
  LIMIT COALESCE(_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.arena_leaderboard(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_global_leaderboard(
  _scope text DEFAULT 'weekly', _course_id uuid DEFAULT NULL,
  _university text DEFAULT NULL, _limit integer DEFAULT 50
)
RETURNS TABLE (
  user_id uuid, full_name text, avatar_url text, university text,
  entries_count bigint, total_score bigint, total_winnings bigint, rank bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE v_since timestamptz;
BEGIN
  v_since := CASE
    WHEN _scope = 'daily' THEN now() - interval '1 day'
    WHEN _scope = 'weekly' THEN now() - interval '7 days'
    ELSE NULL END;

  RETURN QUERY
  WITH winnings AS (
    SELECT r.user_id, SUM(r.tokens_awarded)::bigint AS total_winnings
    FROM public.arena_rewards r
    JOIN public.arena_challenges c ON c.id = r.challenge_id
    WHERE (v_since IS NULL OR r.awarded_at >= v_since)
      AND (_course_id IS NULL OR c.course_id = _course_id)
    GROUP BY r.user_id
  ),
  base AS (
    SELECT e.user_id, COUNT(*)::bigint AS entries_count, SUM(e.score)::bigint AS total_score
    FROM public.arena_entries e
    JOIN public.arena_challenges c ON c.id = e.challenge_id
    LEFT JOIN public.profiles p ON p.id = e.user_id
    WHERE e.status = 'submitted'
      AND (v_since IS NULL OR e.submitted_at >= v_since)
      AND (_course_id IS NULL OR c.course_id = _course_id)
      AND (_university IS NULL OR p.university = _university)
    GROUP BY e.user_id
  )
  SELECT b.user_id, p.full_name, p.avatar_url, p.university,
         b.entries_count, b.total_score,
         COALESCE(w.total_winnings, 0)::bigint AS total_winnings,
         row_number() OVER (ORDER BY b.total_score DESC, b.entries_count DESC) AS rank
  FROM base b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN winnings w ON w.user_id = b.user_id
  ORDER BY rank ASC
  LIMIT COALESCE(_limit, 50);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_global_leaderboard(text, uuid, text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.arena_disqualify_entry(_entry_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.arena_entries%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_user, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  SELECT * INTO v_entry FROM public.arena_entries WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  UPDATE public.arena_entries SET status = 'disqualified' WHERE id = _entry_id;
  IF v_entry.tokens_spent > 0 THEN
    PERFORM public.credit_wallet(v_entry.user_id, v_entry.tokens_spent, NULL,
      'arena_refund:' || _entry_id::text, 'refund'::public.wallet_txn_kind);
  END IF;
  RETURN jsonb_build_object('ok', true, 'refunded', v_entry.tokens_spent);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_disqualify_entry(uuid, text) TO authenticated;

INSERT INTO public.badge_definitions(slug, name, description, icon, tier)
VALUES
  ('arena-champion', 'Arena Champion', 'Took 1st place in a Challenge Arena competition.', 'trophy', 'gold'),
  ('arena-podium',  'Arena Podium',   'Finished in the top 3 of a Challenge Arena competition.', 'medal', 'silver'),
  ('arena-debut',   'Arena Debut',    'Completed your first Challenge Arena entry.', 'sparkles', 'bronze')
ON CONFLICT (slug) DO NOTHING;
