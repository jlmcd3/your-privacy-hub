CREATE OR REPLACE FUNCTION public.admin_fire_track3_extract(
  p_regulator text,
  p_max_rows integer DEFAULT 355
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_srk text;
  v_req_id bigint;
BEGIN
  v_srk := current_setting('app.settings.service_role_key', true);
  IF v_srk IS NULL OR v_srk = '' THEN
    RAISE EXCEPTION 'service_role_key not available in app.settings';
  END IF;

  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/track3-extract-orchestrator',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || v_srk
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

GRANT EXECUTE ON FUNCTION public.admin_fire_track3_extract(text, integer) TO supabase_read_only_user;