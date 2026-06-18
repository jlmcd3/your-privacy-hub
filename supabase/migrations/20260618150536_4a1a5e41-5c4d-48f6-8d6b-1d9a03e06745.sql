ALTER TABLE public.quality_runs
  ADD COLUMN IF NOT EXISTS next_doc_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intakes jsonb,
  ADD COLUMN IF NOT EXISTS partial_state jsonb,
  ADD COLUMN IF NOT EXISTS user_id uuid;

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
       AND COALESCE(last_heartbeat_at, started_at) < now() - interval '3 minutes'
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM stale;

  RETURN jsonb_build_object('marked_failed', v_count, 'checked_at', now());
END;
$$;