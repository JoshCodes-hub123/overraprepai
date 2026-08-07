-- 1. Environment type
DO $$ BEGIN
  CREATE TYPE public.learning_environment AS ENUM ('university','jamb');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Supported institutions
INSERT INTO public.universities (code, name, short_name, city, state, type, is_active)
VALUES ('FUTESIYIN','Federal University of Technology and Environmental Studies, Iyin-Ekiti','FUTEsIyin','Iyin-Ekiti','Ekiti','federal', true)
ON CONFLICT (code) DO UPDATE SET is_active = true, name = EXCLUDED.name, short_name = EXCLUDED.short_name;

UPDATE public.universities SET is_active = false WHERE code NOT IN ('FUTA','OAU','UI','FUTESIYIN');
UPDATE public.universities SET is_active = true WHERE code IN ('FUTA','OAU','UI','FUTESIYIN');

-- 3. Profiles: environment
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS environment_type public.learning_environment NOT NULL DEFAULT 'university';

UPDATE public.profiles SET environment_type = 'jamb' WHERE academic_path = 'jamb';
UPDATE public.profiles SET university = NULL WHERE environment_type = 'jamb';
UPDATE public.profiles SET university = 'FUTA'
  WHERE environment_type = 'university'
    AND (university IS NULL OR university NOT IN ('FUTA','OAU','UI','FUTESIYIN'));

CREATE INDEX IF NOT EXISTS idx_profiles_environment ON public.profiles(environment_type, university);

-- 4. Courses: environment tagging
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS environment_type public.learning_environment NOT NULL DEFAULT 'university';

UPDATE public.courses SET environment_type = 'jamb' WHERE path_type = 'jamb';
ALTER TABLE public.courses ALTER COLUMN university DROP NOT NULL;
UPDATE public.courses SET university = NULL, university_code = NULL WHERE environment_type = 'jamb';
UPDATE public.courses SET university = 'FUTA'
  WHERE environment_type = 'university'
    AND (university IS NULL OR university NOT IN ('FUTA','OAU','UI','FUTESIYIN'));

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_university_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_environment_check CHECK (
  (environment_type = 'jamb' AND university IS NULL)
  OR (environment_type = 'university' AND university IN ('FUTA','OAU','UI','FUTESIYIN'))
);

CREATE INDEX IF NOT EXISTS idx_courses_environment ON public.courses(environment_type, university);

-- 5. Scope helpers
CREATE OR REPLACE FUNCTION public.my_environment()
RETURNS public.learning_environment
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(environment_type, 'university') FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.can_access_course(_course_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = _course_id
      AND (
        c.created_by = auth.uid()
        OR public.has_role(auth.uid(), 'admin')
        OR (
          c.environment_type = public.my_environment()
          AND (c.environment_type = 'jamb' OR c.university = public.my_university())
        )
      )
  )
$$;

GRANT EXECUTE ON FUNCTION public.my_environment() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid) TO authenticated, anon;

-- 6. Enforce isolation on courses
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;
DROP POLICY IF EXISTS "courses scoped read" ON public.courses;
CREATE POLICY "courses environment scoped read" ON public.courses
FOR SELECT TO authenticated
USING (
  is_active AND (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      environment_type = public.my_environment()
      AND (environment_type = 'jamb' OR university = public.my_university())
    )
  )
);

-- 7. Quizzes
DROP POLICY IF EXISTS "Users can view active quizzes" ON public.quizzes;
CREATE POLICY "Quizzes visible in own environment" ON public.quizzes
FOR SELECT TO authenticated
USING (is_active = true AND public.can_access_course(course_id));

-- 8. Topics
DROP POLICY IF EXISTS "Anyone can view topics" ON public.topics;
CREATE POLICY "Topics visible in own environment" ON public.topics
FOR SELECT TO authenticated
USING (public.can_access_course(course_id));

-- 9. Questions
DROP POLICY IF EXISTS "Users can view approved questions" ON public.questions;
CREATE POLICY "Questions visible in own environment" ON public.questions
FOR SELECT TO authenticated
USING (
  is_approved = true
  AND public.can_access_course(course_id)
  AND (
    is_premium = false
    OR tutor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'tutor')
    OR EXISTS (
      SELECT 1 FROM public.student_quiz_purchases sqp
      JOIN public.quiz_questions qq ON qq.quiz_id = sqp.quiz_id
      WHERE qq.question_id = questions.id AND sqp.student_id = auth.uid()
    )
  )
);