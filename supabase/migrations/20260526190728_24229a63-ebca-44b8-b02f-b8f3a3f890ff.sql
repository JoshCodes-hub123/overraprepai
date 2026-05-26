CREATE OR REPLACE FUNCTION public.update_study_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current INT;
  v_longest INT;
  v_new_current INT;
  v_new_longest INT;
  v_milestone BOOLEAN := false;
BEGIN
  -- Ensure a row exists (atomic, no race)
  INSERT INTO public.study_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (NEW.user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT last_activity_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
  FROM public.study_streaks
  WHERE user_id = NEW.user_id
  FOR UPDATE;

  IF v_last_date = CURRENT_DATE THEN
    RETURN NEW; -- already counted today
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    v_new_current := COALESCE(v_current, 0) + 1;
  ELSE
    v_new_current := 1;
  END IF;

  v_new_longest := GREATEST(COALESCE(v_longest, 0), v_new_current);

  IF v_new_current IN (3, 7, 14, 30, 60, 100) AND v_new_current > COALESCE(v_current, 0) THEN
    v_milestone := true;
  END IF;

  UPDATE public.study_streaks
  SET current_streak = v_new_current,
      longest_streak = v_new_longest,
      last_activity_date = CURRENT_DATE,
      updated_at = now()
  WHERE user_id = NEW.user_id;

  IF v_milestone THEN
    BEGIN
      PERFORM net.http_post(
        url := 'https://ccmhkfzuusizksuczlqo.supabase.co/functions/v1/streak-milestone',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object('user_id', NEW.user_id, 'streak', v_new_current)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;