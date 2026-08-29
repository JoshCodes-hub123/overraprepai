
REVOKE ALL ON FUNCTION public.notify_course_students(uuid, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_new_material() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_new_quiz() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_notify_discussion_reply() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recommend_tutors_for_me(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_tutors_for_me(integer) TO authenticated;
