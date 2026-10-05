ALTER TABLE public.profiles
  ALTER COLUMN university DROP DEFAULT;

ALTER TABLE public.courses
  ALTER COLUMN university DROP DEFAULT;

ALTER TABLE public.courses
  ALTER COLUMN environment_type DROP DEFAULT,
  ALTER COLUMN path_type DROP DEFAULT;

CREATE SCHEMA IF NOT EXISTS search_index_private;
REVOKE ALL ON SCHEMA search_index_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA search_index_private TO authenticated;

CREATE OR REPLACE FUNCTION public.course_scope_is_valid(
  _environment_type public.learning_environment,
  _path_type public.academic_path,
  _university text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN _environment_type = 'jamb'::public.learning_environment
      THEN _path_type = 'jamb'::public.academic_path AND _university IS NULL
    WHEN _environment_type = 'university'::public.learning_environment
      THEN _path_type = 'university'::public.academic_path
        AND _university IN ('FUTA', 'OAU', 'UI', 'FUTESIYIN')
    ELSE false
  END
$$;

REVOKE ALL ON FUNCTION public.course_scope_is_valid(public.learning_environment, public.academic_path, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_scope_is_valid(public.learning_environment, public.academic_path, text) TO authenticated;

CREATE OR REPLACE FUNCTION search_index_private.tutor_course_scope_matches(
  _created_by uuid,
  _environment_type public.learning_environment,
  _path_type public.academic_path,
  _university text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _created_by = auth.uid()
    AND public.has_role(auth.uid(), 'tutor'::public.app_role)
    AND public.course_scope_is_valid(_environment_type, _path_type, _university)
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.environment_type = _environment_type
        AND p.academic_path = _path_type
        AND (
          (_environment_type = 'jamb'::public.learning_environment AND p.university IS NULL)
          OR (_environment_type = 'university'::public.learning_environment AND p.university = _university)
        )
    )
$$;

REVOKE ALL ON FUNCTION search_index_private.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_index_private.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text) TO authenticated;

CREATE OR REPLACE FUNCTION search_index_private.can_access_course(_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = _course_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          c.environment_type = public.my_environment()
          AND (
            (c.environment_type = 'jamb'::public.learning_environment AND c.university IS NULL)
            OR (c.environment_type = 'university'::public.learning_environment AND c.university = public.my_university())
          )
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION search_index_private.can_access_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_index_private.can_access_course(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION search_index_private.can_access_subject(_subject_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _subject_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.subjects s
      WHERE s.id = _subject_id
        AND (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR (
            s.environment_type = public.my_environment()
            AND (
              (
                s.environment_type = 'jamb'::public.learning_environment
                AND s.category = 'jamb'::public.academic_path
                AND s.university IS NULL
              )
              OR (
                s.environment_type = 'university'::public.learning_environment
                AND s.category = 'university'::public.academic_path
                AND s.university IS NOT NULL
                AND s.university = public.my_university()
              )
            )
          )
        )
    )
  END
$$;

REVOKE ALL ON FUNCTION search_index_private.can_access_subject(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_index_private.can_access_subject(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION search_index_private.tutor_topic_scope_matches(
  _course_id uuid,
  _subject_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'tutor'::public.app_role)
    AND CASE
      WHEN _course_id IS NOT NULL THEN
        public.course_owner(_course_id)
        AND search_index_private.can_access_course(_course_id)
      WHEN _subject_id IS NOT NULL THEN
        search_index_private.can_access_subject(_subject_id)
      ELSE false
    END
$$;

REVOKE ALL ON FUNCTION search_index_private.tutor_topic_scope_matches(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_index_private.tutor_topic_scope_matches(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Tutors can create courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
DROP POLICY IF EXISTS "Tutors can update own courses" ON public.courses;

CREATE POLICY "Tutors create courses in own scope"
ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  search_index_private.tutor_course_scope_matches(created_by, environment_type, path_type, university)
);

CREATE POLICY "Admins create courses with explicit scope"
ON public.courses
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.course_scope_is_valid(environment_type, path_type, university)
);

CREATE POLICY "Tutors update courses in own scope"
ON public.courses
FOR UPDATE TO authenticated
USING (
  search_index_private.tutor_course_scope_matches(created_by, environment_type, path_type, university)
)
WITH CHECK (
  search_index_private.tutor_course_scope_matches(created_by, environment_type, path_type, university)
);

CREATE POLICY "Admins update courses"
ON public.courses
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND public.course_scope_is_valid(environment_type, path_type, university)
);

CREATE POLICY "Admins delete courses"
ON public.courses
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "courses environment scoped read" ON public.courses;
CREATE POLICY "courses environment scoped read" ON public.courses
FOR SELECT TO authenticated
USING (
  is_active AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      environment_type = public.my_environment()
      AND (
        (environment_type = 'jamb'::public.learning_environment AND university IS NULL)
        OR (environment_type = 'university'::public.learning_environment AND university = public.my_university())
      )
    )
  )
);

DROP POLICY IF EXISTS "Quizzes visible in own environment" ON public.quizzes;
CREATE POLICY "Quizzes visible in own environment"
ON public.quizzes
FOR SELECT TO authenticated
USING (
  is_active = true
  AND search_index_private.can_access_course(course_id)
);

DROP POLICY IF EXISTS "Subjects readable in own environment" ON public.subjects;
CREATE POLICY "Subjects readable in own environment"
ON public.subjects
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    environment_type = public.my_environment()
    AND (
      (
        environment_type = 'jamb'::public.learning_environment
        AND category = 'jamb'::public.academic_path
        AND university IS NULL
      )
      OR (
        environment_type = 'university'::public.learning_environment
        AND category = 'university'::public.academic_path
        AND university IS NOT NULL
        AND university = public.my_university()
      )
    )
  )
);

DROP POLICY IF EXISTS "Anon can read jamb subjects" ON public.subjects;
CREATE POLICY "Anon can read jamb subjects"
ON public.subjects
FOR SELECT TO anon
USING (
  environment_type = 'jamb'::public.learning_environment
  AND category = 'jamb'::public.academic_path
  AND university IS NULL
);

DROP POLICY IF EXISTS "Topics visible in own environment" ON public.topics;
DROP POLICY IF EXISTS "Tutors can manage topics" ON public.topics;
DROP POLICY IF EXISTS "topics owner write" ON public.topics;
DROP POLICY IF EXISTS "topics owner update" ON public.topics;
DROP POLICY IF EXISTS "topics owner delete" ON public.topics;
CREATE POLICY "Topics visible in own environment"
ON public.topics
FOR SELECT TO authenticated
USING (
  CASE
    WHEN course_id IS NOT NULL THEN search_index_private.can_access_course(course_id)
    WHEN subject_id IS NOT NULL THEN search_index_private.can_access_subject(subject_id)
    ELSE false
  END
);

CREATE POLICY "Tutors create topics in accessible scope"
ON public.topics
FOR INSERT TO authenticated
WITH CHECK (search_index_private.tutor_topic_scope_matches(course_id, subject_id));

CREATE POLICY "Tutors update topics in accessible scope"
ON public.topics
FOR UPDATE TO authenticated
USING (search_index_private.tutor_topic_scope_matches(course_id, subject_id))
WITH CHECK (search_index_private.tutor_topic_scope_matches(course_id, subject_id));

CREATE POLICY "Tutors delete topics in accessible scope"
ON public.topics
FOR DELETE TO authenticated
USING (search_index_private.tutor_topic_scope_matches(course_id, subject_id));

CREATE POLICY "Admins manage all topics"
ON public.topics
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Questions visible in own environment" ON public.questions;
DROP POLICY IF EXISTS "Tutors can view their own questions" ON public.questions;
DROP POLICY IF EXISTS "Tutors can create questions" ON public.questions;
CREATE POLICY "Questions visible in own environment"
ON public.questions
FOR SELECT TO authenticated
USING (
  (is_approved = true OR tutor_id = auth.uid())
  AND CASE
    WHEN course_id IS NOT NULL THEN search_index_private.can_access_course(course_id)
    WHEN subject_id IS NOT NULL THEN (
      search_index_private.can_access_subject(subject_id)
      AND EXISTS (
        SELECT 1
        FROM public.topics t
        WHERE t.id = questions.topic_id
          AND t.course_id IS NULL
          AND t.subject_id = questions.subject_id
      )
    )
    ELSE false
  END
  AND (
    is_premium = false
    OR tutor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'tutor'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.student_quiz_purchases sqp
      JOIN public.quiz_questions qq ON qq.quiz_id = sqp.quiz_id
      WHERE qq.question_id = questions.id AND sqp.student_id = auth.uid()
    )
  )
);

CREATE POLICY "Tutors create questions in accessible scope"
ON public.questions
FOR INSERT TO authenticated
WITH CHECK (
  tutor_id = auth.uid()
  AND public.has_role(auth.uid(), 'tutor'::public.app_role)
  AND CASE
    WHEN course_id IS NOT NULL THEN (
      search_index_private.can_access_course(course_id)
      AND EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = questions.topic_id
          AND t.course_id = questions.course_id
      )
    )
    WHEN subject_id IS NOT NULL THEN (
      search_index_private.can_access_subject(subject_id)
      AND EXISTS (
        SELECT 1 FROM public.topics t
        WHERE t.id = questions.topic_id
          AND t.course_id IS NULL
          AND t.subject_id = questions.subject_id
      )
    )
    ELSE false
  END
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_university_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_university_check
  CHECK (university IS NULL OR university IN ('FUTA', 'OAU', 'UI', 'FUTESIYIN'))
  NOT VALID;

CREATE OR REPLACE FUNCTION public.get_course_snapshots(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM _user_id THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(t) ORDER BY t.last_opened_at DESC NULLS LAST, t.code)
    FROM (
      SELECT
        c.id,
        c.code,
        c.name,
        c.department,
        c.level,
        (
          SELECT count(*)::int FROM public.tutor_announcements ta
          WHERE ta.course_id = c.id
            AND ta.created_at > coalesce(
              (SELECT opened_at FROM public.recently_opened_courses
                WHERE user_id = _user_id AND course_id = c.id),
              'epoch'::timestamptz
            )
        ) AS unread_updates,
        (SELECT opened_at FROM public.recently_opened_courses
          WHERE user_id = _user_id AND course_id = c.id) AS last_opened_at
      FROM public.student_courses sc
      JOIN public.courses c ON c.id = sc.course_id
      WHERE sc.student_id = _user_id
        AND search_index_private.can_access_course(c.id)
    ) t
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_snapshots(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_snapshots(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.profile_in_my_environment(uuid);
CREATE OR REPLACE FUNCTION search_index_private.profile_in_my_environment(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _profile_id
      AND auth.uid() IS NOT NULL
      AND public.has_role(_profile_id, 'tutor'::public.app_role)
      AND (
        (
          p.environment_type = 'jamb'::public.learning_environment
          AND p.academic_path = 'jamb'::public.academic_path
          AND p.university IS NULL
          AND public.my_environment() = 'jamb'::public.learning_environment
          AND public.my_university() IS NULL
        )
        OR (
          p.environment_type = 'university'::public.learning_environment
          AND p.academic_path = 'university'::public.academic_path
          AND p.university IN ('FUTA', 'OAU', 'UI', 'FUTESIYIN')
          AND public.my_environment() = 'university'::public.learning_environment
          AND p.university = public.my_university()
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION search_index_private.profile_in_my_environment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_index_private.profile_in_my_environment(uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view published lecture notes" ON public.lecture_notes;
CREATE POLICY "Lecture notes visible in allowed environment"
ON public.lecture_notes
FOR SELECT TO authenticated
USING (
  tutor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    is_published = true
    AND (
      (course_id IS NOT NULL AND search_index_private.can_access_course(course_id))
      OR (course_id IS NULL AND search_index_private.profile_in_my_environment(tutor_id))
    )
  )
);

DROP POLICY IF EXISTS "Users view their own flashcards" ON public.flashcards;
CREATE POLICY "Flashcards visible in allowed environment"
ON public.flashcards
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    is_public = true
    AND (
      (course_id IS NOT NULL AND search_index_private.can_access_course(course_id))
      OR (
        course_id IS NULL
        AND academic_path = 'jamb'::public.academic_path
        AND public.my_environment() = 'jamb'::public.learning_environment
      )
    )
  )
);

DROP POLICY IF EXISTS "Anyone authed views course images" ON public.course_images;
CREATE POLICY "Course images visible in allowed environment"
ON public.course_images
FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR search_index_private.can_access_course(course_id)
);

DROP POLICY IF EXISTS "Anyone can view announcements" ON public.tutor_announcements;
CREATE POLICY "Tutor announcements visible in allowed environment"
ON public.tutor_announcements
FOR SELECT TO authenticated
USING (
  tutor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (course_id IS NOT NULL AND search_index_private.can_access_course(course_id))
  OR (course_id IS NULL AND search_index_private.profile_in_my_environment(tutor_id))
);

  DROP POLICY IF EXISTS "Materials visible within own environment" ON public.study_materials;
  CREATE POLICY "Materials visible within own environment"
  ON public.study_materials
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (visibility = 'public' AND search_index_private.can_access_course(course_id))
  );

ALTER TABLE public.search_index
  ADD COLUMN IF NOT EXISTS scope_environment public.learning_environment,
  ADD COLUMN IF NOT EXISTS scope_university text,
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION search_index_private.profile_scope(_profile_id uuid)
RETURNS TABLE(scope_environment public.learning_environment, scope_university text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.environment_type, p.university
  FROM public.profiles p
  WHERE p.id = _profile_id
    AND (
      (
        p.environment_type = 'jamb'::public.learning_environment
        AND p.academic_path = 'jamb'::public.academic_path
        AND p.university IS NULL
      )
      OR (
        p.environment_type = 'university'::public.learning_environment
        AND p.academic_path = 'university'::public.academic_path
        AND p.university IN ('FUTA', 'OAU', 'UI', 'FUTESIYIN')
      )
    )
$$;

CREATE OR REPLACE FUNCTION search_index_private.course_scope(_course_id uuid)
RETURNS TABLE(
  scope_environment public.learning_environment,
  scope_university text,
  source_course_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.environment_type, c.university, c.id
  FROM public.courses c
  WHERE c.id = _course_id
    AND public.course_scope_is_valid(c.environment_type, c.path_type, c.university)
$$;

CREATE OR REPLACE FUNCTION search_index_private.subject_scope(_subject_id uuid)
RETURNS TABLE(
  scope_environment public.learning_environment,
  scope_university text,
  source_course_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.environment_type, s.university, NULL::uuid
  FROM public.subjects s
  WHERE s.id = _subject_id
    AND (
      (
        s.environment_type = 'jamb'::public.learning_environment
        AND s.category = 'jamb'::public.academic_path
        AND s.university IS NULL
      )
      OR (
        s.environment_type = 'university'::public.learning_environment
        AND s.category = 'university'::public.academic_path
        AND s.university IN ('FUTA', 'OAU', 'UI', 'FUTESIYIN')
      )
    )
$$;

CREATE OR REPLACE FUNCTION search_index_private.topic_scope(_topic_id uuid)
RETURNS TABLE(
  scope_environment public.learning_environment,
  scope_university text,
  source_course_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.scope_environment, cs.scope_university, cs.source_course_id
  FROM public.topics t
  CROSS JOIN LATERAL search_index_private.course_scope(t.course_id) cs
  WHERE t.id = _topic_id
    AND t.course_id IS NOT NULL
  UNION ALL
  SELECT ss.scope_environment, ss.scope_university, ss.source_course_id
  FROM public.topics t
  CROSS JOIN LATERAL search_index_private.subject_scope(t.subject_id) ss
  WHERE t.id = _topic_id
    AND t.course_id IS NULL
    AND t.subject_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION search_index_private.source_scope(
  _entity_type text,
  _entity_id uuid
)
RETURNS TABLE(
  scope_environment public.learning_environment,
  scope_university text,
  source_course_id uuid,
  source_owner_id uuid,
  source_is_public boolean,
  global_allowed boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_id uuid;
  v_topic_id uuid;
  v_owner_id uuid;
  v_university_code text;
  v_is_public boolean;
  v_scope record;
BEGIN
  IF _entity_type = 'quiz' THEN
    SELECT q.course_id, q.tutor_id, q.is_active
      INTO v_course_id, v_owner_id, v_is_public
      FROM public.quizzes q
      WHERE q.id = _entity_id;
    IF NOT FOUND THEN RETURN; END IF;
    SELECT * INTO v_scope FROM search_index_private.course_scope(v_course_id);
    IF NOT FOUND THEN RETURN; END IF;
    scope_environment := v_scope.scope_environment;
    scope_university := v_scope.scope_university;
    source_course_id := v_scope.source_course_id;
    source_owner_id := v_owner_id;
    source_is_public := v_is_public;
    global_allowed := false;
    RETURN NEXT;
    RETURN;
  ELSIF _entity_type = 'note' THEN
    SELECT n.course_id, n.topic_id, n.tutor_id, n.is_published
      INTO v_course_id, v_topic_id, v_owner_id, v_is_public
      FROM public.lecture_notes n
      WHERE n.id = _entity_id;
    IF NOT FOUND THEN RETURN; END IF;

    IF v_course_id IS NOT NULL THEN
      SELECT * INTO v_scope FROM search_index_private.course_scope(v_course_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := v_scope.source_course_id;
      global_allowed := false;
    ELSIF v_topic_id IS NOT NULL THEN
      SELECT * INTO v_scope FROM search_index_private.topic_scope(v_topic_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := v_scope.source_course_id;
      global_allowed := false;
    ELSE
      SELECT * INTO v_scope FROM search_index_private.profile_scope(v_owner_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := NULL;
      global_allowed := true;
    END IF;
    source_owner_id := v_owner_id;
    source_is_public := v_is_public;
    RETURN NEXT;
    RETURN;
  ELSIF _entity_type = 'curriculum' THEN
    SELECT c.tutor_id, c.university_code, c.is_published
      INTO v_owner_id, v_university_code, v_is_public
      FROM public.tutor_curricula c
      WHERE c.id = _entity_id;
    IF NOT FOUND THEN RETURN; END IF;

    IF v_university_code IS NOT NULL THEN
      IF NOT public.course_scope_is_valid(
        'university'::public.learning_environment,
        'university'::public.academic_path,
        v_university_code
      ) THEN
        RETURN;
      END IF;
      scope_environment := 'university'::public.learning_environment;
      scope_university := v_university_code;
    ELSE
      SELECT * INTO v_scope FROM search_index_private.profile_scope(v_owner_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
    END IF;
    source_course_id := NULL;
    source_owner_id := v_owner_id;
    source_is_public := v_is_public;
    global_allowed := true;
    RETURN NEXT;
    RETURN;
  ELSIF _entity_type = 'tutor' THEN
    SELECT p.id
      INTO v_owner_id
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id
      WHERE p.id = _entity_id
        AND ur.role = 'tutor'::public.app_role;
    IF NOT FOUND THEN RETURN; END IF;
    SELECT * INTO v_scope FROM search_index_private.profile_scope(v_owner_id);
    IF NOT FOUND THEN RETURN; END IF;
    scope_environment := v_scope.scope_environment;
    scope_university := v_scope.scope_university;
    source_course_id := NULL;
    source_owner_id := v_owner_id;
    source_is_public := true;
    global_allowed := true;
    RETURN NEXT;
    RETURN;
  ELSIF _entity_type = 'library' THEN
    SELECT m.course_id, m.owner_id, m.visibility = 'public'
      INTO v_course_id, v_owner_id, v_is_public
      FROM public.study_materials m
      WHERE m.id = _entity_id;
    IF FOUND THEN
      SELECT * INTO v_scope FROM search_index_private.course_scope(v_course_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := v_scope.source_course_id;
      source_owner_id := v_owner_id;
      source_is_public := v_is_public;
      global_allowed := false;
      RETURN NEXT;
      RETURN;
    END IF;

    SELECT r.course_id, r.topic_id, r.user_id
      INTO v_course_id, v_topic_id, v_owner_id
      FROM public.user_resources r
      WHERE r.id = _entity_id;
    IF NOT FOUND THEN RETURN; END IF;

    IF v_course_id IS NOT NULL THEN
      SELECT * INTO v_scope FROM search_index_private.course_scope(v_course_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := v_scope.source_course_id;
    ELSIF v_topic_id IS NOT NULL THEN
      SELECT * INTO v_scope FROM search_index_private.topic_scope(v_topic_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := v_scope.source_course_id;
    ELSE
      SELECT * INTO v_scope FROM search_index_private.profile_scope(v_owner_id);
      IF NOT FOUND THEN RETURN; END IF;
      scope_environment := v_scope.scope_environment;
      scope_university := v_scope.scope_university;
      source_course_id := NULL;
    END IF;
    source_owner_id := v_owner_id;
    source_is_public := false;
    global_allowed := false;
    RETURN NEXT;
    RETURN;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION search_index_private.can_search(
  _entity_type text,
  _entity_id uuid,
  _scope_environment public.learning_environment,
  _scope_university text,
  _is_global boolean,
  _is_public boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope record;
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN true;
  END IF;
  IF NOT _is_public THEN
    RETURN false;
  END IF;

  SELECT * INTO v_scope
    FROM search_index_private.source_scope(_entity_type, _entity_id);
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF NOT v_scope.source_is_public THEN
    RETURN false;
  END IF;

  IF _is_global THEN
    RETURN v_scope.source_course_id IS NULL AND v_scope.global_allowed;
  END IF;

  IF _scope_environment IS DISTINCT FROM v_scope.scope_environment
    OR _scope_university IS DISTINCT FROM v_scope.scope_university THEN
    RETURN false;
  END IF;

  IF v_scope.source_course_id IS NOT NULL THEN
    IF auth.uid() IS NULL THEN
      RETURN v_scope.scope_environment = 'jamb'::public.learning_environment
        AND v_scope.scope_university IS NULL;
    END IF;
    RETURN search_index_private.can_access_course(v_scope.source_course_id);
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN v_scope.scope_environment = 'jamb'::public.learning_environment
      AND v_scope.scope_university IS NULL;
  END IF;

  IF v_scope.scope_environment = 'jamb'::public.learning_environment THEN
    RETURN public.my_environment() = 'jamb'::public.learning_environment
      AND public.my_university() IS NULL;
  END IF;

  RETURN v_scope.scope_environment = 'university'::public.learning_environment
    AND public.my_environment() = 'university'::public.learning_environment
    AND public.my_university() = v_scope.scope_university;
END;
$$;

CREATE OR REPLACE FUNCTION search_index_private.enforce_source_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope record;
BEGIN
  SELECT * INTO v_scope
    FROM search_index_private.source_scope(NEW.entity_type, NEW.entity_id);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Search index source is missing or has no trustworthy scope';
  END IF;

  IF NEW.is_global THEN
    IF v_scope.source_course_id IS NOT NULL OR NOT v_scope.global_allowed THEN
      RAISE EXCEPTION 'Course-linked or private content cannot be globally indexed';
    END IF;
    IF NEW.scope_environment IS NOT NULL OR NEW.scope_university IS NOT NULL THEN
      RAISE EXCEPTION 'Global search rows cannot claim university scope';
    END IF;
    NEW.scope_environment := NULL;
    NEW.scope_university := NULL;
  ELSE
    IF NEW.scope_environment IS NOT NULL
      AND NEW.scope_environment IS DISTINCT FROM v_scope.scope_environment THEN
      RAISE EXCEPTION 'Search index environment does not match its source';
    END IF;
    IF NEW.scope_university IS NOT NULL
      AND NEW.scope_university IS DISTINCT FROM v_scope.scope_university THEN
      RAISE EXCEPTION 'Search index university does not match its source';
    END IF;
    NEW.scope_environment := v_scope.scope_environment;
    NEW.scope_university := v_scope.scope_university;
    NEW.is_global := false;
  END IF;

  NEW.owner_id := v_scope.source_owner_id;
  NEW.is_public := NEW.is_public AND v_scope.source_is_public;
  RETURN NEW;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA search_index_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA search_index_private TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.profile_in_my_environment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.can_access_course(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.can_access_subject(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.tutor_topic_scope_matches(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION search_index_private.can_search(text, uuid, public.learning_environment, text, boolean, boolean) TO authenticated;

DROP TRIGGER IF EXISTS trg_search_index_enforce_source_scope ON public.search_index;
CREATE TRIGGER trg_search_index_enforce_source_scope
BEFORE INSERT OR UPDATE ON public.search_index
FOR EACH ROW EXECUTE FUNCTION search_index_private.enforce_source_scope();

DROP POLICY IF EXISTS "Public + own search rows readable" ON public.search_index;
CREATE POLICY "Public scoped search rows readable"
ON public.search_index
FOR SELECT TO authenticated
USING (
  search_index_private.can_search(
    entity_type,
    entity_id,
    scope_environment,
    scope_university,
    is_global,
    is_public
  )
);

CREATE OR REPLACE FUNCTION public.match_search_index(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  filter_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  entity_type text,
  entity_id uuid,
  title text,
  body text,
  url text,
  similarity float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.entity_type, s.entity_id, s.title, s.body, s.url,
         1 - (s.embedding <=> query_embedding) AS similarity
    FROM public.search_index s
   WHERE s.embedding IS NOT NULL
     AND search_index_private.can_search(
       s.entity_type,
       s.entity_id,
       s.scope_environment,
       s.scope_university,
       s.is_global,
       s.is_public
     )
     AND (filter_type IS NULL OR s.entity_type = filter_type)
   ORDER BY s.embedding <=> query_embedding
   LIMIT match_count;
$$;

REVOKE ALL ON FUNCTION public.match_search_index(vector, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_search_index(vector, integer, text) TO anon, authenticated;

ALTER TABLE public.course_images
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE OR REPLACE FUNCTION public.course_image_storage_path_from_url(_url text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  v_marker constant text := '/storage/v1/object/public/course-images/';
  v_marker_position integer;
  v_encoded_path text;
  v_path_bytes bytea := ''::bytea;
  v_index integer := 1;
  v_character text;
  v_hex text;
BEGIN
  IF _url IS NULL THEN
    RETURN NULL;
  END IF;

  v_marker_position := strpos(_url, v_marker);
  IF v_marker_position = 0 THEN
    RETURN NULL;
  END IF;

  v_encoded_path := split_part(
    substring(_url FROM v_marker_position + length(v_marker)),
    '?',
    1
  );

  WHILE v_index <= char_length(v_encoded_path) LOOP
    v_character := substring(v_encoded_path FROM v_index FOR 1);
    IF v_character = '%' THEN
      IF v_index + 2 > char_length(v_encoded_path) THEN
        RETURN NULL;
      END IF;
      v_hex := substring(v_encoded_path FROM v_index + 1 FOR 2);
      IF v_hex !~ '^[0-9A-Fa-f]{2}$' THEN
        RETURN NULL;
      END IF;
      v_path_bytes := v_path_bytes || decode(v_hex, 'hex');
      v_index := v_index + 3;
    ELSE
      v_path_bytes := v_path_bytes || convert_to(v_character, 'UTF8');
      v_index := v_index + 1;
    END IF;
  END LOOP;

  RETURN convert_from(v_path_bytes, 'UTF8');
EXCEPTION
  WHEN character_not_in_repertoire OR invalid_parameter_value THEN
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.course_image_storage_path_from_url(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_image_storage_path_from_url(text) TO authenticated;

CREATE SCHEMA IF NOT EXISTS course_image_private;
REVOKE ALL ON SCHEMA course_image_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA course_image_private TO authenticated;

CREATE OR REPLACE FUNCTION course_image_private.object_matches(
  _storage_path text,
  _course_id uuid,
  _uploaded_by uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT _storage_path IS NOT NULL
    AND _course_id IS NOT NULL
    AND _uploaded_by IS NOT NULL
    AND split_part(_storage_path, '/', 1) = _uploaded_by::text
    AND split_part(_storage_path, '/', 2) = _course_id::text
    AND EXISTS (
      SELECT 1
      FROM storage.objects so
      WHERE so.bucket_id = 'course-images'
        AND so.name = _storage_path
        AND so.owner = _uploaded_by
    )
$$;

REVOKE ALL ON FUNCTION course_image_private.object_matches(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION course_image_private.object_matches(text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION course_image_private.write_is_valid(
  _storage_path text,
  _course_id uuid,
  _uploaded_by uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT search_index_private.can_access_course(_course_id)
    AND (
      _uploaded_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
    AND course_image_private.object_matches(_storage_path, _course_id, _uploaded_by)
$$;

  REVOKE ALL ON FUNCTION course_image_private.write_is_valid(text, uuid, uuid) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION course_image_private.write_is_valid(text, uuid, uuid) TO authenticated;

UPDATE public.course_images ci
SET storage_path = public.course_image_storage_path_from_url(ci.url)
WHERE ci.storage_path IS NULL
  AND public.course_image_storage_path_from_url(ci.url) IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM storage.objects so
    WHERE so.bucket_id = 'course-images'
      AND so.name = public.course_image_storage_path_from_url(ci.url)
  );

DROP POLICY IF EXISTS "Course images visible in allowed environment" ON public.course_images;
DROP POLICY IF EXISTS "Tutors manage own course images" ON public.course_images;

CREATE POLICY "Course images readable for accessible courses"
ON public.course_images
FOR SELECT TO authenticated
USING (
  search_index_private.can_access_course(course_id)
  AND course_image_private.object_matches(
    COALESCE(storage_path, public.course_image_storage_path_from_url(url)),
    course_id,
    uploaded_by
  )
);

CREATE POLICY "Course image rows require owned course object"
ON public.course_images
FOR INSERT TO authenticated
WITH CHECK (
  course_image_private.write_is_valid(
    COALESCE(storage_path, public.course_image_storage_path_from_url(url)),
    course_id,
    uploaded_by
  )
);

CREATE POLICY "Course image updates preserve object ownership"
ON public.course_images
FOR UPDATE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  course_image_private.write_is_valid(
    COALESCE(storage_path, public.course_image_storage_path_from_url(url)),
    course_id,
    uploaded_by
  )
);

CREATE POLICY "Course image owners or admins delete rows"
ON public.course_images
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

UPDATE storage.buckets
SET public = false
WHERE id = 'course-images';

DROP POLICY IF EXISTS "course-images owner write" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload course-images" ON storage.objects;
DROP POLICY IF EXISTS "course-images tutor write" ON storage.objects;
CREATE POLICY "course-images upload own accessible course"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-images'
  AND COALESCE(array_length(storage.foldername(name), 1), 0) >= 2
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id::text = (storage.foldername(name))[2]
      AND search_index_private.can_access_course(c.id)
  )
);

DROP POLICY IF EXISTS "course-images public read" ON storage.objects;
DROP POLICY IF EXISTS "course-images scoped read" ON storage.objects;
CREATE POLICY "course-images scoped read"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-images'
  AND EXISTS (
    SELECT 1
    FROM public.course_images ci
    WHERE COALESCE(ci.storage_path, public.course_image_storage_path_from_url(ci.url)) = name
      AND search_index_private.can_access_course(ci.course_id)
      AND course_image_private.object_matches(
        name,
        ci.course_id,
        ci.uploaded_by
      )
  )
);

REVOKE ALL ON FUNCTION public.can_access_course(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.can_access_course(uuid);

REVOKE ALL ON FUNCTION public.can_access_subject(uuid) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.can_access_subject(uuid);

DO $$
BEGIN
  IF to_regprocedure('public.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'DROP FUNCTION public.tutor_course_scope_matches(uuid, public.learning_environment, public.academic_path, text)';
  END IF;
  IF to_regprocedure('public.tutor_topic_scope_matches(uuid, uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.tutor_topic_scope_matches(uuid, uuid) FROM PUBLIC, anon, authenticated';
    EXECUTE 'DROP FUNCTION public.tutor_topic_scope_matches(uuid, uuid)';
  END IF;
END;
$$;