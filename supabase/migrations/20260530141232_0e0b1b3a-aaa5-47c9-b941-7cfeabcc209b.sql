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
  new_bal int;
  new_used int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'balance', 0, 'free_left', 0, 'reason', 'unauthenticated');
  END IF;

  SELECT COALESCE(ai_token_balance, 0), COALESCE(daily_free_used, 0), daily_free_reset_at
    INTO bal, used, reset_at
  FROM public.profiles WHERE id = uid;

  reset_date := COALESCE((reset_at AT TIME ZONE 'Africa/Lagos')::date, today_lagos - 1);
  IF reset_date < today_lagos THEN
    used := 0;
    UPDATE public.profiles SET daily_free_used = 0, daily_free_reset_at = now() WHERE id = uid;
  END IF;

  -- Free quota first (3/day)
  IF used < 3 THEN
    new_used := used + 1;
    UPDATE public.profiles SET daily_free_used = new_used, daily_free_reset_at = COALESCE(daily_free_reset_at, now()) WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind)
      VALUES (uid, 'spend', 0, _kind);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'free', 'balance', bal, 'free_left', 3 - new_used);
  END IF;

  -- Then wallet tokens
  IF bal >= 1 THEN
    new_bal := bal - 1;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    BEGIN
      INSERT INTO public.wallet_transactions (user_id, kind, tokens, action_kind)
      VALUES (uid, 'spend', 1, _kind);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    RETURN jsonb_build_object('allowed', true, 'source', 'token', 'balance', new_bal, 'free_left', 0);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'balance', 0, 'free_left', 0);
END;
$$;