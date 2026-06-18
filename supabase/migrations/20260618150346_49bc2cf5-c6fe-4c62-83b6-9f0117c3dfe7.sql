ALTER TABLE public.quality_runs ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz;

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
           error = COALESCE(error, '') ||
                   CASE WHEN error IS NULL OR error = '' THEN '' ELSE ' | ' END ||
                   'Watchdog: marked failed after no heartbeat for >2 minutes (last_heartbeat_at=' ||
                   COALESCE(last_heartbeat_at::text, 'never') || ')'
     WHERE status IN ('generating','building','evaluating')
       AND COALESCE(last_heartbeat_at, started_at, created_at_ts(id)) < now() - interval '2 minutes'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM stale;

  RETURN jsonb_build_object('marked_failed', v_count, 'checked_at', now());
END;
$$;