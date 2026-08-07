ALTER TABLE public.topic_mastery
  ADD COLUMN IF NOT EXISTS questions_attempted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_incorrect integer NOT NULL DEFAULT 0;