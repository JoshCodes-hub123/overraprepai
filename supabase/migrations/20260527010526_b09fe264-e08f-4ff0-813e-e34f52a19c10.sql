
-- Readiness exams (AI-generated, stored as jsonb for portability)
CREATE TABLE public.readiness_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Readiness Exam',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_material_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.readiness_exams TO authenticated;
GRANT ALL ON public.readiness_exams TO service_role;

ALTER TABLE public.readiness_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own readiness exams"
  ON public.readiness_exams FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_readiness_exams_user_course ON public.readiness_exams(user_id, course_id, created_at DESC);

-- Attempts
CREATE TABLE public.readiness_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.readiness_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  readiness_pct INTEGER NOT NULL DEFAULT 0,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_attempts TO authenticated;
GRANT ALL ON public.readiness_attempts TO service_role;

ALTER TABLE public.readiness_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own readiness attempts"
  ON public.readiness_attempts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_readiness_attempts_user_course ON public.readiness_attempts(user_id, course_id, completed_at DESC);

-- Weakness signals (one row per user+course+topic; bumped over time)
CREATE TABLE public.weakness_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID,
  topic TEXT NOT NULL,
  miss_count INTEGER NOT NULL DEFAULT 1,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'readiness',
  UNIQUE (user_id, course_id, topic, source)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weakness_signals TO authenticated;
GRANT ALL ON public.weakness_signals TO service_role;

ALTER TABLE public.weakness_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own weakness signals"
  ON public.weakness_signals FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_weakness_signals_user_course ON public.weakness_signals(user_id, course_id, last_seen_at DESC);

-- Trigger: after a readiness attempt completes with weaknesses, upsert into weakness_signals
CREATE OR REPLACE FUNCTION public.fanout_readiness_weaknesses()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w JSONB;
  topic_text TEXT;
BEGIN
  IF NEW.completed_at IS NULL THEN RETURN NEW; END IF;
  IF jsonb_typeof(NEW.weaknesses) <> 'array' THEN RETURN NEW; END IF;

  FOR w IN SELECT * FROM jsonb_array_elements(NEW.weaknesses)
  LOOP
    topic_text := COALESCE(w->>'topic', w->>'name', NULLIF(trim(both '"' from w::text), ''));
    IF topic_text IS NULL OR length(topic_text) = 0 THEN CONTINUE; END IF;

    INSERT INTO public.weakness_signals (user_id, course_id, topic, miss_count, last_seen_at, source)
    VALUES (NEW.user_id, NEW.course_id, topic_text, 1, now(), 'readiness')
    ON CONFLICT (user_id, course_id, topic, source)
    DO UPDATE SET miss_count = weakness_signals.miss_count + 1, last_seen_at = now();
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_readiness_weaknesses ON public.readiness_attempts;
CREATE TRIGGER trg_readiness_weaknesses
AFTER INSERT OR UPDATE OF completed_at ON public.readiness_attempts
FOR EACH ROW EXECUTE FUNCTION public.fanout_readiness_weaknesses();
