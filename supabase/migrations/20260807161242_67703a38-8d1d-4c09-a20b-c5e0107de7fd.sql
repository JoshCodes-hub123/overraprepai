DROP POLICY IF EXISTS "Users insert own ai tutor messages" ON public.ai_tutor_messages;

CREATE POLICY "Users insert own ai tutor messages"
ON public.ai_tutor_messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('user', 'assistant')
  AND EXISTS (
    SELECT 1 FROM public.ai_tutor_threads t
    WHERE t.id = ai_tutor_messages.thread_id
      AND t.user_id = auth.uid()
  )
);