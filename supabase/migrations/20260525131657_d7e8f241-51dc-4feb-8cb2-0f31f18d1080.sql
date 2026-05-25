
-- 1) school_students: restrict teacher SELECT to students in classes they teach
DROP POLICY IF EXISTS "ss_select" ON public.school_students;

CREATE POLICY "ss_select"
ON public.school_students
FOR SELECT
USING (
  is_school_member(school_id, 'owner'::text)
  OR is_school_member(school_id, 'admin'::text)
  OR (user_id = auth.uid())
  OR (parent_user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.class_subjects cs
    WHERE cs.school_id = school_students.school_id
      AND cs.class_id = school_students.class_id
      AND cs.teacher_id = auth.uid()
  )
);

-- 2) platform_settings: add is_public flag and restrict reads
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Authenticated can view platform settings" ON public.platform_settings;

CREATE POLICY "Authenticated can view public platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (is_public = true OR has_role(auth.uid(), 'admin'::app_role));

-- 3) user_roles: restrict admin-manage policy to authenticated only
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
