CREATE OR REPLACE FUNCTION public.admin_fire_ingest_ftc_page(p_page integer, p_dry_run boolean DEFAULT false)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_req_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'ADMIN_SECRET_TOKEN'
  LIMIT 1;

  IF v_token IS NULL OR v_token = '' THEN
    RAISE EXCEPTION 'ADMIN_SECRET_TOKEN not present in vault.decrypted_secrets';
  END IF;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-gov-enforcement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', v_token
    ),
    body := jsonb_build_object(
      'ftc_page', p_page,
      'dry_run', p_dry_run
    ),
    timeout_milliseconds := 150000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$;