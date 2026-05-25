
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS notify_opportunities boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_posts boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_opportunities boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_posts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT true;

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

  -- In-app notifications honoring preference (default true)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT u.id, label, NEW.title, 'post_' || NEW.type::text, link_url
  FROM auth.users u
  LEFT JOIN public.notification_preferences np ON np.user_id = u.id
  WHERE u.id <> NEW.author_id
    AND COALESCE(np.notify_posts, true) = true;

  -- Fire email broadcast (best-effort, ignore errors)
  BEGIN
    PERFORM net.http_post(
      url := 'https://ccmhkfzuusizksuczlqo.supabase.co/functions/v1/email-content-broadcast',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('kind', 'post', 'id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_users_on_opportunity_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_url TEXT;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  link_url := '/opportunities/' || NEW.id::text;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT u.id, 'New Opportunity', NEW.title, 'opportunity_published', link_url
  FROM auth.users u
  LEFT JOIN public.notification_preferences np ON np.user_id = u.id
  WHERE (NEW.posted_by IS NULL OR u.id <> NEW.posted_by)
    AND COALESCE(np.notify_opportunities, true) = true;

  BEGIN
    PERFORM net.http_post(
      url := 'https://ccmhkfzuusizksuczlqo.supabase.co/functions/v1/email-content-broadcast',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('kind', 'opportunity', 'id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;
