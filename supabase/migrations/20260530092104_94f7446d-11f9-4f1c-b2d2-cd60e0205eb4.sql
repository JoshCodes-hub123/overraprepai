
-- 1) New profile columns: trial window + first-purchase flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_purchase_used boolean NOT NULL DEFAULT false;

-- 2) Trial-aware is_pro (returns true during active subscription OR trial window)
CREATE OR REPLACE FUNCTION public.is_pro(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.user_subscriptions
      WHERE user_id = _user_id AND status = 'active' AND plan_id <> 'free'
        AND (expires_at IS NULL OR expires_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND trial_ends_at IS NOT NULL AND trial_ends_at > now()
    );
$$;

-- 3) Lower default daily credit limit to 5 (callers may still override)
CREATE OR REPLACE FUNCTION public.consume_ai_token(_kind text DEFAULT 'generic'::text, _daily_limit integer DEFAULT 5)
RETURNS TABLE(allowed boolean, used integer, remaining integer, is_pro boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
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

-- 4) Backfill 2-day trial for every existing user that has no Pro and no trial yet
UPDATE public.profiles p
  SET trial_ends_at = now() + interval '2 days'
WHERE p.trial_ends_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_subscriptions s
    WHERE s.user_id = p.id AND s.status = 'active' AND s.plan_id <> 'free'
  );

-- 5) Signup trigger — give every new profile a 2-day trial automatically
CREATE OR REPLACE FUNCTION public.grant_signup_trial()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := now() + interval '2 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_signup_trial ON public.profiles;
CREATE TRIGGER trg_grant_signup_trial
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.grant_signup_trial();

-- 6) Admin RPC: extend Pro by N days, audit-logged
CREATE OR REPLACE FUNCTION public.admin_extend_pro(_user_id uuid, _days integer, _reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE caller uuid := auth.uid(); sub_id uuid;
BEGIN
  IF NOT public.has_role(caller, 'admin') THEN
    RAISE EXCEPTION 'Only admins can extend Pro subscriptions';
  END IF;
  IF _days IS NULL OR _days <= 0 THEN
    RAISE EXCEPTION 'Days must be positive';
  END IF;
  sub_id := public.activate_pro_subscription(_user_id, 'pro_monthly', _days, 'admin_grant', NULL);
  INSERT INTO public.audit_logs (user_id, action, target_type, target_id, metadata)
  VALUES (caller, 'subscription.admin_extend', 'user_subscription', sub_id,
    jsonb_build_object('target_user', _user_id, 'days', _days, 'reason', _reason));
  RETURN sub_id;
END;
$$;

-- 7) Daily AI credit limit is "5" — make sure the canonical plan row reflects that
UPDATE public.subscription_plans
   SET features = features || jsonb_build_object('daily_free_credits', 5)
 WHERE id = 'pro_monthly';
