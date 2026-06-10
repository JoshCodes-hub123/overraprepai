UPDATE public.ai_pricing
SET free_eligible = true
WHERE kind = 'unlock_quiz';

CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  FROM public.profiles WHERE id = uid
  FOR UPDATE;

  reset_date := COALESCE((reset_at AT TIME ZONE 'Africa/Lagos')::date, today_lagos - 1);
  IF reset_date < today_lagos THEN
    used := 0;
    UPDATE public.profiles SET daily_free_used = 0, daily_free_reset_at = now() WHERE id = uid;
  END IF;

  -- A free daily action covers one eligible premium action, even when its wallet price is more than 1 token.
  IF free_ok AND used < 3 THEN
    new_used := used + 1;
    UPDATE public.profiles
      SET daily_free_used = new_used,
          daily_free_reset_at = COALESCE(daily_free_reset_at, now())
      WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'spend', 0, _kind, bal);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'free', 'balance', bal, 'cost', 0, 'free_left', 3 - new_used);
  END IF;

  IF bal >= cost THEN
    new_bal := bal - cost;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'spend', cost, _kind, new_bal);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'token', 'balance', new_bal, 'cost', cost, 'free_left', GREATEST(0, 3 - used));
  END IF;

  RETURN jsonb_build_object('allowed', false, 'balance', bal, 'cost', cost, 'free_left', GREATEST(0, 3 - used), 'reason', 'insufficient');
END;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_quiz(_quiz_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  spend jsonb;
  spent_cost int;
  bal int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.quiz_unlocks WHERE user_id = uid AND quiz_id = _quiz_id) THEN
    SELECT COALESCE(ai_token_balance, 0) INTO bal FROM public.profiles WHERE id = uid;
    RETURN jsonb_build_object('allowed', true, 'already_unlocked', true, 'cost', 0, 'balance', bal);
  END IF;

  spend := public.consume_ai_token('unlock_quiz');

  IF NOT COALESCE((spend->>'allowed')::boolean, false) THEN
    RETURN spend;
  END IF;

  spent_cost := COALESCE((spend->>'cost')::int, 0);
  bal := COALESCE((spend->>'balance')::int, 0);

  INSERT INTO public.quiz_unlocks (user_id, quiz_id, cost_paid)
  VALUES (uid, _quiz_id, spent_cost)
  ON CONFLICT (user_id, quiz_id) DO NOTHING;

  RETURN spend || jsonb_build_object('allowed', true, 'quiz_id', _quiz_id, 'cost', spent_cost, 'balance', bal);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_quiz(uuid) TO authenticated;
GRANT SELECT, INSERT ON public.quiz_unlocks TO authenticated;
GRANT ALL ON public.quiz_unlocks TO service_role;