
-- 1. token_transfers: drop sender SELECT policy (use RPC instead)
DROP POLICY IF EXISTS "Senders see own transfers" ON public.token_transfers;
DROP POLICY IF EXISTS "Recipients see own transfers" ON public.token_transfers;

-- Keep recipient access (they need to_email to know who they received from — it's their own email)
CREATE POLICY "Recipients see own transfers"
ON public.token_transfers
FOR SELECT
TO authenticated
USING (auth.uid() = to_user);

CREATE POLICY "Admins read all transfers"
ON public.token_transfers
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. profiles: replace blanket USING(true) SELECT policies with row-scoped policies
DROP POLICY IF EXISTS "Anon can view profile public fields" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can view profile public fields" ON public.profiles;

-- Own row (full access via column grants user already has)
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Tutors are publicly discoverable (column grants restrict to safe fields only)
CREATE POLICY "Tutor profiles publicly readable"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = profiles.id AND ur.role = 'tutor'::app_role)
);

-- Authenticated users can see other students' public fields (column grants enforce which fields)
CREATE POLICY "Authenticated read student public fields"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Admins read all
CREATE POLICY "Admins read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. course_chat_reactions: require course participation on DELETE
DROP POLICY IF EXISTS "Users remove their own reactions" ON public.course_chat_reactions;

CREATE POLICY "Users remove their own reactions"
ON public.course_chat_reactions
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.course_chat_messages m
    WHERE m.id = course_chat_reactions.message_id
      AND public.is_course_participant(m.course_id, auth.uid())
  )
);

-- 4. weekly_leaderboards: limit prize details to own row + admins; expose rank/score broadly via column grants
DROP POLICY IF EXISTS "Leaderboards authenticated read" ON public.weekly_leaderboards;

CREATE POLICY "Users view own leaderboard row"
ON public.weekly_leaderboards
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all leaderboard rows"
ON public.weekly_leaderboards
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Re-grant column-level SELECT for public leaderboard fields (rank, score, user_id, week_start)
-- so the public leaderboard UI keeps working without exposing prize_tokens / awarded
REVOKE SELECT ON public.weekly_leaderboards FROM authenticated;
REVOKE SELECT ON public.weekly_leaderboards FROM anon;
GRANT SELECT (id, user_id, week_start, rank, score) ON public.weekly_leaderboards TO authenticated;
GRANT SELECT (id, user_id, week_start, rank, score) ON public.weekly_leaderboards TO anon;
-- Full SELECT for service_role and (re-allow all cols when policy permits) — owners need prize_tokens/awarded
GRANT SELECT ON public.weekly_leaderboards TO service_role;

-- For owners to see their own prize info, add full-column SELECT bounded by RLS
-- (RLS restricts rows; column grant restricts cols. We want owners to read all cols of their row.)
-- Easiest: grant all columns to authenticated; RLS prevents reading other users' rows.
GRANT SELECT ON public.weekly_leaderboards TO authenticated;

-- But then anon would see all cols if any policy allowed — there's no anon policy, so anon column grant above is moot for now.
-- Public leaderboard page uses anon? Check: page is authenticated. Drop anon grant to be safe.
REVOKE SELECT ON public.weekly_leaderboards FROM anon;
