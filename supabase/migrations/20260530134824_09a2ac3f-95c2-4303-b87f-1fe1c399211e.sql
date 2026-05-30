-- Remove the 5/day free quota: every AI action now costs 1 token.
CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  bal int;
  new_bal int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unauthorized');
  END IF;

  SELECT ai_token_balance INTO bal
    FROM public.profiles WHERE id = uid FOR UPDATE;

  IF bal IS NULL THEN bal := 0; END IF;

  IF bal >= 1 THEN
    new_bal := bal - 1;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    INSERT INTO public.wallet_transactions(user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'spend', -1, _kind, new_bal);
    RETURN jsonb_build_object('allowed', true, 'source', 'token',
                              'balance', new_bal, 'free_left', 0);
  END IF;

  RETURN jsonb_build_object('allowed', false, 'balance', 0, 'free_left', 0);
END;
$function$;