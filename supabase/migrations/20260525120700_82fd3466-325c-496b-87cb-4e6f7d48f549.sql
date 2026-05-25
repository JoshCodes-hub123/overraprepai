
-- 1. Revoke column-level SELECT on profiles.email from anon/authenticated.
-- Owner reads happen via get_my_profile() SECURITY DEFINER RPC.
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- 2. Revoke column-level SELECT on tutor_session_slots.meeting_url.
-- Access is mediated by get_session_meeting_url(_slot_id) SECURITY DEFINER RPC.
REVOKE SELECT (meeting_url) ON public.tutor_session_slots FROM anon, authenticated;

-- 3. Revoke column-level SELECT on school_students.parent_phone / parent_email.
REVOKE SELECT (parent_phone, parent_email) ON public.school_students FROM anon, authenticated;

-- Helper to fetch parent contact for an authorized caller (owner/admin of the school, or platform admin)
CREATE OR REPLACE FUNCTION public.get_student_parent_contact(_student_id uuid)
RETURNS TABLE(parent_phone text, parent_email text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _school uuid;
BEGIN
  SELECT school_id INTO _school FROM public.school_students WHERE id = _student_id;
  IF _school IS NULL THEN
    RETURN;
  END IF;
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.is_school_member(_school, 'owner')
     OR public.is_school_member(_school, 'admin') THEN
    RETURN QUERY
      SELECT s.parent_phone, s.parent_email
      FROM public.school_students s
      WHERE s.id = _student_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_student_parent_contact(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_student_parent_contact(uuid) TO authenticated;
