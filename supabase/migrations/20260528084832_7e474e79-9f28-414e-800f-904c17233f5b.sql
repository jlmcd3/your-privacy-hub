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
  v_pat      text := '%' || lower(p_regulator) || '%';
BEGIN
  SELECT count(*) INTO v_inflight
    FROM public.ingestion_runs
   WHERE job_name = 'track3-extract'
     AND status = 'running'
     AND completed_at IS NULL
     AND started_at > now() - interval '30 minutes';
  IF v_inflight > 0 THEN
    RETURN jsonb_build_object('skipped','run_in_flight','inflight',v_inflight);
  END IF;

  SELECT count(*) INTO v_pending
    FROM public.enforcement_actions
   WHERE primary_source_status = 'pending_fetch'
     AND legacy_enrichment_version = 1
     AND (lower(coalesce(regulator,'')) LIKE v_pat
          OR lower(coalesce(regulator_canonical,'')) LIKE v_pat);
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