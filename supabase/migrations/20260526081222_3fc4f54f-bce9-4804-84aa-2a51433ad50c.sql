ALTER TABLE public.ai_tutor_threads
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS last_message_role TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.touch_ai_tutor_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_tutor_threads
     SET updated_at = now(),
         last_message_at = NEW.created_at,
         last_message_role = NEW.role,
         last_message_preview = left(regexp_replace(NEW.content, E'\\s+', ' ', 'g'), 160)
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

-- Backfill last_message_* from existing messages
UPDATE public.ai_tutor_threads t
   SET last_message_at = m.created_at,
       last_message_role = m.role,
       last_message_preview = left(regexp_replace(m.content, E'\\s+', ' ', 'g'), 160)
  FROM (
    SELECT DISTINCT ON (thread_id) thread_id, created_at, role, content
      FROM public.ai_tutor_messages
     ORDER BY thread_id, created_at DESC
  ) m
 WHERE m.thread_id = t.id;