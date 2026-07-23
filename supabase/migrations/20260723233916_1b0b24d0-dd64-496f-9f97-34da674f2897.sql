CREATE OR REPLACE FUNCTION public.quality_runs_watchdog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  WITH stale AS (
    UPDATE public.quality_runs
       SET status = 'failed',
           completed_at = now(),
           error = 'Orphaned by runtime shutdown — rerun to continue'
     WHERE status IN ('generating','building','evaluating')
       AND (
         (tool NOT IN ('dpia')
            AND COALESCE(last_heartbeat_at, started_at) < now() - interval '3 minutes')
         OR
         (tool IN ('dpia')
            AND COALESCE(last_heartbeat_at, started_at) < now() - interval '12 minutes')
       )
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM stale;

  RETURN jsonb_build_object('marked_failed', v_count, 'checked_at', now());
END;
$$;