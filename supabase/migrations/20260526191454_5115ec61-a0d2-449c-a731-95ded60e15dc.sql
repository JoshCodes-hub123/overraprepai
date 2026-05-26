DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_chat_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_chat_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.course_pinned_prompts; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.course_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.course_chat_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.course_pinned_prompts REPLICA IDENTITY FULL;