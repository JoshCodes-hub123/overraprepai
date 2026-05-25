
-- Fan-out notifications for newly published posts
CREATE OR REPLACE FUNCTION public.notify_users_on_post_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  label TEXT;
  link_url TEXT;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  label := CASE NEW.type::text
    WHEN 'talent' THEN 'New Talent Showcase'
    WHEN 'opportunity' THEN 'New Opportunity'
    WHEN 'article' THEN 'New Article'
    WHEN 'announcement' THEN 'New Announcement'
    ELSE 'New Post'
  END;

  link_url := '/posts/' || NEW.id::text;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT u.id, label, NEW.title, 'post_published', link_url
  FROM auth.users u
  WHERE u.id <> NEW.author_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_users_on_post_published ON public.posts;
CREATE TRIGGER trg_notify_users_on_post_published
AFTER INSERT OR UPDATE OF status ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_users_on_post_published();

-- Fan-out notifications for newly published opportunities
CREATE OR REPLACE FUNCTION public.notify_users_on_opportunity_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT u.id, 'New Opportunity', NEW.title, 'opportunity_published', '/opportunities'
  FROM auth.users u
  WHERE NEW.posted_by IS NULL OR u.id <> NEW.posted_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_users_on_opportunity_published ON public.opportunities;
CREATE TRIGGER trg_notify_users_on_opportunity_published
AFTER INSERT OR UPDATE OF status ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.notify_users_on_opportunity_published();
