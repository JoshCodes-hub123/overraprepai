DROP POLICY IF EXISTS "Anyone views public materials" ON public.study_materials;
CREATE POLICY "Materials visible within own environment"
ON public.study_materials
FOR SELECT
USING (
  owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (visibility = 'public' AND public.can_access_course(course_id))
);