
-- 1. ai_tutor_messages: only allow inserting role='user'
DROP POLICY IF EXISTS "Users insert own ai tutor messages" ON public.ai_tutor_messages;
CREATE POLICY "Users insert own ai tutor messages"
  ON public.ai_tutor_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND role = 'user');

-- 2. course_chat_messages: block client-side is_ai = true
DROP POLICY IF EXISTS "Participants can post" ON public.course_chat_messages;
CREATE POLICY "Participants can post"
  ON public.course_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND is_course_participant(course_id, auth.uid())
    AND is_ai = false
  );

-- 3. Tutor profile PII exposure: drop broad policy and expose safe view
DROP POLICY IF EXISTS "Authenticated users can view tutor profiles" ON public.profiles;

CREATE OR REPLACE VIEW public.public_tutor_profiles
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.profile_image_url,
  p.tutor_code,
  p.tutor_specialization,
  p.bio,
  p.university,
  p.faculty,
  p.department
FROM public.profiles p
WHERE EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.id AND ur.role = 'tutor'::app_role
);

-- The view needs a permissive policy on profiles for tutor rows, limited to safe columns via the view.
-- Since security_invoker uses the caller's RLS, we add a narrow policy that allows reading tutor rows
-- only through column-safe paths. Simpler: add a policy permitting SELECT of tutor rows for authenticated.
CREATE POLICY "Tutor rows readable for public view"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.id AND ur.role = 'tutor'::app_role
    )
  );

-- Note: this still allows direct table reads of tutor rows. To enforce column safety,
-- revoke direct table SELECT from authenticated and let them go through the view + RPCs.
-- However self-reads use a separate "Users view own profile" policy that needs full column access,
-- and existing code reads safe columns from profiles directly. We instead REVOKE select on the
-- truly-sensitive columns from authenticated so even tutor-row reads cannot expose them.
REVOKE SELECT (phone, date_of_birth, flw_customer_id, ai_token_balance,
               daily_free_used, daily_ai_tokens_used, matric_no, referred_by,
               trial_ends_at, first_purchase_used)
  ON public.profiles FROM authenticated, anon;

-- Re-grant those sensitive columns via a SECURITY DEFINER function for self-access only.
CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile()
RETURNS TABLE (
  phone text,
  date_of_birth date,
  flw_customer_id text,
  ai_token_balance integer,
  daily_free_used integer,
  daily_ai_tokens_used integer,
  matric_no text,
  referred_by uuid,
  trial_ends_at timestamptz,
  first_purchase_used boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone, date_of_birth, flw_customer_id, ai_token_balance,
         daily_free_used, daily_ai_tokens_used, matric_no, referred_by,
         trial_ends_at, first_purchase_used
  FROM public.profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile() TO authenticated;

-- Grant the public view
GRANT SELECT ON public.public_tutor_profiles TO authenticated, anon;
