
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookmark_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.opportunity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  parent_id uuid REFERENCES public.opportunity_comments(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_comments TO authenticated;
GRANT ALL ON public.opportunity_comments TO service_role;
ALTER TABLE public.opportunity_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable by authenticated" ON public.opportunity_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own comments" ON public.opportunity_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users update own comments" ON public.opportunity_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Users or admin delete comments" ON public.opportunity_comments FOR DELETE TO authenticated USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_opp_comments_opp ON public.opportunity_comments(opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opp_comments_parent ON public.opportunity_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.opportunity_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL CHECK (emoji IN ('👍','❤️','🎯','💡')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunity_reactions TO authenticated;
GRANT ALL ON public.opportunity_reactions TO service_role;
ALTER TABLE public.opportunity_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions readable by authenticated" ON public.opportunity_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own reactions" ON public.opportunity_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reactions" ON public.opportunity_reactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.opportunity_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_opp_comment_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.opportunities SET comment_count = comment_count + 1 WHERE id = NEW.opportunity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.opportunities SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.opportunity_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_opp_comment_count ON public.opportunity_comments;
CREATE TRIGGER trg_opp_comment_count AFTER INSERT OR DELETE ON public.opportunity_comments FOR EACH ROW EXECUTE FUNCTION public.bump_opp_comment_count();

CREATE OR REPLACE FUNCTION public.bump_opp_bookmark_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.opportunities SET bookmark_count = bookmark_count + 1 WHERE id = NEW.opportunity_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.opportunities SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.opportunity_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_opp_bookmark_count ON public.opportunity_bookmarks;
CREATE TRIGGER trg_opp_bookmark_count AFTER INSERT OR DELETE ON public.opportunity_bookmarks FOR EACH ROW EXECUTE FUNCTION public.bump_opp_bookmark_count();

DROP TRIGGER IF EXISTS trg_opp_comments_updated ON public.opportunity_comments;
CREATE TRIGGER trg_opp_comments_updated BEFORE UPDATE ON public.opportunity_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.increment_opportunity_view(p_opportunity_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.opportunities SET view_count = view_count + 1 WHERE id = p_opportunity_id AND status = 'published';
END $$;
GRANT EXECUTE ON FUNCTION public.increment_opportunity_view(uuid) TO authenticated, anon;

UPDATE public.opportunities o
  SET bookmark_count = COALESCE(c.n, 0)
  FROM (SELECT opportunity_id, COUNT(*) AS n FROM public.opportunity_bookmarks GROUP BY opportunity_id) c
  WHERE o.id = c.opportunity_id;

CREATE OR REPLACE FUNCTION public.notify_opp_comment_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_parent_author uuid; v_name text;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  SELECT author_id INTO v_parent_author FROM public.opportunity_comments WHERE id = NEW.parent_id;
  IF v_parent_author IS NULL OR v_parent_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, 'Someone') INTO v_name FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_parent_author, 'New reply', v_name || ' replied to your comment', 'info', '/opportunities/' || NEW.opportunity_id::text);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_opp_comment_reply ON public.opportunity_comments;
CREATE TRIGGER trg_opp_comment_reply AFTER INSERT ON public.opportunity_comments FOR EACH ROW EXECUTE FUNCTION public.notify_opp_comment_reply();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_bookmarks;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunity_reactions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
