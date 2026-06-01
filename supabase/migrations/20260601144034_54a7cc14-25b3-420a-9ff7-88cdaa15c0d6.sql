CREATE OR REPLACE FUNCTION public.admin_fire_backfill_ai_summaries_ids(p_ids text, p_force_reenrich boolean DEFAULT true)
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

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/backfill-ai-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', coalesce(v_token, '')
    ),
    body := jsonb_build_object(
      'ids', p_ids,
      'force_reenrich', p_force_reenrich,
      'limit', 100
    ),
    timeout_milliseconds := 540000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$;