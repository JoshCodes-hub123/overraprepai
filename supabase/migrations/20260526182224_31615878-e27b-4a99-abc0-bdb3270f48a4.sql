
-- ============ lecture_notes: authenticated only ============
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.lecture_notes'::regclass AND polcmd='r' LOOP
    EXECUTE format('ALTER POLICY %I ON public.lecture_notes TO authenticated', r.polname);
  END LOOP;
END $$;
REVOKE SELECT ON public.lecture_notes FROM anon;

-- ============ community_members ============
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.community_members'::regclass AND polcmd='r' LOOP
    EXECUTE format('ALTER POLICY %I ON public.community_members TO authenticated', r.polname);
  END LOOP;
END $$;
REVOKE SELECT ON public.community_members FROM anon;

-- ============ discussions / discussion_replies ============
DO $$ DECLARE r RECORD; t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['discussions','discussion_replies'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid=''public.%I''::regclass AND polcmd=''r''', t) LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.polname, t);
      END LOOP;
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============ qa_questions / qa_answers ============
DO $$ DECLARE r RECORD; t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['qa_questions','qa_answers'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid=''public.%I''::regclass AND polcmd=''r''', t) LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.polname, t);
      END LOOP;
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============ platform_announcements ============
DO $$ DECLARE r RECORD; BEGIN
  IF to_regclass('public.platform_announcements') IS NOT NULL THEN
    FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.platform_announcements'::regclass AND polcmd='r' LOOP
      EXECUTE format('ALTER POLICY %I ON public.platform_announcements TO authenticated', r.polname);
    END LOOP;
    REVOKE SELECT ON public.platform_announcements FROM anon;
  END IF;
END $$;

-- ============ subjects / achievements ============
DO $$ DECLARE r RECORD; t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['subjects','achievements'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid=''public.%I''::regclass AND polcmd=''r''', t) LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.polname, t);
      END LOOP;
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============ teams / team_members ============
DO $$ DECLARE r RECORD; t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['teams','team_members'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid=''public.%I''::regclass AND polcmd=''r''', t) LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.polname, t);
      END LOOP;
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============ tutor_follows / favorite_tutors ============
DO $$ DECLARE r RECORD; t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['tutor_follows','favorite_tutors'] LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      FOR r IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid=''public.%I''::regclass AND polcmd=''r''', t) LOOP
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.polname, t);
      END LOOP;
      EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============ schools: restrict INSERT to authenticated ============
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.schools'::regclass AND polcmd='a' LOOP
    EXECUTE format('ALTER POLICY %I ON public.schools TO authenticated', r.polname);
  END LOOP;
END $$;
REVOKE INSERT ON public.schools FROM anon;

-- ============ school_students: revoke teacher access to PII columns ============
REVOKE SELECT (parent_email, parent_phone, date_of_birth) ON public.school_students FROM authenticated;
REVOKE SELECT (parent_email, parent_phone, date_of_birth) ON public.school_students FROM anon;
-- owners/admins still read via get_student_parent_contact() SECURITY DEFINER

-- ============ token_transfers: add INSERT policy and hide to_email from sender ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='public.token_transfers'::regclass AND polcmd='a') THEN
    EXECUTE 'CREATE POLICY "Senders insert own transfers" ON public.token_transfers FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user)';
  END IF;
END $$;

-- Revoke direct to_email reads; use get_my_sent_transfers() RPC which masks for senders
REVOKE SELECT (to_email) ON public.token_transfers FROM authenticated;
REVOKE SELECT (to_email) ON public.token_transfers FROM anon;
-- Re-grant ONLY to recipients/admins via a view? Simpler: keep RPC as authoritative.
-- Recipients can still see their row (without to_email column directly); they know their own email anyway.
