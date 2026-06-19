
-- =========================================================
-- GROWTH ENGINE — Campus Battles, Ambassadors, Impact, Referrals
-- =========================================================

CREATE TABLE IF NOT EXISTS public.campus_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scope text NOT NULL CHECK (scope IN ('university','faculty','department')),
  side_a text NOT NULL,
  side_b text NOT NULL,
  university_filter text,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','live','ended','cancelled')),
  prize_summary text,
  winner_side text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_battles TO authenticated, anon;
GRANT ALL ON public.campus_battles TO service_role;
ALTER TABLE public.campus_battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battles readable" ON public.campus_battles FOR SELECT USING (true);
CREATE POLICY "battles admin write" ON public.campus_battles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.campus_battle_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.campus_battles(id) ON DELETE CASCADE,
  side text NOT NULL,
  quiz_points numeric NOT NULL DEFAULT 0,
  arena_points numeric NOT NULL DEFAULT 0,
  streak_points numeric NOT NULL DEFAULT 0,
  success_points numeric NOT NULL DEFAULT 0,
  total_points numeric NOT NULL DEFAULT 0,
  participant_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, side)
);
GRANT SELECT ON public.campus_battle_scores TO authenticated, anon;
GRANT ALL ON public.campus_battle_scores TO service_role;
ALTER TABLE public.campus_battle_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle scores readable" ON public.campus_battle_scores FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.campus_ambassadors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'rookie' CHECK (tier IN ('rookie','rising','star','elite')),
  university text,
  bio text,
  social_handle text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  total_onboarded int NOT NULL DEFAULT 0,
  total_referrals int NOT NULL DEFAULT 0,
  community_growth int NOT NULL DEFAULT 0,
  arena_participation int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campus_ambassadors TO authenticated, anon;
GRANT ALL ON public.campus_ambassadors TO service_role;
ALTER TABLE public.campus_ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ambassadors readable" ON public.campus_ambassadors FOR SELECT USING (true);
CREATE POLICY "ambassadors admin write" ON public.campus_ambassadors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ambassador self update" ON public.campus_ambassadors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.campus_impact_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university text NOT NULL,
  active_students int NOT NULL DEFAULT 0,
  challenge_participation int NOT NULL DEFAULT 0,
  avg_success_score numeric NOT NULL DEFAULT 0,
  community_activity int NOT NULL DEFAULT 0,
  impact_score numeric NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university, computed_at)
);
GRANT SELECT ON public.campus_impact_snapshots TO authenticated, anon;
GRANT ALL ON public.campus_impact_snapshots TO service_role;
ALTER TABLE public.campus_impact_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "impact readable" ON public.campus_impact_snapshots FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.growth_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  channel text,
  target_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.growth_share_events TO authenticated;
GRANT ALL ON public.growth_share_events TO service_role;
ALTER TABLE public.growth_share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "share insert self" ON public.growth_share_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "share read self or admin" ON public.growth_share_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.referral_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone)
);
GRANT SELECT ON public.referral_milestones TO authenticated;
GRANT ALL ON public.referral_milestones TO service_role;
ALTER TABLE public.referral_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "milestones read self" ON public.referral_milestones FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.tg_growth_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_battles_updated ON public.campus_battles;
CREATE TRIGGER trg_battles_updated BEFORE UPDATE ON public.campus_battles
  FOR EACH ROW EXECUTE FUNCTION public.tg_growth_touch_updated_at();
DROP TRIGGER IF EXISTS trg_amb_updated ON public.campus_ambassadors;
CREATE TRIGGER trg_amb_updated BEFORE UPDATE ON public.campus_ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.tg_growth_touch_updated_at();

CREATE OR REPLACE FUNCTION public.growth_recompute_battle(_battle_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; s text;
BEGIN
  SELECT * INTO b FROM public.campus_battles WHERE id = _battle_id;
  IF b IS NULL THEN RETURN; END IF;
  FOREACH s IN ARRAY ARRAY[b.side_a, b.side_b] LOOP
    INSERT INTO public.campus_battle_scores (battle_id, side, quiz_points, arena_points, streak_points, success_points, total_points, participant_count, updated_at)
    SELECT _battle_id, s,
      COALESCE((SELECT SUM(qa.score)::numeric FROM public.quiz_attempts qa
                JOIN public.profiles p ON p.id = qa.user_id
                WHERE qa.completed_at BETWEEN b.starts_at AND b.ends_at
                  AND ((b.scope='university' AND p.university = s)
                    OR (b.scope='faculty' AND p.faculty = s AND (b.university_filter IS NULL OR p.university = b.university_filter))
                    OR (b.scope='department' AND p.department = s AND (b.university_filter IS NULL OR p.university = b.university_filter)))
              ),0),
      COALESCE((SELECT SUM(ae.score)::numeric FROM public.arena_entries ae
                JOIN public.profiles p ON p.id = ae.user_id
                WHERE ae.submitted_at BETWEEN b.starts_at AND b.ends_at
                  AND ((b.scope='university' AND p.university = s)
                    OR (b.scope='faculty' AND p.faculty = s AND (b.university_filter IS NULL OR p.university = b.university_filter))
                    OR (b.scope='department' AND p.department = s AND (b.university_filter IS NULL OR p.university = b.university_filter)))
              ),0),
      COALESCE((SELECT SUM(ss.current_streak)::numeric FROM public.study_streaks ss
                JOIN public.profiles p ON p.id = ss.user_id
                WHERE ((b.scope='university' AND p.university = s)
                    OR (b.scope='faculty' AND p.faculty = s AND (b.university_filter IS NULL OR p.university = b.university_filter))
                    OR (b.scope='department' AND p.department = s AND (b.university_filter IS NULL OR p.university = b.university_filter)))
              ),0),
      0, 0,
      COALESCE((SELECT COUNT(DISTINCT p.id) FROM public.profiles p
                WHERE ((b.scope='university' AND p.university = s)
                    OR (b.scope='faculty' AND p.faculty = s AND (b.university_filter IS NULL OR p.university = b.university_filter))
                    OR (b.scope='department' AND p.department = s AND (b.university_filter IS NULL OR p.university = b.university_filter)))
              ),0),
      now()
    ON CONFLICT (battle_id, side) DO UPDATE SET
      quiz_points = EXCLUDED.quiz_points,
      arena_points = EXCLUDED.arena_points,
      streak_points = EXCLUDED.streak_points,
      success_points = EXCLUDED.success_points,
      participant_count = EXCLUDED.participant_count,
      total_points = EXCLUDED.quiz_points + EXCLUDED.arena_points + (EXCLUDED.streak_points*0.5),
      updated_at = now();
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.growth_recompute_battle(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.growth_settle_battle(_battle_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  PERFORM public.growth_recompute_battle(_battle_id);
  SELECT side INTO w FROM public.campus_battle_scores WHERE battle_id=_battle_id ORDER BY total_points DESC LIMIT 1;
  UPDATE public.campus_battles SET status='ended', winner_side=w, ends_at=LEAST(ends_at, now()) WHERE id=_battle_id;
  RETURN _battle_id;
END $$;
GRANT EXECUTE ON FUNCTION public.growth_settle_battle(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.growth_ambassador_leaderboard(_period text DEFAULT 'all')
RETURNS TABLE (user_id uuid, full_name text, university text, tier text, total_referrals int, total_onboarded int, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.user_id, p.full_name, a.university, a.tier, a.total_referrals, a.total_onboarded,
    (a.total_referrals*10 + a.total_onboarded*5 + a.community_growth*2 + a.arena_participation)::numeric AS score
  FROM public.campus_ambassadors a
  LEFT JOIN public.profiles p ON p.id = a.user_id
  WHERE a.active = true
  ORDER BY score DESC
  LIMIT 100;
$$;
GRANT EXECUTE ON FUNCTION public.growth_ambassador_leaderboard(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.growth_university_rankings()
RETURNS TABLE (university text, active_students int, avg_quiz numeric, arena_count int, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.university,
    COUNT(DISTINCT p.id)::int,
    COALESCE(AVG(qa.score),0)::numeric,
    COUNT(DISTINCT ae.id)::int,
    (COUNT(DISTINCT p.id)*5 + COALESCE(AVG(qa.score),0)*2 + COUNT(DISTINCT ae.id)*3)::numeric
  FROM public.profiles p
  LEFT JOIN public.quiz_attempts qa ON qa.user_id = p.id AND qa.completed_at > now() - interval '30 days'
  LEFT JOIN public.arena_entries ae ON ae.user_id = p.id AND ae.submitted_at > now() - interval '30 days'
  WHERE p.university IS NOT NULL AND length(p.university) > 0
  GROUP BY p.university
  ORDER BY 5 DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.growth_university_rankings() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.growth_department_rankings(_university text DEFAULT NULL)
RETURNS TABLE (university text, department text, active_students int, avg_quiz numeric, score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.university, p.department,
    COUNT(DISTINCT p.id)::int,
    COALESCE(AVG(qa.score),0)::numeric,
    (COUNT(DISTINCT p.id)*5 + COALESCE(AVG(qa.score),0)*2)::numeric
  FROM public.profiles p
  LEFT JOIN public.quiz_attempts qa ON qa.user_id = p.id AND qa.completed_at > now() - interval '30 days'
  WHERE p.university IS NOT NULL AND p.department IS NOT NULL
    AND (_university IS NULL OR p.university = _university)
  GROUP BY p.university, p.department
  ORDER BY 5 DESC
  LIMIT 100;
$$;
GRANT EXECUTE ON FUNCTION public.growth_department_rankings(text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.growth_campus_impact()
RETURNS TABLE (university text, active_students int, challenge_participation int, avg_success numeric, community_activity int, impact_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH base AS (
    SELECT p.university,
      COUNT(DISTINCT p.id) AS active_students,
      COUNT(DISTINCT ae.id) AS challenge_participation,
      COALESCE(AVG(qa.score),0) AS avg_success,
      COUNT(DISTINCT cp.id) AS community_activity
    FROM public.profiles p
    LEFT JOIN public.arena_entries ae ON ae.user_id = p.id
    LEFT JOIN public.quiz_attempts qa ON qa.user_id = p.id
    LEFT JOIN public.community_posts cp ON cp.author_id = p.id
    WHERE p.university IS NOT NULL AND length(p.university) > 0
    GROUP BY p.university
  )
  SELECT university, active_students::int, challenge_participation::int, avg_success::numeric,
    community_activity::int,
    (active_students*4 + challenge_participation*3 + avg_success*1.5 + community_activity*2)::numeric
  FROM base
  ORDER BY 6 DESC
  LIMIT 50;
$$;
GRANT EXECUTE ON FUNCTION public.growth_campus_impact() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.growth_my_referral_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); count_total int; count_active int; tokens int; ms jsonb;
BEGIN
  IF u IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT COUNT(*), COALESCE(SUM(referrer_tokens),0)
    INTO count_total, tokens
  FROM public.referral_rewards WHERE referrer_id = u;
  SELECT COUNT(*) INTO count_active FROM public.referral_rewards
    WHERE referrer_id = u AND status = 'completed';
  SELECT jsonb_agg(milestone) INTO ms FROM public.referral_milestones WHERE user_id = u;
  RETURN jsonb_build_object(
    'total', count_total,
    'active', count_active,
    'tokens', tokens,
    'milestones', COALESCE(ms,'[]'::jsonb),
    'next', CASE
      WHEN count_active < 5 THEN jsonb_build_object('name','Hero Badge','at',5,'progress',count_active)
      WHEN count_active < 10 THEN jsonb_build_object('name','Premium Reward','at',10,'progress',count_active)
      WHEN count_active < 25 THEN jsonb_build_object('name','Campus Ambassador','at',25,'progress',count_active)
      ELSE jsonb_build_object('name','Elite Ambassador','at',50,'progress',count_active)
    END
  );
END $$;
GRANT EXECUTE ON FUNCTION public.growth_my_referral_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.growth_claim_milestone(_milestone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); count_active int; needed int;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  needed := CASE _milestone WHEN 'hero_badge' THEN 5 WHEN 'premium_reward' THEN 10 WHEN 'campus_ambassador' THEN 25 ELSE 1000000 END;
  SELECT COUNT(*) INTO count_active FROM public.referral_rewards WHERE referrer_id = u AND status='completed';
  IF count_active < needed THEN RETURN false; END IF;
  INSERT INTO public.referral_milestones(user_id, milestone) VALUES (u, _milestone)
    ON CONFLICT DO NOTHING;
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.growth_claim_milestone(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.growth_promote_ambassador(_user_id uuid, _tier text DEFAULT 'rookie')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uni text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT university INTO uni FROM public.profiles WHERE id = _user_id;
  INSERT INTO public.campus_ambassadors(user_id, tier, university, approved_by)
  VALUES (_user_id, _tier, uni, auth.uid())
  ON CONFLICT (user_id) DO UPDATE SET tier=_tier, active=true, approved_by=auth.uid();
  RETURN _user_id;
END $$;
GRANT EXECUTE ON FUNCTION public.growth_promote_ambassador(uuid, text) TO authenticated;
