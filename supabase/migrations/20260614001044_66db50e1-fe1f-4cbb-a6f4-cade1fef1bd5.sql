CREATE OR REPLACE FUNCTION public.verify_admin_secret_token(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'ADMIN_SECRET_TOKEN'
      AND decrypted_secret = _token
      AND COALESCE(_token, '') <> ''
  );
$$;

REVOKE ALL ON FUNCTION public.verify_admin_secret_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_secret_token(text) TO service_role;