
DROP FUNCTION IF EXISTS public.is_pro(uuid) CASCADE;

INSERT INTO public.subscription_plans (id, name, price_cents, currency, interval, features, is_active)
VALUES
  ('pro_monthly', 'Pro Monthly', 200000, 'NGN', 'month',
    '{"description":"Unlimited AI everything for 30 days","duration_days":30,"perks":["Unlimited AI explanations","Unlimited audio lessons","Unlimited AI study packs","Pro badge","Priority support"]}'::jsonb, true),
  ('pro_semester', 'Pro Semester', 500000, 'NGN', 'semester',
    '{"description":"Best value — Pro access for a full semester (120 days)","duration_days":120,"perks":["Everything in Pro Monthly","Save 17%","Semester-long access","Pro badge"]}'::jsonb, true)
ON CONFLICT (id) DO UPDATE
SET name=EXCLUDED.name, price_cents=EXCLUDED.price_cents, currency=EXCLUDED.currency,
    interval=EXCLUDED.interval, features=EXCLUDED.features, is_active=true;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_ai_tokens_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_ai_tokens_reset_at timestamptz NOT NULL DEFAULT (now() + interval '1 day');

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id text NOT NULL,
  provider text NOT NULL DEFAULT 'paystack',
  reference text NOT NULL UNIQUE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  raw_payload jsonb,
  activated boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own transactions" ON public.payment_transactions;
CREATE POLICY "Users read own transactions" ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users create own transactions" ON public.payment_transactions;
CREATE POLICY "Users create own transactions" ON public.payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON public.payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subscriptions
    WHERE user_id = _user_id AND status = 'active' AND plan_id <> 'free'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text DEFAULT 'generic', _daily_limit integer DEFAULT 10)
RETURNS TABLE(allowed boolean, used integer, remaining integer, is_pro boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  pro boolean;
  cur_used integer;
  cur_reset timestamptz;
BEGIN
  IF uid IS NULL THEN RETURN QUERY SELECT false, 0, 0, false; RETURN; END IF;
  pro := public.is_pro(uid);
  IF pro THEN RETURN QUERY SELECT true, 0, 9999, true; RETURN; END IF;

  SELECT daily_ai_tokens_used, daily_ai_tokens_reset_at INTO cur_used, cur_reset
  FROM public.profiles WHERE id = uid FOR UPDATE;

  IF cur_reset IS NULL OR now() >= cur_reset THEN
    cur_used := 0; cur_reset := now() + interval '1 day';
  END IF;

  IF cur_used >= _daily_limit THEN
    UPDATE public.profiles SET daily_ai_tokens_used = cur_used, daily_ai_tokens_reset_at = cur_reset WHERE id = uid;
    RETURN QUERY SELECT false, cur_used, 0, false; RETURN;
  END IF;

  cur_used := cur_used + 1;
  UPDATE public.profiles SET daily_ai_tokens_used = cur_used, daily_ai_tokens_reset_at = cur_reset WHERE id = uid;
  RETURN QUERY SELECT true, cur_used, GREATEST(_daily_limit - cur_used, 0), false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_ai_token(text, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_pro_subscription(
  _user_id uuid, _plan_id text, _days integer,
  _source text DEFAULT 'paystack', _reference text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub_id uuid; new_expiry timestamptz;
BEGIN
  IF _reference IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.payment_transactions WHERE reference = _reference AND activated = true
  ) THEN
    SELECT id INTO sub_id FROM public.user_subscriptions
      WHERE user_id = _user_id AND status = 'active' ORDER BY started_at DESC LIMIT 1;
    RETURN sub_id;
  END IF;

  SELECT GREATEST(now(), COALESCE(expires_at, now())) + (_days || ' days')::interval INTO new_expiry
  FROM public.user_subscriptions
  WHERE user_id = _user_id AND status = 'active' AND plan_id <> 'free'
  ORDER BY started_at DESC LIMIT 1;

  IF new_expiry IS NULL THEN new_expiry := now() + (_days || ' days')::interval; END IF;

  UPDATE public.user_subscriptions SET status = 'replaced', updated_at = now()
    WHERE user_id = _user_id AND status = 'active';

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
  VALUES (_user_id, _plan_id, 'active', now(), new_expiry) RETURNING id INTO sub_id;

  IF _reference IS NOT NULL THEN
    UPDATE public.payment_transactions
      SET activated = true, activated_at = now(), status = 'success', updated_at = now()
      WHERE reference = _reference;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, metadata)
  VALUES (_user_id, 'subscription.activated', 'user_subscription', sub_id,
    jsonb_build_object('plan_id', _plan_id, 'days', _days, 'source', _source, 'reference', _reference, 'expires_at', new_expiry));

  RETURN sub_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_pro_subscription(uuid, text, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_change_plan(
  _user_id uuid, _plan_id text, _days integer DEFAULT 30, _reason text DEFAULT 'admin override'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sub_id uuid; caller uuid := auth.uid();
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN RAISE EXCEPTION 'Only admins can change plans'; END IF;

  IF _plan_id = 'free' THEN
    UPDATE public.user_subscriptions SET status = 'cancelled', updated_at = now()
      WHERE user_id = _user_id AND status = 'active';
    INSERT INTO public.audit_logs (user_id, action, target_type, target_id, metadata)
    VALUES (caller, 'admin.plan_downgraded', 'user', _user_id, jsonb_build_object('reason', _reason));
    RETURN NULL;
  END IF;

  sub_id := public.activate_pro_subscription(_user_id, _plan_id, _days, 'admin', NULL);
  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, metadata)
  VALUES (caller, 'admin.plan_changed', 'user', _user_id,
    jsonb_build_object('plan_id', _plan_id, 'days', _days, 'reason', _reason));
  RETURN sub_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_change_plan(uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.on_payment_request_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE days integer;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT COALESCE((features->>'duration_days')::int, 30) INTO days
      FROM public.subscription_plans WHERE id = NEW.plan_id;
    PERFORM public.activate_pro_subscription(
      NEW.user_id, NEW.plan_id, days, 'manual_receipt', 'pr_' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_request_approved ON public.payment_requests;
CREATE TRIGGER trg_payment_request_approved
  AFTER UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_payment_request_approved();
