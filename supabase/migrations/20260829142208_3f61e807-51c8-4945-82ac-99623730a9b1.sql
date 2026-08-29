
-- Generic fan-out helper: notify every student enrolled in a course.
CREATE OR REPLACE FUNCTION public.notify_course_students(
  _course_id uuid,
  _title text,
  _message text,
  _type text,
  _link text,
  _exclude_user uuid DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT sc.student_id, _title, _message, _type, _link
  FROM public.student_courses sc
  WHERE sc.course_id = _course_id
    AND (_exclude_user IS NULL OR sc.student_id <> _exclude_user);
$$;

-- New study material uploaded to a course.
CREATE OR REPLACE FUNCTION public.tg_notify_new_material()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
BEGIN
  IF COALESCE(NEW.visibility, 'public') = 'private' THEN
    RETURN NEW;
  END IF;
  SELECT code, name INTO c FROM public.courses WHERE id = NEW.course_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  PERFORM public.notify_course_students(
    NEW.course_id,
    'New material in ' || COALESCE(c.code, c.name),
    COALESCE(NEW.title, 'A new study material') || ' was just uploaded.',
    'course_material',
    '/courses/' || NEW.course_id::text,
    NEW.owner_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_material ON public.study_materials;
CREATE TRIGGER notify_new_material
AFTER INSERT ON public.study_materials
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_material();

-- New quiz available for a course.
CREATE OR REPLACE FUNCTION public.tg_notify_new_quiz()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c RECORD;
BEGIN
  IF NEW.course_id IS NULL OR NEW.is_active IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;
  SELECT code, name INTO c FROM public.courses WHERE id = NEW.course_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  PERFORM public.notify_course_students(
    NEW.course_id,
    'New quiz: ' || COALESCE(c.code, c.name),
    COALESCE(NEW.title, 'A new quiz') || ' is now available to practise.',
    'course_quiz',
    '/quiz/' || NEW.id::text,
    NEW.tutor_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_new_quiz ON public.quizzes;
CREATE TRIGGER notify_new_quiz
AFTER INSERT ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_new_quiz();

-- Reply in a course discussion: notify the thread author and prior participants.
CREATE OR REPLACE FUNCTION public.tg_notify_discussion_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d RECORD;
  c RECORD;
BEGIN
  SELECT id, user_id, title, course_id INTO d FROM public.discussions WHERE id = NEW.discussion_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT code, name INTO c FROM public.courses WHERE id = d.course_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT u.uid,
         'New reply' || CASE WHEN c.code IS NOT NULL THEN ' in ' || c.code ELSE '' END,
         'Someone replied to "' || COALESCE(d.title, 'a discussion') || '".',
         'course_reply',
         '/courses/' || COALESCE(d.course_id::text, '')
  FROM (
    SELECT d.user_id AS uid
    UNION
    SELECT dr.user_id FROM public.discussion_replies dr WHERE dr.discussion_id = NEW.discussion_id
  ) u
  WHERE u.uid IS NOT NULL AND u.uid <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_discussion_reply ON public.discussion_replies;
CREATE TRIGGER notify_discussion_reply
AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_discussion_reply();

-- Tutor recommendations for the calling student, based on their enrolled
-- courses and how weak their practice performance is in each of them.
CREATE OR REPLACE FUNCTION public.recommend_tutors_for_me(_limit integer DEFAULT 8)
RETURNS TABLE (
  tutor_id uuid,
  full_name text,
  avatar_url text,
  profile_image_url text,
  department text,
  course_id uuid,
  course_code text,
  course_name text,
  avg_rating numeric,
  rating_count integer,
  reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_courses AS (
    SELECT sc.course_id, c.code, c.name
    FROM public.student_courses sc
    JOIN public.courses c ON c.id = sc.course_id
    WHERE sc.student_id = auth.uid()
  ),
  perf AS (
    SELECT q.course_id, AVG(qa.score)::numeric AS avg_score
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.user_id = auth.uid() AND qa.completed_at IS NOT NULL
    GROUP BY q.course_id
  ),
  ratings AS (
    SELECT tr.tutor_id, AVG(tr.rating)::numeric AS avg_rating, COUNT(*)::int AS rating_count
    FROM public.tutor_ratings tr GROUP BY tr.tutor_id
  )
  SELECT p.id,
         p.full_name,
         p.avatar_url,
         p.profile_image_url,
         p.department,
         mc.course_id,
         mc.code,
         mc.name,
         COALESCE(r.avg_rating, 0),
         COALESCE(r.rating_count, 0),
         CASE
           WHEN pf.avg_score IS NULL THEN 'Teaches ' || mc.code
           WHEN pf.avg_score < 60 THEN 'Can help you improve in ' || mc.code
           ELSE 'Teaches ' || mc.code
         END
  FROM my_courses mc
  JOIN public.tutor_courses tc ON tc.course_id = mc.course_id
  JOIN public.profiles p ON p.id = tc.tutor_id
  LEFT JOIN ratings r ON r.tutor_id = p.id
  LEFT JOIN perf pf ON pf.course_id = mc.course_id
  WHERE p.tutor_status = 'approved' AND p.id <> auth.uid()
  ORDER BY COALESCE(pf.avg_score, 100) ASC, COALESCE(r.avg_rating, 0) DESC, COALESCE(r.rating_count, 0) DESC
  LIMIT GREATEST(1, LEAST(_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.recommend_tutors_for_me(integer) TO authenticated;
