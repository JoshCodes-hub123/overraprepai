-- Restrict meeting_url column access on tutor_session_slots so only the
-- SECURITY DEFINER get_session_meeting_url RPC (which checks booking/host)
-- can return it. Direct SELECT on the column is revoked for client roles.
REVOKE SELECT (meeting_url) ON public.tutor_session_slots FROM anon, authenticated;
-- service_role keeps full access via GRANT ALL elsewhere; ensure it stays usable.
GRANT SELECT (meeting_url) ON public.tutor_session_slots TO service_role;
-- Tutors still need to UPDATE/INSERT the column on their own rows.
GRANT INSERT (meeting_url), UPDATE (meeting_url) ON public.tutor_session_slots TO authenticated;