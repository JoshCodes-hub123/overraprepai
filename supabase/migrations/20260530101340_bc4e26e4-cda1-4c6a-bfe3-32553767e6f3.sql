-- Re-attach the auth.users -> handle_new_user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill missing profiles for existing auth users
INSERT INTO public.profiles (id, email, full_name, referral_code, ai_token_balance, daily_free_used)
SELECT u.id,
       u.email,
       COALESCE(u.raw_user_meta_data->>'full_name', ''),
       public.generate_referral_code(),
       0,
       0
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Ensure each existing user has a student role too
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL;