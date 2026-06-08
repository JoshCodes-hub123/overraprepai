
-- =========================================================
-- 1. AI Pricing table (central price list)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.ai_pricing (
  kind text PRIMARY KEY,
  cost int NOT NULL CHECK (cost >= 0),
  free_eligible boolean NOT NULL DEFAULT false,
  label text NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_pricing TO authenticated, anon;
GRANT ALL ON public.ai_pricing TO service_role;
ALTER TABLE public.ai_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pricing"
  ON public.ai_pricing FOR SELECT
  TO authenticated, anon
  USING (true);

INSERT INTO public.ai_pricing (kind, cost, free_eligible, label, description) VALUES
  ('ai_chat',              1, true,  'AI Tutor message',         'Ask the AI tutor anything'),
  ('ai_explain',           1, true,  'Explain a question',       'AI explanation for a quiz question'),
  ('ai_summary',           1, true,  'Smart Summary',            'Summarise notes or material'),
  ('flashcards_generate',  1, true,  'Generate flashcards',      'Auto-generate a flashcard deck'),
  ('quiz_generate',        2, false, 'Generate a quiz',          'AI-generated quiz from your notes'),
  ('pdf_export',           2, false, 'Export to PDF',            'Export a summary, quiz or study pack to PDF'),
  ('audio_tts',            3, false, 'Audio (Text-to-Speech)',   'Convert notes/summary to audio'),
  ('study_pack_generate',  4, false, 'Generate Study Pack',      'Full study pack: summary + flashcards + quiz'),
  ('mock_exam_generate',   5, false, 'Generate Mock Exam',       'AI-generated mock exam'),
  ('unlock_quiz',          2, false, 'Unlock tutor quiz',        'Unlock a tutor-made quiz forever'),
  ('unlock_audio_pack',    3, false, 'Unlock audio pack',        'Unlock an audio pack forever'),
  ('unlock_pdf',           2, false, 'Unlock PDF download',      'Unlock a PDF resource forever')
ON CONFLICT (kind) DO UPDATE
  SET cost = EXCLUDED.cost,
      free_eligible = EXCLUDED.free_eligible,
      label = EXCLUDED.label,
      description = EXCLUDED.description,
      updated_at = now();

-- =========================================================
-- 2. Quiz unlocks (forever access after first purchase)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.quiz_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL,
  cost_paid int NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quiz_id)
);
CREATE INDEX IF NOT EXISTS quiz_unlocks_user_idx ON public.quiz_unlocks(user_id);

GRANT SELECT, INSERT ON public.quiz_unlocks TO authenticated;
GRANT ALL ON public.quiz_unlocks TO service_role;
ALTER TABLE public.quiz_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own unlocks"
  ON public.quiz_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own unlocks"
  ON public.quiz_unlocks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 3. User devices (one active device per account)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_devices_user_idx ON public.user_devices(user_id, is_active);

GRANT SELECT ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own devices"
  ON public.user_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- 4. Reminder preferences (opt-out)
-- =========================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_hour_lagos int NOT NULL DEFAULT 18 CHECK (reminder_hour_lagos BETWEEN 0 AND 23),
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- =========================================================
-- 5. register_device / verify_device RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.register_device(_fingerprint text, _user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  replaced_count int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  -- Deactivate any other device for this user
  UPDATE public.user_devices
    SET is_active = false
    WHERE user_id = uid AND fingerprint <> _fingerprint AND is_active = true;
  GET DIAGNOSTICS replaced_count = ROW_COUNT;

  -- Upsert this device as active
  INSERT INTO public.user_devices (user_id, fingerprint, user_agent, is_active, last_seen_at)
  VALUES (uid, _fingerprint, _user_agent, true, now())
  ON CONFLICT DO NOTHING;

  UPDATE public.user_devices
    SET is_active = true, last_seen_at = now(), user_agent = COALESCE(_user_agent, user_agent)
    WHERE user_id = uid AND fingerprint = _fingerprint;

  RETURN jsonb_build_object('ok', true, 'replaced', replaced_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_device(_fingerprint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_current boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'unauthenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_devices
    WHERE user_id = uid AND fingerprint = _fingerprint AND is_active = true
  ) INTO is_current;

  IF is_current THEN
    UPDATE public.user_devices
      SET last_seen_at = now()
      WHERE user_id = uid AND fingerprint = _fingerprint;
  END IF;

  RETURN jsonb_build_object('valid', is_current);
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_device(text) TO authenticated;

-- =========================================================
-- 6. unlock_quiz RPC (debits real cost, idempotent)
-- =========================================================
CREATE OR REPLACE FUNCTION public.unlock_quiz(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal int;
  cost int;
  already boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.quiz_unlocks WHERE user_id = uid AND quiz_id = _quiz_id) INTO already;
  IF already THEN
    RETURN jsonb_build_object('allowed', true, 'already_unlocked', true, 'cost', 0);
  END IF;

  SELECT COALESCE(p.cost, 2) INTO cost FROM public.ai_pricing p WHERE p.kind = 'unlock_quiz';

  SELECT COALESCE(ai_token_balance, 0) INTO bal FROM public.profiles WHERE id = uid;

  IF bal < cost THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'insufficient', 'cost', cost, 'balance', bal);
  END IF;

  UPDATE public.profiles SET ai_token_balance = bal - cost WHERE id = uid;

  INSERT INTO public.quiz_unlocks (user_id, quiz_id, cost_paid) VALUES (uid, _quiz_id, cost)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;

  BEGIN
    INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind)
    VALUES (uid, 'spend', cost, 'unlock_quiz');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('allowed', true, 'cost', cost, 'balance', bal - cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlock_quiz(uuid) TO authenticated;

-- =========================================================
-- 7. Updated consume_ai_token — pulls cost from ai_pricing
-- =========================================================
CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  bal int;
  used int;
  reset_at timestamptz;
  today_lagos date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  reset_date date;
  cost int;
  free_ok boolean;
  new_bal int;
  new_used int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'balance', 0, 'free_left', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT p.cost, p.free_eligible INTO cost, free_ok
    FROM public.ai_pricing p WHERE p.kind = _kind;
  IF cost IS NULL THEN
    cost := 1;
    free_ok := true;
  END IF;

  SELECT COALESCE(ai_token_balance, 0), COALESCE(daily_free_used, 0), daily_free_reset_at
    INTO bal, used, reset_at
  FROM public.profiles WHERE id = uid;

  reset_date := COALESCE((reset_at AT TIME ZONE 'Africa/Lagos')::date, today_lagos - 1);
  IF reset_date < today_lagos THEN
    used := 0;
    UPDATE public.profiles SET daily_free_used = 0, daily_free_reset_at = now() WHERE id = uid;
  END IF;

  -- Free quota only applies to free_eligible kinds AND cost == 1
  IF free_ok AND cost = 1 AND used < 3 THEN
    new_used := used + 1;
    UPDATE public.profiles SET daily_free_used = new_used, daily_free_reset_at = COALESCE(daily_free_reset_at, now()) WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind)
      VALUES (uid, 'spend', 0, _kind);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'free', 'balance', bal, 'cost', 0, 'free_left', 3 - new_used);
  END IF;

  -- Wallet path
  IF bal >= cost THEN
    new_bal := bal - cost;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind)
      VALUES (uid, 'spend', cost, _kind);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'token', 'balance', new_bal, 'cost', cost, 'free_left', GREATEST(0, 3 - used));
  END IF;

  RETURN jsonb_build_object('allowed', false, 'balance', bal, 'cost', cost, 'free_left', GREATEST(0, 3 - used), 'reason', 'insufficient');
END;
$$;
