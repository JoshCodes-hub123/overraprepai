INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('upcoming_exam_enabled', 'true', 'Show the tomorrow-exam pill on student dashboard'),
  ('upcoming_exam_label', 'CHE 104', 'Course code / exam name shown in the pill'),
  ('upcoming_exam_emoji', '🧪', 'Emoji shown at the end of the pill'),
  ('upcoming_exam_prefix', 'Heads-up: tomorrow is', 'Text before the label')
ON CONFLICT (key) DO NOTHING;