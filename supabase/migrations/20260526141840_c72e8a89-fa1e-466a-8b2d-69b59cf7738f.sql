
-- Make lecture-notes bucket private (authenticated SELECT policy already exists)
UPDATE storage.buckets SET public = false WHERE id = 'lecture-notes';

-- Revoke EXECUTE from PUBLIC and anon on SECURITY DEFINER functions that should be auth-only
REVOKE EXECUTE ON FUNCTION public.create_course_discussion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_course_discussion() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_chat_mentions() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.touch_ai_tutor_thread() FROM PUBLIC, anon;
