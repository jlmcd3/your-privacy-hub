DROP FUNCTION IF EXISTS public.admin_fire_batch_fetch_primary_sources(integer, boolean, text, text);

CREATE OR REPLACE FUNCTION public.admin_fire_batch_fetch_primary_sources(
  p_limit integer DEFAULT 20,
  p_dry_run boolean DEFAULT true,
  p_source text DEFAULT NULL,
  p_regulator text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_token text;
  v_run_id uuid;
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

  INSERT INTO public.primary_source_fetch_runs (status, dry_run, params)
  VALUES (
    'queued',
    p_dry_run,
    jsonb_build_object(
      'limit', p_limit,
      'dry_run', p_dry_run,
      'source', p_source,
      'regulator', p_regulator
    )
  )
  RETURNING id INTO v_run_id;

  v_params := '?limit=' || p_limit::text
           || '&dry_run=' || (CASE WHEN p_dry_run THEN 'true' ELSE 'false' END);
  IF p_source IS NOT NULL AND p_source <> '' THEN
    v_params := v_params || '&source=' || p_source;
  END IF;
  IF p_regulator IS NOT NULL AND p_regulator <> '' THEN
    v_params := v_params || '&regulator=' || p_regulator;
  END IF;

  v_url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/batch-fetch-primary-sources' || v_params;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', v_token
    ),
    body := jsonb_build_object('run_id', v_run_id),
    timeout_milliseconds := 540000
  );

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fire_batch_fetch_primary_sources(integer, boolean, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_fire_batch_fetch_primary_sources(integer, boolean, text, text) TO authenticated, service_role;