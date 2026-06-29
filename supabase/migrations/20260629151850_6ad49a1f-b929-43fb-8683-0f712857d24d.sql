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
  daily_limit int := 2;
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

  IF free_ok AND used < daily_limit THEN
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
    RETURN jsonb_build_object('allowed', true, 'source', 'free', 'balance', bal, 'cost', 0, 'free_left', daily_limit - new_used);
  END IF;

  IF bal >= cost THEN
    new_bal := bal - cost;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'spend', cost, _kind, new_bal);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'token', 'balance', new_bal, 'cost', cost, 'free_left', GREATEST(0, daily_limit - used));
  END IF;

  RETURN jsonb_build_object('allowed', false, 'balance', bal, 'cost', cost, 'free_left', GREATEST(0, daily_limit - used), 'reason', 'insufficient');
END;
$function$;