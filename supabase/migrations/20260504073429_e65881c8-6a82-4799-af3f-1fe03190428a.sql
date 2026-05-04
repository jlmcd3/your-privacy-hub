DROP VIEW IF EXISTS public.founding_subscriber_count;

CREATE VIEW public.founding_subscriber_count
WITH (security_invoker = true)
AS
  SELECT COUNT(*)::int AS total
  FROM public.profiles
  WHERE subscription_type = 'annual_founding'
     OR founding_subscriber = TRUE;

REVOKE EXECUTE ON FUNCTION public.is_founding_rate_available() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_founding_rate_available() TO authenticated, service_role;