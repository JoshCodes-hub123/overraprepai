
-- 1) profiles: remove blanket authenticated SELECT
DROP POLICY IF EXISTS "Authenticated read student public fields" ON public.profiles;

-- 2) course_chat_messages: DELETE must re-check participation
DROP POLICY IF EXISTS "Authors can delete own messages" ON public.course_chat_messages;
CREATE POLICY "Authors can delete own messages"
ON public.course_chat_messages
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid() AND public.is_course_participant(course_id, auth.uid()))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3) user_achievements: only service role / SECURITY DEFINER can grant
DROP POLICY IF EXISTS "Users can earn achievements" ON public.user_achievements;

-- 4) user_badges: remove self-grant, add validated RPC
DROP POLICY IF EXISTS "Users insert own badges" ON public.user_badges;

CREATE OR REPLACE FUNCTION public.claim_challenge_reward(_enrollment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _enrollment public.challenge_enrollments;
  _challenge public.challenges;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _enrollment
  FROM public.challenge_enrollments
  WHERE id = _enrollment_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found';
  END IF;

  IF _enrollment.status = 'claimed' THEN
    RETURN jsonb_build_object('ok', true, 'already_claimed', true);
  END IF;

  -- Must be completed (current_value >= goal_target) before claim
  SELECT * INTO _challenge FROM public.challenges WHERE id = _enrollment.challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found';
  END IF;

  IF _enrollment.current_value < _challenge.goal_target
     AND _enrollment.status <> 'completed' THEN
    RAISE EXCEPTION 'Challenge not completed yet';
  END IF;

  UPDATE public.challenge_enrollments
  SET status = 'claimed', claimed_at = now()
  WHERE id = _enrollment_id;

  IF _challenge.badge_slug IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_slug, source)
    VALUES (auth.uid(), _challenge.badge_slug, 'challenge:' || _challenge.slug)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'badge_slug', _challenge.badge_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_challenge_reward(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_challenge_reward(uuid) TO authenticated;

-- 5) token_transfers: drop redundant policy (superseded by "Recipients and admins see transfer email")
DROP POLICY IF EXISTS "Recipients see own transfers" ON public.token_transfers;
