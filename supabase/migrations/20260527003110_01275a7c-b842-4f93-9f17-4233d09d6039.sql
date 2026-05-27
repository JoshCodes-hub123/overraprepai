-- ============================================================
-- Sub-Phase 9.1: Tutor upload RLS alignment + audio_sessions
-- ============================================================

-- 1) lecture_notes: allow ADMINS (in addition to tutors) to insert/update/delete
DROP POLICY IF EXISTS "Tutors can insert their own notes" ON public.lecture_notes;
CREATE POLICY "Tutors or admins can insert lecture notes"
  ON public.lecture_notes FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'tutor') OR public.has_role(auth.uid(), 'admin'))
    AND tutor_id = auth.uid()
  );

-- (Update/Delete policies already allow admins via OR has_role admin — leave as-is.)

-- 2) lecture-notes storage bucket: ensure tutor + admin can write inside their own folder
DO $$ BEGIN
  DROP POLICY IF EXISTS "Tutors can upload lecture-notes" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Tutors or admins upload lecture-notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lecture-notes'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND (public.has_role(auth.uid(),'tutor') OR public.has_role(auth.uid(),'admin'))
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Tutors can update their lecture-notes" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Owners update their lecture-notes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'lecture-notes' AND auth.uid()::text = (storage.foldername(name))[1]);

DO $$ BEGIN
  DROP POLICY IF EXISTS "Tutors can delete their lecture-notes" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "Owners delete their lecture-notes"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'lecture-notes'
    AND (auth.uid()::text = (storage.foldername(name))[1]
         OR public.has_role(auth.uid(),'admin'))
  );

-- 3) course-images storage bucket: scope writes to the user's own folder (tutor or admin)
DO $$ BEGIN
  DROP POLICY IF EXISTS "course-images tutor write" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;
CREATE POLICY "course-images owner write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'course-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4) audio_sessions: continue listening
CREATE TABLE IF NOT EXISTS public.audio_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_hash text NOT NULL,
  title text NOT NULL,
  voice text,
  position_seconds numeric NOT NULL DEFAULT 0,
  duration_seconds numeric,
  total_chars integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audio_sessions TO authenticated;
GRANT ALL ON public.audio_sessions TO service_role;

ALTER TABLE public.audio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audio sessions" ON public.audio_sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own audio sessions" ON public.audio_sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own audio sessions" ON public.audio_sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own audio sessions" ON public.audio_sessions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audio_sessions_user_updated
  ON public.audio_sessions(user_id, updated_at DESC);