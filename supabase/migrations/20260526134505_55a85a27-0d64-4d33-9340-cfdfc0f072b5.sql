
-- 1) Profiles: revoke sensitive columns from anon/authenticated.
--    Owner access is preserved via get_my_profile() (SECURITY DEFINER).
REVOKE SELECT (email, phone, date_of_birth, gender, matric_no, state_of_origin,
               current_cgpa, aspiring_cgpa, referral_code, referred_by)
  ON public.profiles FROM authenticated;
REVOKE SELECT (email, phone, date_of_birth, gender, matric_no, state_of_origin,
               current_cgpa, aspiring_cgpa, referral_code, referred_by)
  ON public.profiles FROM anon;

-- 2) Lecture notes storage: require authentication for downloads.
DROP POLICY IF EXISTS "Anyone can view lecture-notes files" ON storage.objects;
CREATE POLICY "Authenticated can view lecture-notes files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'lecture-notes');

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from anon.
REVOKE EXECUTE ON FUNCTION public.create_course_discussion FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_course_discussion FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_chat_mentions FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_ai_tutor_thread FROM anon;
