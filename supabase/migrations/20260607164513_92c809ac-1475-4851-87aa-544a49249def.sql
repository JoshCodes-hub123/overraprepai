
DO $$
DECLARE
  tutor_id uuid := gen_random_uuid();
  student_id uuid := gen_random_uuid();
  pw text := 'Drdeji23$';
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', tutor_id, 'authenticated', 'authenticated',
    'tutor@overraprepai.com', crypt(pw, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"OverraPrep Official Tutor"}'::jsonb,
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), tutor_id,
    jsonb_build_object('sub', tutor_id::text, 'email', 'tutor@overraprepai.com', 'email_verified', true),
    'email', tutor_id::text, now(), now(), now());

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', student_id, 'authenticated', 'authenticated',
    'student@overraprepai.com', crypt(pw, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"OverraPrep Official Student"}'::jsonb,
    now(), now(), '', '', '', ''
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), student_id,
    jsonb_build_object('sub', student_id::text, 'email', 'student@overraprepai.com', 'email_verified', true),
    'email', student_id::text, now(), now(), now());

  INSERT INTO public.user_roles (user_id, role) VALUES (tutor_id, 'tutor')
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.profiles
    SET full_name = 'OverraPrep Official Tutor',
        tutor_status = 'approved',
        is_official = true,
        onboarding_completed = true
  WHERE id = tutor_id;

  UPDATE public.profiles
    SET full_name = 'OverraPrep Official Student',
        is_official = true,
        onboarding_completed = true
  WHERE id = student_id;

  INSERT INTO public.tutor_applications (
    user_id, status, full_name, email,
    qualifications, experience, courses_to_teach, reviewed_at
  ) VALUES (
    tutor_id, 'approved', 'OverraPrep Official Tutor', 'tutor@overraprepai.com',
    'Official OverraPrep tutor account', 'Official', 'All courses', now()
  );
END $$;
