CREATE OR REPLACE FUNCTION public.admin_fire_ingest_fsor(p_fsor_package text, p_source_url text, p_units jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_req_id bigint;
BEGIN
  -- Allow service_role (auth.uid() IS NULL) OR admin user
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'ADMIN_SECRET_TOKEN'
  LIMIT 1;

  IF v_token IS NULL OR v_token = '' THEN
    RAISE EXCEPTION 'ADMIN_SECRET_TOKEN not present in vault.decrypted_secrets';
  END IF;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cppa-ingest-fsor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', v_token
    ),
    body := jsonb_build_object(
      'fsor_package', p_fsor_package,
      'source_url', p_source_url,
      'units', p_units
    ),
    timeout_milliseconds := 600000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_fire_ingest_fsor(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fire_ingest_fsor(text, text, jsonb) TO service_role;