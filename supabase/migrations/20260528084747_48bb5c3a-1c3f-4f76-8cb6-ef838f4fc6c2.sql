CREATE OR REPLACE FUNCTION public.admin_fire_track3_chunk_if_idle(
  p_regulator text,
  p_chunk_size integer DEFAULT 35
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_inflight integer;
  v_pending  integer;
  v_req_id   bigint;
BEGIN
  -- Skip if a Track 3 extract run is currently in flight (no completed_at).
  SELECT count(*) INTO v_inflight
    FROM public.ingestion_runs
   WHERE job_name = 'track3-extract'
     AND status = 'running'
     AND completed_at IS NULL
     AND started_at > now() - interval '30 minutes';
  IF v_inflight > 0 THEN
    RETURN jsonb_build_object('skipped','run_in_flight','inflight',v_inflight);
  END IF;

  -- Skip if nothing left to do.
  SELECT count(*) INTO v_pending
    FROM public.enforcement_actions
   WHERE regulator_canonical = 'Agencia Española de Protección de Datos (AEPD)'
     AND primary_source_status = 'pending_fetch';
  IF v_pending = 0 THEN
    RETURN jsonb_build_object('skipped','no_pending');
  END IF;

  v_req_id := public.admin_fire_track3_extract(p_regulator, p_chunk_size);
  RETURN jsonb_build_object(
    'fired', true,
    'request_id', v_req_id,
    'pending_before', v_pending,
    'chunk_size', p_chunk_size
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_fire_track3_chunk_if_idle(text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_fire_track3_chunk_if_idle(text,integer) TO service_role;