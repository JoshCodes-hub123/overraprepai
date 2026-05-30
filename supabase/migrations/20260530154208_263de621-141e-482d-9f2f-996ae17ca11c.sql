DROP POLICY IF EXISTS "Users can view approved questions" ON public.questions;

CREATE POLICY "Users can view approved questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
  is_approved = true
  AND (
    is_premium = false
    OR tutor_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'tutor'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.student_quiz_purchases sqp
      JOIN public.quiz_questions qq ON qq.quiz_id = sqp.quiz_id
      WHERE qq.question_id = public.questions.id
        AND sqp.student_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "members post messages" ON public.chat_messages;

CREATE POLICY "members post messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  is_chat_member(thread_id, auth.uid())
  AND is_ai = false
  AND author_id = auth.uid()
);