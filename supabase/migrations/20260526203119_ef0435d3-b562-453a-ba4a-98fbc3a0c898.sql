
-- 1) Fix is_course_participant to check real enrollment / ownership / admin
CREATE OR REPLACE FUNCTION public.is_course_participant(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = _course_id AND c.created_by = _user_id)
    OR EXISTS (SELECT 1 FROM public.student_courses sc WHERE sc.course_id = _course_id AND sc.student_id = _user_id)
    OR EXISTS (SELECT 1 FROM public.quizzes q WHERE q.course_id = _course_id AND q.tutor_id = _user_id)
    OR public.has_role(_user_id, 'admin'::app_role)
  );
$$;

-- 2) Restrict sensitive columns on profiles
DROP POLICY IF EXISTS "Authenticated can view profile public fields" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, full_name, avatar_url, profile_image_url, cover_photo_url,
  bio, university, faculty, department, level, academic_path,
  tutor_code, tutor_specialization, tutor_status,
  linkedin_handle, x_handle, study_interests, hobbies,
  referral_code, referred_by, onboarding_completed,
  academic_metadata, tutor_match_prefs,
  created_at, updated_at
) ON public.profiles TO anon, authenticated;

-- Re-create the broad SELECT policy so non-sensitive columns remain visible
CREATE POLICY "Authenticated can view profile public fields"
ON public.profiles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anon can view profile public fields"
ON public.profiles FOR SELECT TO anon
USING (true);

-- 3) Lock down token_transfers.to_email column
REVOKE SELECT ON public.token_transfers FROM anon, authenticated;
GRANT SELECT (id, from_user, to_user, amount, created_at)
  ON public.token_transfers TO authenticated;
GRANT INSERT ON public.token_transfers TO authenticated;
