create or replace function public.course_topic_question_counts(_course_id uuid)
returns table(topic_id uuid, question_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select q.topic_id, count(*)::bigint
  from public.questions q
  where q.course_id = _course_id
    and q.is_approved = true
    and q.topic_id is not null
  group by q.topic_id
$$;

grant execute on function public.course_topic_question_counts(uuid) to authenticated;