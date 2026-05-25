
-- 1. user_roles: only authenticated can probe tutor status
DROP POLICY IF EXISTS "Anyone can check tutor role" ON public.user_roles;
CREATE POLICY "Authenticated can check tutor role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (role = 'tutor'::app_role);

-- 2. platform_settings: authenticated read only
DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Authenticated can view platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (true);

-- 3. profiles: revoke PII columns from anon/authenticated; keep self-read via RPC
REVOKE SELECT (email, phone, matric_no, date_of_birth, current_cgpa,
               aspiring_cgpa, gender, state_of_origin, referred_by,
               tutor_match_prefs, academic_metadata)
  ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- 4. token_transfers: hide to_email from sender
DROP POLICY IF EXISTS "Users see own transfers" ON public.token_transfers;
CREATE POLICY "Recipients and admins see transfer email"
  ON public.token_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = to_user OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Senders see own transfers without recipient email"
  ON public.token_transfers FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user);
REVOKE SELECT (to_email) ON public.token_transfers FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_sent_transfers()
RETURNS TABLE (id uuid, from_user uuid, to_user uuid, amount integer, created_at timestamptz, to_email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.id, t.from_user, t.to_user, t.amount, t.created_at,
         CASE WHEN t.to_user = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role)
              THEN t.to_email ELSE NULL END AS to_email
  FROM public.token_transfers t
  WHERE t.from_user = auth.uid() OR t.to_user = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_sent_transfers() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_sent_transfers() TO authenticated;
