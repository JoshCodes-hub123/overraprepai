
-- 1. Discussion permissions: only tutors and admins can start community posts.
--    Students keep full read + comment + like rights.
DROP POLICY IF EXISTS "Authenticated can create posts" ON public.community_posts;
CREATE POLICY "Tutors and admins can create posts"
ON public.community_posts
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (public.has_role(auth.uid(), 'tutor'::app_role)
       OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 2. Chat threads: students can only start 1:1 DMs. Tutors/admins can start any kind.
--    SECURITY DEFINER triggers (course auto-thread) bypass RLS so this is safe.
DROP POLICY IF EXISTS "creators insert thread" ON public.chat_threads;
CREATE POLICY "scoped insert thread"
ON public.chat_threads
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (kind = 'dm'
       OR public.has_role(auth.uid(), 'tutor'::app_role)
       OR public.has_role(auth.uid(), 'admin'::app_role))
);

-- 3. Public can browse all published opportunities (login still required to bookmark/apply/comment).
DROP POLICY IF EXISTS "View opportunities" ON public.opportunities;
CREATE POLICY "Anyone can view published opportunities"
ON public.opportunities
FOR SELECT TO anon, authenticated
USING (
  status = 'published'::opportunity_status
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR posted_by = auth.uid()
);

-- 4. Auto-create a per-course discussion thread when a tutor adds a course.
CREATE OR REPLACE FUNCTION public.create_course_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread uuid;
BEGIN
  INSERT INTO public.chat_threads (kind, title, created_by)
  VALUES (
    'group'::chat_thread_kind,
    COALESCE(NEW.code, 'Course') || ' — Discussion',
    NEW.created_by
  )
  RETURNING id INTO v_thread;

  -- Creator becomes owner
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread, NEW.created_by, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Stash the linkage in chat_threads.title isn't enough; persist on courses too
  -- via a side table so we can look it up later.
  INSERT INTO public.course_discussion_threads (course_id, thread_id)
  VALUES (NEW.id, v_thread)
  ON CONFLICT (course_id) DO NOTHING;

  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS public.course_discussion_threads (
  course_id uuid PRIMARY KEY REFERENCES public.courses(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_discussion_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read course thread mapping"
ON public.course_discussion_threads
FOR SELECT TO authenticated
USING (true);

DROP TRIGGER IF EXISTS trg_create_course_discussion ON public.courses;
CREATE TRIGGER trg_create_course_discussion
AFTER INSERT ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.create_course_discussion();

-- 5. Auto-join enrolled students into the course discussion thread.
CREATE OR REPLACE FUNCTION public.join_course_discussion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread uuid;
BEGIN
  SELECT thread_id INTO v_thread
    FROM public.course_discussion_threads
    WHERE course_id = NEW.course_id;
  IF v_thread IS NOT NULL THEN
    INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    VALUES (v_thread, NEW.student_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_join_course_discussion ON public.student_courses;
CREATE TRIGGER trg_join_course_discussion
AFTER INSERT ON public.student_courses
FOR EACH ROW EXECUTE FUNCTION public.join_course_discussion();

-- Backfill: create threads for existing courses + auto-add existing enrollments
DO $$
DECLARE
  c RECORD;
  v_thread uuid;
BEGIN
  FOR c IN SELECT id, code, created_by FROM public.courses
           WHERE id NOT IN (SELECT course_id FROM public.course_discussion_threads)
  LOOP
    INSERT INTO public.chat_threads (kind, title, created_by)
    VALUES ('group'::chat_thread_kind,
            COALESCE(c.code, 'Course') || ' — Discussion',
            COALESCE(c.created_by, '00000000-0000-0000-0000-000000000000'::uuid))
    RETURNING id INTO v_thread;
    INSERT INTO public.course_discussion_threads (course_id, thread_id)
    VALUES (c.id, v_thread);
    IF c.created_by IS NOT NULL THEN
      INSERT INTO public.chat_thread_members (thread_id, user_id, role)
      VALUES (v_thread, c.created_by, 'owner') ON CONFLICT DO NOTHING;
    END IF;
    INSERT INTO public.chat_thread_members (thread_id, user_id, role)
    SELECT v_thread, sc.student_id, 'member'
      FROM public.student_courses sc WHERE sc.course_id = c.id
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- 6. @mention notifications inside chat threads.
--    Supports @TUT-XXXX tutor codes. Deep-link includes ?msg=<id> so the
--    ThreadView can scroll & highlight on click.
CREATE OR REPLACE FUNCTION public.notify_chat_mentions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_codes text[];
  v_target uuid;
  v_name text;
BEGIN
  IF NEW.content IS NULL OR NEW.content = '' THEN RETURN NEW; END IF;
  SELECT array_agg(DISTINCT UPPER(m[1]))
    INTO v_codes
    FROM regexp_matches(NEW.content, '@(TUT-[A-Z0-9]{4,})', 'gi') m;
  IF v_codes IS NULL OR array_length(v_codes, 1) = 0 THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_name
    FROM public.profiles WHERE id = NEW.author_id;

  FOREACH v_code IN ARRAY v_codes LOOP
    SELECT id INTO v_target FROM public.profiles WHERE tutor_code = v_code LIMIT 1;
    IF v_target IS NULL OR v_target = NEW.author_id THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      v_target,
      'You were mentioned',
      COALESCE(v_name, 'Someone') || ' mentioned you in a discussion',
      'info',
      '/chat/' || NEW.thread_id || '?msg=' || NEW.id
    );
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_chat_mentions ON public.chat_messages;
CREATE TRIGGER trg_notify_chat_mentions
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_mentions();

-- 7. Ensure realtime delivery for notifications + chat messages + opportunities
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.opportunities REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
