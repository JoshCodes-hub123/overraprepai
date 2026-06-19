
-- =========================================================
-- Arena anti-cheat hardening + notifications
-- =========================================================

ALTER TABLE public.arena_entries
  ADD COLUMN IF NOT EXISTS server_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS submission_hash text,
  ADD COLUMN IF NOT EXISTS anti_cheat_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS suspicious_score integer NOT NULL DEFAULT 0;

UPDATE public.arena_entries SET server_started_at = entered_at WHERE server_started_at IS NULL;

-- Anti-cheat event log -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arena_anti_cheat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.arena_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.arena_anti_cheat_events TO authenticated;
GRANT ALL ON public.arena_anti_cheat_events TO service_role;
ALTER TABLE public.arena_anti_cheat_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arena_ac_admin_read"
  ON public.arena_anti_cheat_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_arena_ac_entry ON public.arena_anti_cheat_events(entry_id, created_at DESC);

-- Patch enter to seed server_started_at ------------------------------------
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

  INSERT INTO public.arena_entries(challenge_id, user_id, tokens_spent, status, server_started_at)
    VALUES (v_ch.id, v_user, v_ch.entry_token_cost, 'in_progress', now())
    RETURNING id INTO v_entry_id;

  -- Welcome notification
  INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_user, 'You are in! ⚔️',
            'You joined "' || v_ch.title || '". Best of luck — submit before time runs out.',
            'info', '/arena/' || v_ch.id::text || '/play');

  RETURN jsonb_build_object('ok', true, 'entry_id', v_entry_id, 'balance', COALESCE(v_bal, 0));
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_enter_challenge(uuid) TO authenticated;

-- Hardened submit: server-side scoring, time clamp, dedupe, hash, replay-block
CREATE OR REPLACE FUNCTION public.arena_submit_entry(_entry_id uuid, _answers jsonb, _time_taken_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.arena_entries%ROWTYPE;
  v_ch public.arena_challenges%ROWTYPE;
  v_total int := 0; v_correct int := 0;
  v_server_time int;
  v_row jsonb; v_qid uuid; v_sel char(1); v_elapsed int;
  v_is_correct boolean; v_correct_opt char(1);
  v_hash text; v_canonical text := '';
  v_seen jsonb := '{}'::jsonb;
  v_grace_seconds int := 30;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;

  -- Lock entry row
  SELECT * INTO v_entry FROM public.arena_entries WHERE id = _entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.user_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  IF v_entry.status <> 'in_progress' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_submitted', 'score', v_entry.score);
  END IF;

  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = v_entry.challenge_id;

  -- Window enforcement: reject submissions far past the deadline (grace 30s)
  IF now() > v_ch.ends_at + (v_grace_seconds || ' seconds')::interval THEN
    UPDATE public.arena_entries
       SET status = 'disqualified',
           anti_cheat_flags = anti_cheat_flags || jsonb_build_object('reason','submitted_after_window'),
           submitted_at = now()
       WHERE id = _entry_id;
    RETURN jsonb_build_object('ok', false, 'error', 'window_closed');
  END IF;

  -- Server-truth time (ignore client-reported value beyond clamp)
  v_server_time := GREATEST(0, LEAST(
    EXTRACT(EPOCH FROM (now() - v_entry.server_started_at))::int,
    v_ch.time_limit_seconds
  ));

  SELECT COUNT(*) INTO v_total FROM public.arena_challenge_questions WHERE challenge_id = v_ch.id;

  -- Score only against the frozen, server-known question set; dedupe by qid
  FOR v_row IN SELECT * FROM jsonb_array_elements(COALESCE(_answers, '[]'::jsonb))
  LOOP
    v_qid := NULLIF(v_row->>'question_id','')::uuid;
    IF v_qid IS NULL THEN CONTINUE; END IF;
    IF v_seen ? v_qid::text THEN CONTINUE; END IF;  -- dedupe replayed answers
    v_seen := v_seen || jsonb_build_object(v_qid::text, true);

    v_sel := UPPER(NULLIF(v_row->>'selected',''))::char(1);
    v_elapsed := GREATEST(0, LEAST(COALESCE((v_row->>'elapsed_ms')::int, 0), v_ch.time_limit_seconds * 1000));

    SELECT qu.correct_option INTO v_correct_opt
      FROM public.arena_challenge_questions cq
      JOIN public.questions qu ON qu.id = cq.question_id
      WHERE cq.challenge_id = v_ch.id AND cq.question_id = v_qid;
    -- Skip qids not in frozen set (anti-cheat: client cannot smuggle extras)
    IF v_correct_opt IS NULL THEN CONTINUE; END IF;

    v_is_correct := (v_sel IS NOT NULL AND v_sel = v_correct_opt);
    IF v_is_correct THEN v_correct := v_correct + 1; END IF;

    INSERT INTO public.arena_entry_answers(entry_id, question_id, selected_option, is_correct, elapsed_ms)
      VALUES (_entry_id, v_qid, v_sel, v_is_correct, v_elapsed)
      ON CONFLICT (entry_id, question_id) DO NOTHING;

    v_canonical := v_canonical || v_qid::text || ':' || COALESCE(v_sel::text,'') || '|';
  END LOOP;

  -- Tamper-evident hash: server-built canonical string + secret entry id
  v_hash := encode(extensions.digest(_entry_id::text || ':' || v_canonical || ':' || v_correct::text, 'sha256'), 'hex');

  UPDATE public.arena_entries
    SET status = 'submitted',
        score = v_correct,
        accuracy = CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 100, 2) ELSE 0 END,
        time_taken_seconds = v_server_time,
        submitted_at = now(),
        submission_hash = v_hash
    WHERE id = _entry_id;

  -- In-app notification: submission accepted
  INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (v_user,
      'Submission received 🎯',
      'You scored ' || v_correct || '/' || v_total || ' in "' || v_ch.title ||
      '". Leaderboard updates live — rewards drop when the challenge ends.',
      'success', '/arena/' || v_ch.id::text || '/leaderboard');

  RETURN jsonb_build_object('ok', true, 'score', v_correct, 'total', v_total,
    'accuracy', CASE WHEN v_total > 0 THEN ROUND((v_correct::numeric / v_total::numeric) * 100, 2) ELSE 0 END,
    'time_taken_seconds', v_server_time,
    'submission_hash', v_hash);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_submit_entry(uuid, jsonb, integer) TO authenticated;

-- Anti-cheat client event logger -------------------------------------------
CREATE OR REPLACE FUNCTION public.arena_log_anti_cheat_event(_entry_id uuid, _kind text, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_entry public.arena_entries%ROWTYPE;
  v_weight int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  SELECT * INTO v_entry FROM public.arena_entries WHERE id = _entry_id;
  IF NOT FOUND OR v_entry.user_id <> v_user THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  INSERT INTO public.arena_anti_cheat_events(entry_id, user_id, kind, meta)
    VALUES (_entry_id, v_user, _kind, COALESCE(_meta, '{}'::jsonb));

  v_weight := CASE _kind
    WHEN 'tab_blur' THEN 1
    WHEN 'window_blur' THEN 1
    WHEN 'visibility_hidden' THEN 2
    WHEN 'paste' THEN 3
    WHEN 'devtools_open' THEN 5
    WHEN 'context_menu' THEN 1
    ELSE 1 END;

  UPDATE public.arena_entries
    SET suspicious_score = suspicious_score + v_weight,
        anti_cheat_flags = anti_cheat_flags ||
          jsonb_build_object(_kind, COALESCE((anti_cheat_flags->>_kind)::int,0) + 1)
    WHERE id = _entry_id;

  RETURN jsonb_build_object('ok', true);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_log_anti_cheat_event(uuid, text, jsonb) TO authenticated;

-- Notification: broadcast on challenge going live --------------------------
CREATE OR REPLACE FUNCTION public.arena_notify_live()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only broadcast for featured challenges; avoids spamming on every daily challenge
  IF NEW.status = 'live' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'live') AND NEW.featured = true THEN
    INSERT INTO public.notifications(user_id, title, message, type, link)
    SELECT p.id,
           '🏆 Challenge Arena: ' || NEW.title || ' is LIVE',
           COALESCE(NEW.description, 'Compete for a ' || NEW.prize_pool_tokens || '-token prize pool. Tap to enter.'),
           'info',
           '/arena/' || NEW.id::text
    FROM public.profiles p
    WHERE COALESCE(p.daily_reminder_opt_out, false) = false;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_arena_notify_live ON public.arena_challenges;
CREATE TRIGGER trg_arena_notify_live
  AFTER INSERT OR UPDATE OF status ON public.arena_challenges
  FOR EACH ROW EXECUTE FUNCTION public.arena_notify_live();

-- Notification + email on reward issued ------------------------------------
CREATE OR REPLACE FUNCTION public.arena_notify_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ch public.arena_challenges%ROWTYPE;
  v_title text;
  v_msg text;
BEGIN
  SELECT * INTO v_ch FROM public.arena_challenges WHERE id = NEW.challenge_id;
  v_title := CASE
    WHEN NEW.rank = 1 THEN '🥇 You won the Arena!'
    WHEN NEW.rank = 2 THEN '🥈 2nd place — well played!'
    WHEN NEW.rank = 3 THEN '🥉 3rd place — podium finish!'
    ELSE 'Arena results are in' END;
  v_msg := CASE WHEN NEW.tokens_awarded > 0
    THEN 'You placed #' || NEW.rank || ' in "' || v_ch.title || '" and won ' || NEW.tokens_awarded || ' tokens. They are already in your wallet.'
    ELSE 'You placed #' || NEW.rank || ' in "' || v_ch.title || '". Great effort — bigger prizes next round.' END;

  INSERT INTO public.notifications(user_id, title, message, type, link)
    VALUES (NEW.user_id, v_title, v_msg, 'success', '/arena/' || NEW.challenge_id::text || '/leaderboard');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_arena_notify_reward ON public.arena_rewards;
CREATE TRIGGER trg_arena_notify_reward
  AFTER INSERT ON public.arena_rewards
  FOR EACH ROW EXECUTE FUNCTION public.arena_notify_reward();

-- Email on settle: fire-and-forget call to arena-notify edge function ------
CREATE OR REPLACE FUNCTION public.arena_email_on_settle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'settled' AND OLD.status IS DISTINCT FROM 'settled' THEN
    BEGIN
      PERFORM extensions.http_post(
        url := 'https://vfbxyldwtjwwecpbgezu.supabase.co/functions/v1/arena-notify',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('event', 'settled', 'challenge_id', NEW.id)
      );
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_arena_email_settle ON public.arena_challenges;
CREATE TRIGGER trg_arena_email_settle
  AFTER UPDATE OF status ON public.arena_challenges
  FOR EACH ROW EXECUTE FUNCTION public.arena_email_on_settle();

-- Admin broadcast to entrants ----------------------------------------------
CREATE OR REPLACE FUNCTION public.arena_broadcast_to_entrants(_challenge_id uuid, _title text, _message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;
  INSERT INTO public.notifications(user_id, title, message, type, link)
  SELECT user_id, _title, _message, 'info', '/arena/' || _challenge_id::text
  FROM public.arena_entries WHERE challenge_id = _challenge_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'sent', v_count);
END; $$;
GRANT EXECUTE ON FUNCTION public.arena_broadcast_to_entrants(uuid, text, text) TO authenticated;
