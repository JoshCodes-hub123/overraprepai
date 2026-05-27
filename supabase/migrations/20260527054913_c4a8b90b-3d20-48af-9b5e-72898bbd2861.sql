
DROP POLICY IF EXISTS "Tutor profiles publicly readable" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_tutor_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  avatar_url text,
  profile_image_url text,
  department text,
  tutor_code text,
  bio text,
  university text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.avatar_url, p.profile_image_url,
         p.department, p.tutor_code, p.bio, p.university
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'tutor'::app_role
$$;

REVOKE ALL ON FUNCTION public.get_public_tutor_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tutor_directory() TO anon, authenticated;

REVOKE INSERT ON public.user_badges FROM anon, authenticated;
REVOKE INSERT ON public.user_achievements FROM anon, authenticated;
GRANT INSERT ON public.user_badges TO service_role;
GRANT INSERT ON public.user_achievements TO service_role;
