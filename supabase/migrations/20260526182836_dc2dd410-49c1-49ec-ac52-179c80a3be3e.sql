
-- Security audit infrastructure
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE public.security_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_findings int NOT NULL DEFAULT 0,
  high_severity_count int NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_audit_runs TO authenticated;
GRANT ALL ON public.security_audit_runs TO service_role;
ALTER TABLE public.security_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit runs" ON public.security_audit_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.security_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.security_audit_runs(id) ON DELETE CASCADE,
  check_name text NOT NULL,
  severity text NOT NULL,
  object_schema text,
  object_name text,
  detail text NOT NULL,
  is_new boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.security_audit_findings TO authenticated;
GRANT ALL ON public.security_audit_findings TO service_role;
ALTER TABLE public.security_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit findings" ON public.security_audit_findings
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_findings_run ON public.security_audit_findings(run_id);
CREATE INDEX idx_audit_runs_started ON public.security_audit_runs(started_at DESC);

-- Security definer function the edge function calls to run checks
CREATE OR REPLACE FUNCTION public.run_security_audit()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_run_id uuid;
  v_total int := 0;
  v_high int := 0;
  v_prev_run uuid;
BEGIN
  SELECT id INTO v_prev_run FROM public.security_audit_runs
    WHERE status = 'completed' ORDER BY started_at DESC LIMIT 1;

  INSERT INTO public.security_audit_runs (status) VALUES ('running')
    RETURNING id INTO v_run_id;

  -- Check 1: tables in public without RLS
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'rls_disabled', 'high', schemaname, tablename,
         'Table has no row-level security enabled'
  FROM pg_tables
  WHERE schemaname = 'public'
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = pg_tables.schemaname
        AND c.relname = pg_tables.tablename
        AND c.relrowsecurity = true
    );

  -- Check 2: tables in public with RLS enabled but zero policies
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'rls_no_policies', 'high', n.nspname, c.relname,
         'RLS enabled but no policies defined — all access denied or unintentionally open via grants'
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
    AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname);

  -- Check 3: tables granting privileges to anon role
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'anon_table_grant', 'medium', table_schema, table_name,
         'anon role has ' || string_agg(DISTINCT privilege_type, ', ') || ' on this table'
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND table_schema = 'public'
  GROUP BY table_schema, table_name;

  -- Check 4: SECURITY DEFINER functions without search_path pinned
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'definer_no_search_path', 'medium', n.nspname, p.proname,
         'SECURITY DEFINER function does not pin search_path (search_path injection risk)'
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef = true
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg WHERE cfg LIKE 'search_path=%'
    );

  -- Check 5: extensions installed in public schema
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'extension_in_public', 'low', 'public', extname,
         'Extension installed in public schema; prefer dedicated extensions schema'
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE n.nspname = 'public' AND extname NOT IN ('plpgsql');

  -- Check 6: public storage buckets
  INSERT INTO public.security_audit_findings (run_id, check_name, severity, object_schema, object_name, detail)
  SELECT v_run_id, 'public_storage_bucket', 'low', 'storage', id,
         'Storage bucket is public — listable/readable by anyone'
  FROM storage.buckets WHERE public = true;

  -- Mark which findings are new vs carried over from previous run
  IF v_prev_run IS NOT NULL THEN
    UPDATE public.security_audit_findings f
    SET is_new = false
    WHERE f.run_id = v_run_id
      AND EXISTS (
        SELECT 1 FROM public.security_audit_findings p
        WHERE p.run_id = v_prev_run
          AND p.check_name = f.check_name
          AND coalesce(p.object_schema,'') = coalesce(f.object_schema,'')
          AND coalesce(p.object_name,'') = coalesce(f.object_name,'')
      );
  END IF;

  SELECT count(*), count(*) FILTER (WHERE severity = 'high')
    INTO v_total, v_high
    FROM public.security_audit_findings WHERE run_id = v_run_id;

  UPDATE public.security_audit_runs
    SET status = 'completed', finished_at = now(),
        total_findings = v_total, high_severity_count = v_high
    WHERE id = v_run_id;

  RETURN v_run_id;
EXCEPTION WHEN OTHERS THEN
  UPDATE public.security_audit_runs
    SET status = 'failed', finished_at = now(), error = SQLERRM
    WHERE id = v_run_id;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.run_security_audit() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_security_audit() TO service_role;

-- Helper to fan out admin notifications for new high-severity findings
CREATE OR REPLACE FUNCTION public.notify_admins_of_new_findings(_run_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_new_high int;
  v_inserted int := 0;
BEGIN
  SELECT count(*) INTO v_new_high
    FROM public.security_audit_findings
    WHERE run_id = _run_id AND is_new = true AND severity = 'high';

  IF v_new_high = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id,
         'New security findings detected',
         v_new_high || ' new high-severity security finding(s) from the latest automated audit.',
         'warning',
         '/admin/security'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_admins_of_new_findings(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins_of_new_findings(uuid) TO service_role;
