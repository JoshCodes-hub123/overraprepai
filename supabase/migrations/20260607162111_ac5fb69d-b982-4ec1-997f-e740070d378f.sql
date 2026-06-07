-- Fix sender visibility gap for token_transfers
CREATE POLICY "Senders can view their own outgoing transfers"
ON public.token_transfers
FOR SELECT
USING (auth.uid() = from_user);

-- Set fixed search_path on email queue helper functions to satisfy linter
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- Defense-in-depth: revoke direct column access to applicant PII on tutor_applications
-- from the authenticated role so any future broad policy cannot accidentally leak it.
-- RLS still governs row access; admins read PII via SECURITY DEFINER paths.
REVOKE SELECT (email, phone) ON public.tutor_applications FROM authenticated;