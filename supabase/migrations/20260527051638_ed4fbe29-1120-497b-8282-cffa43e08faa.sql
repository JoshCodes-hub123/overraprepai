-- 1. Broaden lecture_notes INSERT
DROP POLICY IF EXISTS "Tutors or admins can insert lecture notes" ON public.lecture_notes;
CREATE POLICY "Tutors admins or course creators can insert lecture notes"
ON public.lecture_notes FOR INSERT TO authenticated
WITH CHECK (
  tutor_id = auth.uid()
  AND (
    has_role(auth.uid(), 'tutor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.created_by = auth.uid())
  )
);

-- 2. Storage lecture-notes bucket INSERT
DROP POLICY IF EXISTS "Tutors or admins upload lecture-notes" ON storage.objects;
CREATE POLICY "Authenticated can upload lecture-notes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'lecture-notes'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND (
    has_role(auth.uid(), 'tutor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.tutor_applications ta WHERE ta.user_id = auth.uid() AND ta.status::text = 'approved')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.created_by = auth.uid())
  )
);

-- 3. course-images bucket INSERT
DROP POLICY IF EXISTS "Tutors or admins upload course-images" ON storage.objects;
CREATE POLICY "Authenticated can upload course-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'course-images'
  AND (
    has_role(auth.uid(), 'tutor'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.tutor_applications ta WHERE ta.user_id = auth.uid() AND ta.status::text = 'approved')
    OR EXISTS (SELECT 1 FROM public.courses c WHERE c.created_by = auth.uid())
  )
);

-- 4. Open community_posts to all authenticated users
DROP POLICY IF EXISTS "Tutors and admins can create posts" ON public.community_posts;
CREATE POLICY "Anyone authenticated can post" ON public.community_posts
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- 5. community_post_likes + community_post_comments
CREATE TABLE IF NOT EXISTS public.community_post_likes (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cp_likes" ON public.community_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users like cp as self" ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users unlike cp own" ON public.community_post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.community_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpc_post ON public.community_post_comments(post_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;
ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read cpc" ON public.community_post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "users insert own cpc" ON public.community_post_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own cpc" ON public.community_post_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users delete own cpc or admin" ON public.community_post_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.tg_cp_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_cp_likes_count ON public.community_post_likes;
CREATE TRIGGER trg_cp_likes_count AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.tg_cp_likes_count();

CREATE OR REPLACE FUNCTION public.tg_cp_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_cp_comments_count ON public.community_post_comments;
CREATE TRIGGER trg_cp_comments_count AFTER INSERT OR DELETE ON public.community_post_comments
FOR EACH ROW EXECUTE FUNCTION public.tg_cp_comments_count();

-- 6. entity_comments
CREATE TABLE IF NOT EXISTS public.entity_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ec_entity ON public.entity_comments(entity_type, entity_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_comments TO authenticated;
GRANT ALL ON public.entity_comments TO service_role;
ALTER TABLE public.entity_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth reads ec" ON public.entity_comments FOR SELECT TO authenticated
  USING (hidden = false OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users insert own ec" ON public.entity_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own ec" ON public.entity_comments FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users delete own ec" ON public.entity_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 7. weekly_quests
CREATE TABLE IF NOT EXISTS public.weekly_quests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  completed_days INT NOT NULL DEFAULT 0,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_quests TO authenticated;
GRANT ALL ON public.weekly_quests TO service_role;
ALTER TABLE public.weekly_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own quest" ON public.weekly_quests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own quest" ON public.weekly_quests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "users update own quest" ON public.weekly_quests FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.weekly_quest_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quest_id UUID NOT NULL REFERENCES public.weekly_quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_index INT NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  goal_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quest_id, day_index, goal_key)
);
GRANT SELECT, INSERT, DELETE ON public.weekly_quest_progress TO authenticated;
GRANT ALL ON public.weekly_quest_progress TO service_role;
ALTER TABLE public.weekly_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own qprog" ON public.weekly_quest_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own qprog" ON public.weekly_quest_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());