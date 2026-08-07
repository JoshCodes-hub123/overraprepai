-- 1. Subjects gain an academic environment
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS environment_type public.learning_environment NOT NULL DEFAULT 'jamb',
  ADD COLUMN IF NOT EXISTS university text;

-- 2. Topics + questions can hang off a subject (JAMB) instead of a course (university)
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE;
ALTER TABLE public.topics ALTER COLUMN course_id DROP NOT NULL;

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE;
ALTER TABLE public.questions ALTER COLUMN course_id DROP NOT NULL;

-- 3. JAMB onboarding fields on profiles (all optional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS jamb_subjects text[],
  ADD COLUMN IF NOT EXISTS target_course text,
  ADD COLUMN IF NOT EXISTS target_university text;

-- 4. Access helper mirroring can_access_course
CREATE OR REPLACE FUNCTION public.can_access_subject(_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subject_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.subjects s
      WHERE s.id = _subject_id
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR (
            s.environment_type = public.my_environment()
            AND (
              s.environment_type = 'jamb'::learning_environment
              OR s.university IS NULL
              OR s.university = public.my_university()
            )
          )
        )
    )
  END
$$;

-- 5. Indexes for the new policy paths
CREATE INDEX IF NOT EXISTS idx_subjects_env ON public.subjects (environment_type, university);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON public.topics (subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions (subject_id);

-- 6. Subjects: replace the open read policy with an environment-scoped one.
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;

CREATE POLICY "Subjects readable in own environment"
ON public.subjects FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    environment_type = public.my_environment()
    AND (
      environment_type = 'jamb'::learning_environment
      OR university IS NULL
      OR university = public.my_university()
    )
  )
);

-- Signed-out visitors may browse JAMB subjects only (public SEO pages).
CREATE POLICY "Anon can read jamb subjects"
ON public.subjects FOR SELECT TO anon
USING (environment_type = 'jamb'::learning_environment);

GRANT SELECT ON public.subjects TO anon;
GRANT SELECT ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;

-- 7. Topics: allow the subject branch alongside the existing course branch.
DROP POLICY IF EXISTS "Topics visible in own environment" ON public.topics;
CREATE POLICY "Topics visible in own environment"
ON public.topics FOR SELECT TO authenticated
USING (
  (course_id IS NOT NULL AND public.can_access_course(course_id))
  OR (subject_id IS NOT NULL AND public.can_access_subject(subject_id))
);

-- 8. Questions: same, keeping the existing premium / purchase rules intact.
DROP POLICY IF EXISTS "Questions visible in own environment" ON public.questions;
CREATE POLICY "Questions visible in own environment"
ON public.questions FOR SELECT TO authenticated
USING (
  is_approved = true
  AND (
    (course_id IS NOT NULL AND public.can_access_course(course_id))
    OR (subject_id IS NOT NULL AND public.can_access_subject(subject_id))
  )
  AND (
    is_premium = false
    OR tutor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.student_quiz_purchases sqp
      JOIN public.quiz_questions qq ON qq.quiz_id = sqp.quiz_id
      WHERE qq.question_id = questions.id AND sqp.student_id = auth.uid()
    )
  )
);