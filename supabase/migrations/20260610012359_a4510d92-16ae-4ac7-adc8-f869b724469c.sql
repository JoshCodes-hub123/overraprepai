DROP FUNCTION IF EXISTS public.consume_ai_token(text, integer);
GRANT EXECUTE ON FUNCTION public.consume_ai_token(text) TO authenticated;