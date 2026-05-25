
-- Allow tutors to publish opportunities and any authenticated user to submit drafts
DROP POLICY IF EXISTS "Admins can insert opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Admins can update opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Authenticated can view published opportunities" ON public.opportunities;

-- Insert: admins anywhere, tutors as published, anyone as draft (suggestion)
CREATE POLICY "Insert opportunities by role"
ON public.opportunities
FOR INSERT
TO authenticated
WITH CHECK (
  posted_by = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'tutor'::app_role)
    OR status = 'draft'
  )
);

-- Update: admins anything; tutors only their own published items
CREATE POLICY "Admins update any opportunity"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Tutors update own opportunities"
ON public.opportunities
FOR UPDATE
TO authenticated
USING (
  posted_by = auth.uid()
  AND public.has_role(auth.uid(), 'tutor'::app_role)
)
WITH CHECK (
  posted_by = auth.uid()
  AND public.has_role(auth.uid(), 'tutor'::app_role)
);

-- Select: published OR admin OR own row (so authors see their pending drafts)
CREATE POLICY "View opportunities"
ON public.opportunities
FOR SELECT
TO authenticated
USING (
  status = 'published'
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR posted_by = auth.uid()
);

-- Notify admins when a student submits a suggestion (draft posted by non-admin/non-tutor)
CREATE OR REPLACE FUNCTION public.notify_admins_on_opportunity_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE submitter_name TEXT;
BEGIN
  IF NEW.status = 'draft' AND NEW.posted_by IS NOT NULL
     AND NOT public.has_role(NEW.posted_by, 'admin'::app_role) THEN
    SELECT COALESCE(full_name, 'A user') INTO submitter_name FROM public.profiles WHERE id = NEW.posted_by;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id,
           'New opportunity suggestion',
           submitter_name || ' suggested: ' || NEW.title,
           'info',
           '/admin/opportunities'
      FROM public.user_roles ur
     WHERE ur.role = 'admin'::app_role;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_opportunity_suggestion ON public.opportunities;
CREATE TRIGGER trg_notify_admins_opportunity_suggestion
AFTER INSERT ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_opportunity_suggestion();
