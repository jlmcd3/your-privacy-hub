CREATE OR REPLACE FUNCTION public.admin_fire_batch_fetch_primary_sources(
  p_limit integer DEFAULT 20,
  p_dry_run boolean DEFAULT true,
  p_source text DEFAULT NULL,
  p_regulator text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
  v_req_id bigint;
  v_url text;
  v_params text := '';
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'ADMIN_SECRET_TOKEN'
  LIMIT 1;

  IF v_token IS NULL OR v_token = '' THEN
    RAISE EXCEPTION 'ADMIN_SECRET_TOKEN not present in vault.decrypted_secrets';
  END IF;

  v_params := '?limit=' || p_limit::text
           || '&dry_run=' || (CASE WHEN p_dry_run THEN 'true' ELSE 'false' END);
  IF p_source IS NOT NULL AND p_source <> '' THEN
    v_params := v_params || '&source=' || p_source;
  END IF;
  IF p_regulator IS NOT NULL AND p_regulator <> '' THEN
    v_params := v_params || '&regulator=' || p_regulator;
  END IF;

  v_url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/batch-fetch-primary-sources' || v_params;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', v_token
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fire_batch_fetch_primary_sources(integer, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_fire_batch_fetch_primary_sources(integer, boolean, text, text) TO authenticated, service_role;