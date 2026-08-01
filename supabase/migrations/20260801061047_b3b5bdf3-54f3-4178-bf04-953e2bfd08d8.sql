CREATE OR REPLACE FUNCTION public.admin_fire_ingest_edpb_oss(
  p_mode text DEFAULT 'register',
  p_start_page integer DEFAULT 0,
  p_max_pages integer DEFAULT 8
) RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-edpb-oss',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', v_token
    ),
    body := jsonb_build_object(
      'mode', p_mode,
      'start_page', p_start_page,
      'max_pages', p_max_pages
    ),
    timeout_milliseconds := 900000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_fire_ingest_edpb_oss(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fire_ingest_edpb_oss(text, integer, integer) TO service_role;