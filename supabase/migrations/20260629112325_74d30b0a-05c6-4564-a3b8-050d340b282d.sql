
-- Admin import history log
CREATE TABLE public.admin_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size_bytes integer,
  file_type text,
  course_codes text[] NOT NULL DEFAULT '{}',
  total_rows integer NOT NULL DEFAULT 0,
  imported_questions integer NOT NULL DEFAULT 0,
  imported_quizzes integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  rejected_payload jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_import_logs TO authenticated;
GRANT ALL ON public.admin_import_logs TO service_role;

ALTER TABLE public.admin_import_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view/insert
CREATE POLICY "Admins can view all import logs"
ON public.admin_import_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert their own import logs"
ON public.admin_import_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE INDEX idx_admin_import_logs_created ON public.admin_import_logs (created_at DESC);
CREATE INDEX idx_admin_import_logs_admin ON public.admin_import_logs (admin_id, created_at DESC);
