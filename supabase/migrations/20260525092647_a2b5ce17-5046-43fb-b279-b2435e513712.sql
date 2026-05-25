
CREATE TYPE public.post_type AS ENUM ('showcase','opportunity','article','announcement');
CREATE TYPE public.post_status AS ENUM ('draft','pending','published','archived');

CREATE TABLE public.posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            public.post_type NOT NULL DEFAULT 'article',
  status          public.post_status NOT NULL DEFAULT 'pending',
  title           TEXT NOT NULL,
  subtitle        TEXT,
  body            TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  gallery_urls    TEXT[] NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  organization    TEXT,
  category        TEXT,
  deadline        DATE,
  apply_url       TEXT,
  university      TEXT,
  like_count      INTEGER NOT NULL DEFAULT 0,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  view_count      INTEGER NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pub_posts_status ON public.posts(status, published_at DESC NULLS LAST);
CREATE INDEX idx_pub_posts_type   ON public.posts(type);
CREATE INDEX idx_pub_posts_author ON public.posts(author_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View posts" ON public.posts FOR SELECT TO authenticated
USING (status='published' OR author_id=auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Insert posts by role" ON public.posts FOR INSERT TO authenticated
WITH CHECK (
  author_id=auth.uid() AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'tutor'::app_role)
    OR status IN ('draft','pending')
  )
);

CREATE POLICY "Authors update own posts" ON public.posts FOR UPDATE TO authenticated
USING (author_id=auth.uid())
WITH CHECK (
  author_id=auth.uid() AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'tutor'::app_role)
    OR status IN ('draft','pending','archived')
  )
);

CREATE POLICY "Admins update any post" ON public.posts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Authors delete own posts" ON public.posts FOR DELETE TO authenticated
USING (author_id=auth.uid());

CREATE POLICY "Admins delete any post" ON public.posts FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.posts_touch_published()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status='published' AND (TG_OP='INSERT' OR OLD.status<>'published') THEN
    NEW.published_at = COALESCE(NEW.published_at, now());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_posts_touch BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.posts_touch_published();

CREATE OR REPLACE FUNCTION public.notify_admins_on_pending_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE author_name TEXT;
BEGIN
  IF NEW.status='pending'
     AND NOT public.has_role(NEW.author_id,'admin'::app_role)
     AND NOT public.has_role(NEW.author_id,'tutor'::app_role) THEN
    SELECT COALESCE(full_name,'A student') INTO author_name FROM public.profiles WHERE id=NEW.author_id;
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'New post awaiting review',
           author_name || ' submitted: ' || NEW.title, 'info','/admin/posts'
      FROM public.user_roles ur WHERE ur.role='admin'::app_role;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_admins_pending_post AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_pending_post();

-- LIKES
CREATE TABLE public.post_likes (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view post likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Like post as self" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "Unlike post as self" ON public.post_likes FOR DELETE TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.bump_posts_like_count()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.posts SET like_count=like_count+1 WHERE id=NEW.post_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.posts SET like_count=GREATEST(like_count-1,0) WHERE id=OLD.post_id; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_posts_like_count AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_posts_like_count();

-- BOOKMARKS
CREATE TABLE public.post_bookmarks (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own post bookmarks" ON public.post_bookmarks FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "Bookmark post as self" ON public.post_bookmarks FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "Remove own post bookmark" ON public.post_bookmarks FOR DELETE TO authenticated USING (user_id=auth.uid());

-- COMMENTS
CREATE TABLE public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pub_post_comments_post ON public.post_comments(post_id, created_at);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View comments on visible posts" ON public.post_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id AND (p.status='published' OR p.author_id=auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))));

CREATE POLICY "Comment on published as self" ON public.post_comments FOR INSERT TO authenticated
WITH CHECK (author_id=auth.uid() AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.status='published'));

CREATE POLICY "Delete own post comment" ON public.post_comments FOR DELETE TO authenticated
USING (author_id=auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.bump_posts_comment_count()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN UPDATE public.posts SET comment_count=comment_count+1 WHERE id=NEW.post_id;
  ELSIF TG_OP='DELETE' THEN UPDATE public.posts SET comment_count=GREATEST(comment_count-1,0) WHERE id=OLD.post_id; END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_posts_comment_count AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_posts_comment_count();

-- STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('post-media','post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Post media public read" ON storage.objects FOR SELECT
USING (bucket_id='post-media');

CREATE POLICY "Authenticated upload post media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Author update own post media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='post-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Author delete own post media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='post-media' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin'::app_role)));
