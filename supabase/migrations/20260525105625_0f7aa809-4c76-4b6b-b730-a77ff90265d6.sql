
-- 1. Profiles: lock down sensitive PII columns via column-level grants
DROP POLICY IF EXISTS "Authenticated can view safe profile fields" ON public.profiles;

CREATE POLICY "Authenticated can view profile public fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Revoke sensitive column access from anon and authenticated.
-- Owners still read their own row via SECURITY DEFINER get_my_profile().
-- Admins read via separate admin tooling/SECURITY DEFINER paths.
REVOKE SELECT (phone, date_of_birth, matric_no, gender, state_of_origin, current_cgpa, aspiring_cgpa)
  ON public.profiles FROM anon, authenticated;

-- 2. Tutor session slots: require authentication to view
DROP POLICY IF EXISTS "anyone view open slots" ON public.tutor_session_slots;

CREATE POLICY "authenticated view open slots"
ON public.tutor_session_slots
FOR SELECT
TO authenticated
USING (true);

-- Hide meeting_url from anon entirely (column grant)
REVOKE SELECT (meeting_url) ON public.tutor_session_slots FROM anon;

-- 3. Token transfers: drop sender-side policy that exposed to_email
DROP POLICY IF EXISTS "Senders see own transfers without recipient email" ON public.token_transfers;
-- Senders read via public.get_my_sent_transfers() which masks to_email.

-- 4. User roles: drop tutor enumeration policy
DROP POLICY IF EXISTS "Authenticated can check tutor role" ON public.user_roles;

-- 5. Weekly leaderboards: require authentication
DROP POLICY IF EXISTS "Leaderboards public read" ON public.weekly_leaderboards;

CREATE POLICY "Leaderboards authenticated read"
ON public.weekly_leaderboards
FOR SELECT
TO authenticated
USING (true);

-- 6. Revoke EXECUTE on internal SECURITY DEFINER helpers from anon
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', fn.proname, fn.args);
  END LOOP;
END $$;
