-- Revoke column-level SELECT on meeting_url so it isn't returned by general SELECT * queries
REVOKE SELECT (meeting_url) ON public.tutor_session_slots FROM anon, authenticated;

-- Provide a secure accessor for the meeting URL
CREATE OR REPLACE FUNCTION public.get_session_meeting_url(_slot_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _tutor uuid;
BEGIN
  SELECT meeting_url, tutor_id INTO _url, _tutor
  FROM public.tutor_session_slots
  WHERE id = _slot_id;

  IF _url IS NULL THEN
    RETURN NULL;
  END IF;

  IF auth.uid() = _tutor THEN
    RETURN _url;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.session_bookings
    WHERE slot_id = _slot_id
      AND student_id = auth.uid()
      AND status = 'confirmed'
  ) THEN
    RETURN _url;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_session_meeting_url(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_session_meeting_url(uuid) TO authenticated;