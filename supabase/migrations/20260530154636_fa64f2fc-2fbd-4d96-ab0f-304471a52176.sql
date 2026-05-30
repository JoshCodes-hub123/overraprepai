-- ============================================================
-- 1. Column-level revoke: hide sensitive PII from authenticated
--    role on the profiles table. SECURITY DEFINER functions
--    (get_my_profile, get_my_wallet, admin_get_user_wallets) and
--    the service_role bypass column grants and continue to work.
-- ============================================================
REVOKE SELECT (
  phone,
  date_of_birth,
  matric_no,
  flw_customer_id,
  ai_token_balance,
  daily_ai_tokens_used,
  daily_free_used,
  daily_free_reset_at,
  trial_ends_at,
  first_purchase_used,
  referred_by
) ON public.profiles FROM authenticated;

REVOKE SELECT (
  phone,
  date_of_birth,
  matric_no,
  flw_customer_id,
  ai_token_balance,
  daily_ai_tokens_used,
  daily_free_used,
  daily_free_reset_at,
  trial_ends_at,
  first_purchase_used,
  referred_by
) ON public.profiles FROM anon;

-- ============================================================
-- 2. Secure RPC: each signed-in user reads their own wallet
--    counters. Replaces direct SELECT in usePremium.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE (
  ai_token_balance integer,
  daily_free_used integer,
  daily_free_reset_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ai_token_balance, 0)::int,
    COALESCE(daily_free_used, 0)::int,
    daily_free_reset_at
  FROM public.profiles
  WHERE id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_wallet() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;

-- ============================================================
-- 3. Secure admin RPC: list wallet balances for given users.
--    Used by the admin payment-requests page. Admin-gated.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_user_wallets(_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  ai_token_balance integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.full_name, p.email, COALESCE(p.ai_token_balance, 0)::int
    FROM public.profiles p
    WHERE p.id = ANY(_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_user_wallets(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_user_wallets(uuid[]) TO authenticated;