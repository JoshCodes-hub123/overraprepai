
-- AI Tutor threads
CREATE TABLE public.ai_tutor_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New chat',
  persona TEXT NOT NULL DEFAULT 'tutor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_tutor_threads_user_updated
  ON public.ai_tutor_threads(user_id, updated_at DESC);

ALTER TABLE public.ai_tutor_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai tutor threads"
  ON public.ai_tutor_threads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ai tutor threads"
  ON public.ai_tutor_threads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai tutor threads"
  ON public.ai_tutor_threads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ai tutor threads"
  ON public.ai_tutor_threads FOR DELETE
  USING (auth.uid() = user_id);

-- AI Tutor messages
CREATE TABLE public.ai_tutor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_tutor_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  rating SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_tutor_messages_thread_created
  ON public.ai_tutor_messages(thread_id, created_at ASC);

ALTER TABLE public.ai_tutor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai tutor messages"
  ON public.ai_tutor_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own ai tutor messages"
  ON public.ai_tutor_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own ai tutor messages"
  ON public.ai_tutor_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own ai tutor messages"
  ON public.ai_tutor_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Touch thread.updated_at on new message
CREATE OR REPLACE FUNCTION public.touch_ai_tutor_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_tutor_threads
     SET updated_at = now()
   WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_ai_tutor_thread
AFTER INSERT ON public.ai_tutor_messages
FOR EACH ROW
EXECUTE FUNCTION public.touch_ai_tutor_thread();
