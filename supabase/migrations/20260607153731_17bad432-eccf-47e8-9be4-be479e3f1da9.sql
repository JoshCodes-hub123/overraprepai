-- Lock down sensitive profile columns from broad authenticated access.
-- The "Tutor rows readable for public view" policy exposes every column of tutor rows
-- (including email/phone) to all authenticated users. Revoke column-level SELECT so
-- those columns can only be reached via SECURITY DEFINER RPCs (get_my_profile, admin
-- contact lookup) regardless of which RLS policy matches.

REVOKE SELECT (email, phone) ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone) ON public.profiles FROM anon;

-- Admin-only RPC to fetch contact details for a set of users (used by admin dashboards
-- that previously selected profiles.email directly).
CREATE OR REPLACE FUNCTION public.admin_get_profile_contacts(_ids uuid[])
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  phone text,
  department text,
  tutor_code text,
  university text,
  created_at timestamptz
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
  SELECT p.id, p.full_name, p.email, p.phone, p.department, p.tutor_code, p.university, p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_profile_contacts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_profile_contacts(uuid[]) TO authenticated;