-- Lock down shareable_token to service_role only. The token is delivered to
-- the owner via the `get-registration-assessment` edge function; no client
-- code needs to read it from the table directly.
REVOKE SELECT (shareable_token) ON public.registration_assessments FROM anon, authenticated;