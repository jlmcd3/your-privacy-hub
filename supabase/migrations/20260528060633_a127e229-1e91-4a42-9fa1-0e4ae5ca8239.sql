CREATE OR REPLACE FUNCTION public.admin_fire_track3_extract(
  p_regulator text,
  p_max_rows integer DEFAULT 355
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
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
    RAISE EXCEPTION 'ADMIN_SECRET_TOKEN missing from vault';
  END IF;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/track3-extract-orchestrator',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-admin-token', v_token
    ),
    body := jsonb_build_object(
      'regulator_canonical', p_regulator,
      'max_rows', p_max_rows
    ),
    timeout_milliseconds := 600000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fire_track3_extract(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_fire_track3_extract(text, integer) TO service_role;