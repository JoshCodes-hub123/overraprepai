-- 1) Universities catalog
CREATE TABLE IF NOT EXISTS public.universities (
  code text PRIMARY KEY,
  name text NOT NULL,
  short_name text,
  city text,
  state text,
  type text CHECK (type IN ('federal','state','private')) DEFAULT 'federal',
  website text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.universities TO anon, authenticated;
GRANT ALL ON public.universities TO service_role;

ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Universities readable by everyone"
  ON public.universities FOR SELECT
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage universities"
  ON public.universities FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Requests for new universities
CREATE TABLE IF NOT EXISTS public.university_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  name text NOT NULL,
  city text,
  website text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.university_requests TO authenticated;
GRANT ALL ON public.university_requests TO service_role;

ALTER TABLE public.university_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own requests"
  ON public.university_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can request"
  ON public.university_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins review requests"
  ON public.university_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Profile flag for pending school verification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pending_verification boolean NOT NULL DEFAULT false;

-- 4) Optional university_code scoping on content tables.
--    Each guarded with EXISTS check so this migration is idempotent across schemas.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'courses','quizzes','opportunities','tutor_curricula','announcements',
    'tutor_storefronts','tutor_materials','tutor_curriculum_topics'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS university_code text REFERENCES public.universities(code) ON DELETE SET NULL',
        t
      );
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_university_code ON public.%I(university_code)',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- 5) Seed core known schools (FUTA, OAU) so existing data references stay valid.
INSERT INTO public.universities (code, name, short_name, city, state, type) VALUES
  ('FUTA','Federal University of Technology, Akure','FUTA','Akure','Ondo','federal'),
  ('OAU','Obafemi Awolowo University','OAU','Ile-Ife','Osun','federal')
ON CONFLICT (code) DO NOTHING;