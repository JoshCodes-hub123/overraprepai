
CREATE OR REPLACE FUNCTION public.admin_list_users(
  _search text DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  university text,
  department text,
  academic_path text,
  ai_token_balance int,
  created_at timestamptz,
  last_seen_at timestamptz,
  total_tokens_bought bigint,
  total_amount_spent_ngn numeric,
  purchase_count bigint,
  total_users bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  q := COALESCE(NULLIF(trim(_search), ''), NULL);

  RETURN QUERY
  WITH manual AS (
    SELECT user_id,
           COALESCE(SUM(tokens_requested), 0)::bigint AS tokens,
           COALESCE(SUM(amount_paid), 0)::numeric AS amount,
           COUNT(*)::bigint AS cnt
    FROM public.token_purchase_requests
    WHERE status = 'approved'
    GROUP BY user_id
  ),
  paddle AS (
    -- amount_cents is in minor units; treat as NGN kobo (NGN * 100).
    SELECT user_id,
           COALESCE(SUM(tokens_credited), 0)::bigint AS tokens,
           COALESCE(SUM(amount_cents) / 100.0, 0)::numeric AS amount,
           COUNT(*)::bigint AS cnt
    FROM public.token_purchases
    WHERE status IN ('completed', 'paid', 'succeeded')
    GROUP BY user_id
  ),
  combined AS (
    SELECT
      p.id,
      p.full_name,
      p.email,
      p.phone,
      p.university,
      p.department,
      p.academic_path::text AS academic_path,
      COALESCE(p.ai_token_balance, 0) AS ai_token_balance,
      p.created_at,
      p.last_seen_at,
      COALESCE(m.tokens, 0) + COALESCE(pa.tokens, 0) AS total_tokens_bought,
      COALESCE(m.amount, 0) + COALESCE(pa.amount, 0) AS total_amount_spent_ngn,
      COALESCE(m.cnt, 0) + COALESCE(pa.cnt, 0) AS purchase_count
    FROM public.profiles p
    LEFT JOIN manual m ON m.user_id = p.id
    LEFT JOIN paddle pa ON pa.user_id = p.id
    WHERE q IS NULL
       OR p.full_name ILIKE '%' || q || '%'
       OR p.email ILIKE '%' || q || '%'
       OR p.phone ILIKE '%' || q || '%'
       OR p.university ILIKE '%' || q || '%'
       OR p.department ILIKE '%' || q || '%'
  ),
  total AS (
    SELECT COUNT(*)::bigint AS total_users FROM combined
  )
  SELECT c.id,
         c.full_name,
         c.email,
         c.phone,
         c.university,
         c.department,
         c.academic_path,
         c.ai_token_balance,
         c.created_at,
         c.last_seen_at,
         c.total_tokens_bought,
         c.total_amount_spent_ngn,
         c.purchase_count,
         t.total_users
  FROM combined c CROSS JOIN total t
  ORDER BY c.total_amount_spent_ngn DESC NULLS LAST, c.created_at DESC
  LIMIT GREATEST(_limit, 1)
  OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int, int) TO authenticated;
