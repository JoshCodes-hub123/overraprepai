
-- =========================================================
-- Student Intelligence Layer
-- All functions are read-only, callable by authenticated for their own user
-- =========================================================

CREATE OR REPLACE FUNCTION public.intelligence_success_score(_user uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_quiz_acc numeric := 0;
  v_consistency numeric := 0;
  v_arena numeric := 0;
  v_community numeric := 0;
  v_opps numeric := 0;
  v_course numeric := 0;
  v_total numeric := 0;
  v_prev numeric := 0;
  v_tier text;
  v_active_days int;
  v_enrolled int;
  v_active_courses int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  -- Quiz accuracy (last 30d), normalised 0..100
  SELECT COALESCE(AVG(
    CASE WHEN total_questions > 0
    THEN (score::numeric / total_questions::numeric) * 100 ELSE NULL END
  ), 0)::numeric INTO v_quiz_acc
  FROM public.quiz_attempts
  WHERE user_id = v_user AND completed_at >= now() - interval '30 days';

  -- Consistency: distinct active days in last 14 / 14 * 100
  SELECT COUNT(DISTINCT d)::int INTO v_active_days FROM (
    SELECT DATE(completed_at) AS d FROM public.quiz_attempts
      WHERE user_id = v_user AND completed_at >= now() - interval '14 days'
    UNION
    SELECT DATE(completed_at) FROM public.mock_exam_attempts
      WHERE user_id = v_user AND completed_at >= now() - interval '14 days'
    UNION
    SELECT DATE(opened_at) FROM public.recently_opened_courses
      WHERE user_id = v_user AND opened_at >= now() - interval '14 days'
  ) s;
  v_consistency := LEAST(100, (v_active_days::numeric / 14) * 100);

  -- Arena participation (last 30d), 5 entries = 100
  SELECT LEAST(100, COUNT(*)::numeric / 5 * 100) INTO v_arena
  FROM public.arena_entries
  WHERE user_id = v_user AND submitted_at >= now() - interval '30 days' AND status = 'submitted';

  -- Community engagement: posts + likes + comments (cap 20 actions = 100)
  SELECT LEAST(100, (
    (SELECT COUNT(*) FROM public.community_posts WHERE author_id = v_user AND created_at >= now() - interval '30 days')
    + (SELECT COUNT(*) FROM public.post_likes WHERE user_id = v_user AND created_at >= now() - interval '30 days')
    + (SELECT COUNT(*) FROM public.post_comments WHERE user_id = v_user AND created_at >= now() - interval '30 days')
  )::numeric / 20 * 100) INTO v_community;

  -- Opportunity engagement: views + bookmarks + applications (cap 10)
  SELECT LEAST(100, (
    COALESCE((SELECT COUNT(*) FROM public.opportunity_bookmarks WHERE user_id = v_user), 0)
    + COALESCE((SELECT COUNT(*) FROM public.opportunity_applications WHERE user_id = v_user), 0) * 2
  )::numeric / 10 * 100) INTO v_opps;

  -- Course coverage: distinct courses with activity in 30d vs enrolled
  SELECT COUNT(*) INTO v_enrolled FROM public.student_courses WHERE student_id = v_user;
  SELECT COUNT(DISTINCT course_id) INTO v_active_courses FROM (
    SELECT course_id FROM public.recently_opened_courses
      WHERE user_id = v_user AND opened_at >= now() - interval '30 days' AND course_id IS NOT NULL
    UNION
    SELECT course_id FROM public.weakness_signals WHERE user_id = v_user AND course_id IS NOT NULL
  ) s;
  v_course := CASE WHEN v_enrolled > 0
    THEN LEAST(100, (v_active_courses::numeric / GREATEST(v_enrolled,1)) * 100)
    ELSE 0 END;

  -- Weighted total
  v_total := ROUND(
    v_quiz_acc    * 0.30 +
    v_consistency * 0.25 +
    v_arena       * 0.10 +
    v_community   * 0.10 +
    v_opps        * 0.10 +
    v_course      * 0.15
  );

  v_tier := CASE
    WHEN v_total >= 90 THEN 'Legend'
    WHEN v_total >= 80 THEN 'Champion'
    WHEN v_total >= 70 THEN 'Achiever'
    WHEN v_total >= 60 THEN 'Scholar'
    ELSE 'Beginner' END;

  -- Previous-week proxy: same quiz accuracy 30..60d ago
  SELECT COALESCE(AVG(
    CASE WHEN total_questions > 0
    THEN (score::numeric / total_questions::numeric) * 100 ELSE NULL END
  ), 0)::numeric INTO v_prev
  FROM public.quiz_attempts
  WHERE user_id = v_user AND completed_at BETWEEN now() - interval '60 days' AND now() - interval '30 days';

  RETURN jsonb_build_object(
    'ok', true,
    'score', v_total::int,
    'tier', v_tier,
    'trend_pct', CASE WHEN v_prev > 0 THEN ROUND(((v_quiz_acc - v_prev) / v_prev) * 100)::int ELSE 0 END,
    'breakdown', jsonb_build_object(
      'quiz', ROUND(v_quiz_acc)::int,
      'consistency', ROUND(v_consistency)::int,
      'arena', ROUND(v_arena)::int,
      'community', ROUND(v_community)::int,
      'opportunity', ROUND(v_opps)::int,
      'course_coverage', ROUND(v_course)::int
    ),
    'active_days_last_14', v_active_days
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_success_score(uuid) TO authenticated;

-- ----- Readiness for one course -------------------------------------------
CREATE OR REPLACE FUNCTION public.intelligence_exam_readiness(_user uuid, _course uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_course_code text;
  v_course_name text;
  v_acc numeric := 0;
  v_attempts int := 0;
  v_recent_attempts int := 0;
  v_activity_score numeric := 0;
  v_readiness int;
  v_grade text;
  v_confidence text;
  v_weak jsonb;
  v_strong jsonb;
  v_recs jsonb := '[]'::jsonb;
  v_recommended_hours int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT code, name INTO v_course_code, v_course_name
  FROM public.courses WHERE id = _course;

  -- Quiz accuracy across this course (joined via quizzes.course_id)
  SELECT COALESCE(AVG(
    CASE WHEN qa.total_questions > 0
    THEN (qa.score::numeric / qa.total_questions::numeric) * 100 ELSE NULL END
  ), 0)::numeric, COUNT(*)::int
  INTO v_acc, v_attempts
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON q.id = qa.quiz_id
  WHERE qa.user_id = v_user AND q.course_id = _course;

  SELECT COUNT(*) INTO v_recent_attempts
  FROM public.quiz_attempts qa
  JOIN public.quizzes q ON q.id = qa.quiz_id
  WHERE qa.user_id = v_user AND q.course_id = _course
    AND qa.completed_at >= now() - interval '30 days';

  v_activity_score := LEAST(100, v_recent_attempts::numeric / 5 * 100);

  -- 70% accuracy, 30% recent activity
  v_readiness := ROUND(GREATEST(0, LEAST(100, v_acc * 0.7 + v_activity_score * 0.3)))::int;

  v_grade := CASE
    WHEN v_readiness >= 85 THEN 'A'
    WHEN v_readiness >= 75 THEN 'B+'
    WHEN v_readiness >= 65 THEN 'B'
    WHEN v_readiness >= 55 THEN 'C'
    WHEN v_readiness >= 45 THEN 'D'
    ELSE 'F' END;

  v_confidence := CASE
    WHEN v_attempts >= 8 THEN 'High'
    WHEN v_attempts >= 3 THEN 'Medium'
    ELSE 'Low' END;

  v_recommended_hours := GREATEST(0, CEIL((85 - v_readiness)::numeric / 10))::int;

  -- Weak topics from weakness_signals (top 3 by miss_count)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('topic', topic, 'misses', miss_count)
    ORDER BY miss_count DESC), '[]'::jsonb)
  INTO v_weak
  FROM (
    SELECT topic, SUM(miss_count)::int AS miss_count
    FROM public.weakness_signals
    WHERE user_id = v_user AND course_id = _course AND topic IS NOT NULL
    GROUP BY topic ORDER BY SUM(miss_count) DESC LIMIT 3
  ) w;

  -- Strong topics: top 3 mastery scores
  SELECT COALESCE(jsonb_agg(jsonb_build_object('topic', topic, 'mastery', ROUND(mastery_score)::int)
    ORDER BY mastery_score DESC), '[]'::jsonb)
  INTO v_strong
  FROM (
    SELECT topic, mastery_score
    FROM public.topic_mastery
    WHERE user_id = v_user AND mastery_score >= 70
    ORDER BY mastery_score DESC LIMIT 3
  ) s;

  IF v_recent_attempts < 3 THEN
    v_recs := v_recs || jsonb_build_array('Complete 2 quizzes this week');
  END IF;
  IF jsonb_array_length(v_weak) > 0 THEN
    v_recs := v_recs || jsonb_build_array('Review weak topic: ' || (v_weak->0->>'topic'));
  END IF;
  IF v_readiness < 70 THEN
    v_recs := v_recs || jsonb_build_array('Study ' || v_recommended_hours || ' hours, then retake a quiz');
  END IF;
  IF jsonb_array_length(v_recs) = 0 THEN
    v_recs := jsonb_build_array('Stay sharp — try a Mock Exam in this course');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'course_id', _course,
    'course_code', v_course_code,
    'course_name', v_course_name,
    'readiness', v_readiness,
    'predicted_grade', v_grade,
    'confidence', v_confidence,
    'attempts', v_attempts,
    'recent_attempts_30d', v_recent_attempts,
    'recommended_hours', v_recommended_hours,
    'weak_topics', v_weak,
    'strong_topics', v_strong,
    'recommendations', v_recs
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_exam_readiness(uuid, uuid) TO authenticated;

-- ----- Readiness for ALL enrolled courses ---------------------------------
CREATE OR REPLACE FUNCTION public.intelligence_exam_readiness_all(_user uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_arr jsonb := '[]'::jsonb;
  r record;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  FOR r IN
    SELECT DISTINCT course_id FROM public.student_courses WHERE student_id = v_user AND course_id IS NOT NULL
    UNION
    SELECT DISTINCT course_id FROM public.recently_opened_courses
      WHERE user_id = v_user AND course_id IS NOT NULL
      AND opened_at >= now() - interval '60 days'
  LOOP
    v_arr := v_arr || jsonb_build_array(public.intelligence_exam_readiness(v_user, r.course_id));
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'courses', v_arr);
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_exam_readiness_all(uuid) TO authenticated;

-- ----- Today's mission ----------------------------------------------------
CREATE OR REPLACE FUNCTION public.intelligence_today_mission(_user uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_quiz_today int;
  v_flashcards int;
  v_mission jsonb := '[]'::jsonb;
  v_streak int;
  v_weakest_course uuid;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT COUNT(*) INTO v_quiz_today FROM public.quiz_attempts
    WHERE user_id = v_user AND completed_at >= DATE_TRUNC('day', now());
  SELECT COUNT(*) INTO v_flashcards FROM public.flashcards WHERE user_id = v_user;
  SELECT COALESCE(current_streak, 0) INTO v_streak FROM public.study_streaks WHERE user_id = v_user;

  SELECT course_id INTO v_weakest_course FROM public.weakness_signals
    WHERE user_id = v_user GROUP BY course_id ORDER BY SUM(miss_count) DESC LIMIT 1;

  IF v_quiz_today = 0 THEN
    v_mission := v_mission || jsonb_build_array(
      jsonb_build_object('label', 'Complete 1 Quiz', 'icon', 'brain', 'link', '/student/practice', 'done', false)
    );
  END IF;
  IF v_flashcards > 0 THEN
    v_mission := v_mission || jsonb_build_array(
      jsonb_build_object('label', 'Review 5 Flashcards', 'icon', 'layers', 'link', '/student/flashcards', 'done', false)
    );
  END IF;
  v_mission := v_mission || jsonb_build_array(
    jsonb_build_object('label', 'Study 20 minutes', 'icon', 'timer',
      'link', CASE WHEN v_weakest_course IS NOT NULL
        THEN '/student/course/' || v_weakest_course::text
        ELSE '/student/dashboard' END,
      'done', false)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'streak', v_streak,
    'completed_today', v_quiz_today,
    'tasks', v_mission
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_today_mission(uuid) TO authenticated;

-- ----- Weekly report ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.intelligence_weekly_report(_user uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_hours numeric;
  v_quizzes int;
  v_arena int;
  v_opps int;
  v_prev_acc numeric; v_curr_acc numeric;
  v_improvement int;
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'auth_required'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT ROUND((
    COALESCE((SELECT SUM(time_spent_seconds) FROM public.quiz_attempts
              WHERE user_id = v_user AND completed_at >= now() - interval '7 days'), 0)
    + COALESCE((SELECT SUM(duration_seconds) FROM public.mock_exam_attempts
                WHERE user_id = v_user AND completed_at >= now() - interval '7 days'), 0)
    + COALESCE((SELECT SUM(position_seconds) FROM public.audio_sessions
                WHERE user_id = v_user AND updated_at >= now() - interval '7 days'), 0)
  )::numeric / 3600, 1) INTO v_hours;

  SELECT COUNT(*) INTO v_quizzes FROM public.quiz_attempts
    WHERE user_id = v_user AND completed_at >= now() - interval '7 days';
  SELECT COUNT(*) INTO v_arena FROM public.arena_entries
    WHERE user_id = v_user AND entered_at >= now() - interval '7 days';
  SELECT COUNT(*) INTO v_opps FROM public.opportunity_bookmarks
    WHERE user_id = v_user AND created_at >= now() - interval '7 days';

  SELECT COALESCE(AVG(CASE WHEN total_questions > 0
    THEN (score::numeric / total_questions) * 100 END), 0) INTO v_curr_acc
  FROM public.quiz_attempts WHERE user_id = v_user AND completed_at >= now() - interval '7 days';
  SELECT COALESCE(AVG(CASE WHEN total_questions > 0
    THEN (score::numeric / total_questions) * 100 END), 0) INTO v_prev_acc
  FROM public.quiz_attempts WHERE user_id = v_user
    AND completed_at BETWEEN now() - interval '14 days' AND now() - interval '7 days';
  v_improvement := CASE WHEN v_prev_acc > 0
    THEN ROUND(((v_curr_acc - v_prev_acc) / v_prev_acc) * 100)::int ELSE 0 END;

  RETURN jsonb_build_object(
    'ok', true,
    'hours_studied', v_hours,
    'quizzes_completed', v_quizzes,
    'challenges_joined', v_arena,
    'opportunities_viewed', v_opps,
    'accuracy_pct', ROUND(v_curr_acc)::int,
    'improvement_pct', v_improvement
  );
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_weekly_report(uuid) TO authenticated;

-- ----- Opportunity match engine -------------------------------------------
CREATE OR REPLACE FUNCTION public.intelligence_opportunity_matches(_user uuid DEFAULT NULL, _limit int DEFAULT 6)
RETURNS TABLE (
  id uuid, title text, organization text, category text,
  cover_image_url text, deadline date, university text,
  match_score int, reasons jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_user uuid := COALESCE(_user, auth.uid());
  v_uni text; v_dept text;
BEGIN
  IF v_user IS NULL THEN RETURN; END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> v_user AND NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  SELECT university, department INTO v_uni, v_dept FROM public.profiles WHERE id = v_user;

  RETURN QUERY
  SELECT o.id, o.title, o.organization, o.category::text,
         o.cover_image_url, o.deadline, o.university,
         LEAST(100, (
           CASE WHEN o.university IS NULL OR v_uni IS NULL THEN 25
                WHEN LOWER(o.university) = LOWER(v_uni) THEN 35
                ELSE 5 END
           + CASE WHEN o.deadline IS NULL THEN 5
                  WHEN o.deadline > CURRENT_DATE AND o.deadline <= CURRENT_DATE + 30 THEN 20
                  WHEN o.deadline > CURRENT_DATE THEN 12
                  ELSE 0 END
           + CASE WHEN o.created_at >= now() - interval '7 days' THEN 15 ELSE 5 END
           + CASE WHEN NOT EXISTS (
                  SELECT 1 FROM public.opportunity_applications a
                  WHERE a.user_id = v_user AND a.opportunity_id = o.id) THEN 10 ELSE 0 END
           + CASE WHEN v_dept IS NOT NULL AND o.description ILIKE '%' || v_dept || '%' THEN 15 ELSE 0 END
           + CASE WHEN EXISTS (
                  SELECT 1 FROM public.opportunity_bookmarks b
                  WHERE b.user_id = v_user AND b.opportunity_id = o.id) THEN 5 ELSE 0 END
         ))::int AS match_score,
         jsonb_build_object(
           'same_university', (o.university IS NOT NULL AND v_uni IS NOT NULL AND LOWER(o.university) = LOWER(v_uni)),
           'department_match', (v_dept IS NOT NULL AND o.description ILIKE '%' || v_dept || '%'),
           'closing_soon', (o.deadline IS NOT NULL AND o.deadline > CURRENT_DATE AND o.deadline <= CURRENT_DATE + 14),
           'fresh', (o.created_at >= now() - interval '7 days')
         ) AS reasons
  FROM public.opportunities o
  WHERE o.status = 'published'
    AND (o.deadline IS NULL OR o.deadline >= CURRENT_DATE)
  ORDER BY match_score DESC, o.created_at DESC
  LIMIT COALESCE(_limit, 6);
END; $$;
GRANT EXECUTE ON FUNCTION public.intelligence_opportunity_matches(uuid, int) TO authenticated;
