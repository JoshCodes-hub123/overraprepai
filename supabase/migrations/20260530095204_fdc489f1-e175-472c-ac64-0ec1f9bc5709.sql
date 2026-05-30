
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_token_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_free_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_free_reset_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date + INTERVAL '1 day';

-- 2. Wallet transactions table
DO $$ BEGIN
  CREATE TYPE public.wallet_txn_kind AS ENUM ('topup','spend','admin_credit','admin_debit','refund','free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind public.wallet_txn_kind NOT NULL,
  tokens integer NOT NULL DEFAULT 0,
  naira_amount integer,
  action_kind text,
  ref_id text,
  reason text,
  balance_after integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_txn_ref_kind ON public.wallet_transactions(ref_id, kind) WHERE ref_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user_created ON public.wallet_transactions(user_id, created_at DESC);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wallet_txn_read_own_or_admin" ON public.wallet_transactions;
CREATE POLICY "wallet_txn_read_own_or_admin" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Consume token RPC
CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  light_kinds text[] := ARRAY['quiz_attempt','ai_explanation','tutor_chat'];
  daily_limit int := 5;
  is_light boolean := _kind = ANY(light_kinds);
  today_lagos date := (now() AT TIME ZONE 'Africa/Lagos')::date;
  reset_day date;
  free_used int;
  bal int;
  new_bal int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'error', 'unauthorized');
  END IF;

  SELECT daily_free_used, ai_token_balance, (daily_free_reset_at AT TIME ZONE 'Africa/Lagos')::date
    INTO free_used, bal, reset_day
  FROM public.profiles WHERE id = uid FOR UPDATE;

  -- Lazy daily reset
  IF reset_day IS NULL OR reset_day <= today_lagos THEN
    free_used := 0;
    UPDATE public.profiles
      SET daily_free_used = 0,
          daily_free_reset_at = (today_lagos + INTERVAL '1 day')::timestamptz
      WHERE id = uid;
  END IF;

  -- Light action with free quota
  IF is_light AND free_used < daily_limit THEN
    UPDATE public.profiles SET daily_free_used = daily_free_used + 1 WHERE id = uid
      RETURNING daily_free_used INTO free_used;
    INSERT INTO public.wallet_transactions(user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'free', 0, _kind, bal);
    RETURN jsonb_build_object(
      'allowed', true, 'source', 'free',
      'balance', bal, 'free_left', daily_limit - free_used
    );
  END IF;

  -- Otherwise spend a token
  IF bal >= 1 THEN
    new_bal := bal - 1;
    UPDATE public.profiles SET ai_token_balance = new_bal WHERE id = uid;
    INSERT INTO public.wallet_transactions(user_id, kind, tokens, action_kind, balance_after)
      VALUES (uid, 'spend', -1, _kind, new_bal);
    RETURN jsonb_build_object(
      'allowed', true, 'source', 'token',
      'balance', new_bal, 'free_left', GREATEST(daily_limit - free_used, 0)
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', false, 'balance', 0,
    'free_left', GREATEST(daily_limit - free_used, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_token(text) TO authenticated;

-- 4. Credit wallet (called by webhook). Idempotent on (ref_id, kind).
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid,
  _tokens integer,
  _naira_amount integer,
  _ref_id text,
  _kind public.wallet_txn_kind DEFAULT 'topup'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing uuid;
  new_bal int;
BEGIN
  IF _tokens <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'tokens must be > 0');
  END IF;

  IF _ref_id IS NOT NULL THEN
    SELECT id INTO existing FROM public.wallet_transactions
      WHERE ref_id = _ref_id AND kind = _kind LIMIT 1;
    IF existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true);
    END IF;
  END IF;

  UPDATE public.profiles
    SET ai_token_balance = ai_token_balance + _tokens
    WHERE id = _user_id
    RETURNING ai_token_balance INTO new_bal;

  IF new_bal IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile not found');
  END IF;

  INSERT INTO public.wallet_transactions(user_id, kind, tokens, naira_amount, ref_id, balance_after)
    VALUES (_user_id, _kind, _tokens, _naira_amount, _ref_id, new_bal);

  RETURN jsonb_build_object('ok', true, 'balance', new_bal);
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid, integer, integer, text, public.wallet_txn_kind) TO service_role;

-- 5. Admin manual adjust
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
  _user_id uuid,
  _delta_tokens integer,
  _reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  new_bal int;
  kind public.wallet_txn_kind;
BEGIN
  IF caller IS NULL OR NOT public.has_role(caller, 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF _delta_tokens = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'delta must be non-zero');
  END IF;

  UPDATE public.profiles
    SET ai_token_balance = GREATEST(ai_token_balance + _delta_tokens, 0)
    WHERE id = _user_id
    RETURNING ai_token_balance INTO new_bal;

  IF new_bal IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'profile not found');
  END IF;

  kind := CASE WHEN _delta_tokens > 0 THEN 'admin_credit'::public.wallet_txn_kind
               ELSE 'admin_debit'::public.wallet_txn_kind END;

  INSERT INTO public.wallet_transactions(user_id, kind, tokens, reason, balance_after)
    VALUES (_user_id, kind, _delta_tokens, _reason, new_bal);

  -- Best-effort audit log (table may or may not exist depending on env)
  BEGIN
    INSERT INTO public.audit_logs(actor_user_id, action, target_user_id, payload)
      VALUES (caller, 'wallet_adjust', _user_id,
              jsonb_build_object('delta', _delta_tokens, 'reason', _reason, 'new_balance', new_bal));
  EXCEPTION WHEN undefined_table OR undefined_column THEN NULL; END;

  RETURN jsonb_build_object('ok', true, 'balance', new_bal);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, integer, text) TO authenticated;

-- 6. Hard cutover: end all active Pro subscriptions; clear trial flags.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_subscriptions') THEN
    EXECUTE 'UPDATE public.user_subscriptions SET status = ''ended'' WHERE status = ''active''';
  END IF;
END $$;

UPDATE public.profiles
  SET trial_ends_at = NULL
  WHERE trial_ends_at IS NOT NULL;
