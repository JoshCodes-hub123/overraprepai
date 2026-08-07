REVOKE EXECUTE ON FUNCTION public.my_environment() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_course(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_environment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_course(uuid) TO authenticated;