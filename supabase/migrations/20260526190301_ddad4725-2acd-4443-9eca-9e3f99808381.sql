
-- 1. Relax course participation: any authenticated user may read/post in any active course chat.
CREATE OR REPLACE FUNCTION public.is_course_participant(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.courses c WHERE c.id = _course_id
  );
$$;

-- 2. Allow students to ping the course's tutor(s) via @tutor.
CREATE OR REPLACE FUNCTION public.notify_course_tutors(
  _course_id uuid,
  _snippet text,
  _link text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_name text;
  v_count integer := 0;
BEGIN
  IF v_caller IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(full_name, 'A student') INTO v_caller_name
  FROM public.profiles WHERE id = v_caller;

  WITH tutors AS (
    SELECT DISTINCT q.tutor_id
    FROM public.quizzes q
    WHERE q.course_id = _course_id
      AND q.tutor_id IS NOT NULL
      AND q.tutor_id <> v_caller
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT t.tutor_id,
           COALESCE(v_caller_name, 'A student') || ' needs you in course chat',
           LEFT(COALESCE(_snippet, ''), 280),
           'course_mention',
           _link
    FROM tutors t
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_course_tutors(uuid, text, text) TO authenticated;
