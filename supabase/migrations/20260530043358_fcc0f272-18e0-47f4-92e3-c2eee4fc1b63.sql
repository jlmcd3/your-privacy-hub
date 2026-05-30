CREATE OR REPLACE FUNCTION public.admin_fire_backfill_ai_summaries_v2(
  p_batch integer DEFAULT 25,
  p_force_reenrich boolean DEFAULT false,
  p_since text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_token text;
  v_req_id bigint;
  v_body jsonb;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE name = 'ADMIN_SECRET_TOKEN'
  LIMIT 1;

  v_body := jsonb_build_object(
    'limit', p_batch,
    'force_reenrich', p_force_reenrich
  );
  IF p_since IS NOT NULL THEN
    v_body := v_body || jsonb_build_object('since', p_since);
  END IF;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/backfill-ai-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', coalesce(v_token, '')
    ),
    body := v_body,
    timeout_milliseconds := 540000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$;