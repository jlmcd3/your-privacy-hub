-- 1. Failed model calls are metered too: elapsed time is already recorded in
--    duration_ms; the failure reason needs a home.
ALTER TABLE public.api_usage ADD COLUMN IF NOT EXISTS error text;

-- 2. One job per reviewer. The dependency rules now wait on BOTH reviewer
--    jobs of a document before that document is arbitrated, and on every
--    reviewer + per-document arbitration of a product before the merge.
CREATE OR REPLACE FUNCTION public.claim_ptest_job(_batch_id uuid, _stale_after interval DEFAULT '15 minutes')
RETURNS SETOF public.ptest_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.ptest_jobs;
BEGIN
  -- A job whose worker died mid-flight is re-queued while attempts remain.
  UPDATE public.ptest_jobs
     SET status = 'queued',
         note = 'heartbeat went stale; re-queued'
   WHERE batch_id = _batch_id
     AND status = 'running'
     AND heartbeat_at < now() - _stale_after
     AND attempts < max_attempts;

  SELECT j.* INTO v
    FROM public.ptest_jobs j
   WHERE j.batch_id = _batch_id
     AND j.status = 'queued'
     AND j.attempts < j.max_attempts
     -- a per-document arbitration waits for BOTH reviewers of that document
     AND (j.kind <> 'arb_document' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.assessment_id = j.assessment_id
              AND d.kind IN ('review', 'review_gpt', 'review_claude')
              AND d.status IN ('queued', 'running')))
     -- the merge waits for every review and per-document arbitration of its product
     AND (j.kind <> 'arb_merge' OR NOT EXISTS (
           SELECT 1 FROM public.ptest_jobs d
            WHERE d.batch_id = j.batch_id
              AND d.tool_slug = j.tool_slug
              AND d.kind IN ('review', 'review_gpt', 'review_claude', 'arb_document')
              AND d.status IN ('queued', 'running')))
   ORDER BY (j.kind LIKE 'review%') DESC, j.created_at
   FOR UPDATE SKIP LOCKED
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.ptest_jobs
     SET status = 'running',
         attempts = attempts + 1,
         claimed_at = now(),
         heartbeat_at = now()
   WHERE id = v.id
  RETURNING * INTO v;

  RETURN NEXT v;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_ptest_job(uuid, interval) TO service_role;

-- 3. A batch carrying any failed or cancelled job closes as 'partial'.
CREATE OR REPLACE FUNCTION public.ptest_reap()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_failed int := 0;
  v_nudged int := 0;
  v_closed int := 0;
  v_partial int := 0;
  v_token  text;
  b        record;
begin
  update public.ptest_jobs
     set status = 'failed',
         finished_at = now(),
         error = coalesce(error, 'worker died mid-run; no result written (attempt cap reached)')
   where status = 'running'
     and heartbeat_at < now() - interval '15 minutes'
     and attempts >= max_attempts;
  get diagnostics v_failed = row_count;

  select token into v_token from public.internal_driver_tokens where name = 'ptest-driver';
  for b in
    select distinct batch_id
      from public.ptest_jobs
     where status in ('queued', 'running')
  loop
    perform net.http_post(
      url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ptest-run-driver',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-cron', '1',
        'x-driver-token', v_token,
        'Authorization', 'Bearer internal-driver'
      ),
      body := jsonb_build_object('action', 'tick', 'batch_id', b.batch_id),
      timeout_milliseconds := 30000
    );
    v_nudged := v_nudged + 1;
  end loop;

  -- finished, with at least one failure or cancellation => partial
  update public.ptest_batches sb
     set status = 'partial'
   where sb.status = 'running'
     and exists (select 1 from public.ptest_jobs j
                  where j.batch_id = sb.batch_id and j.status in ('failed', 'cancelled'))
     and not exists (select 1 from public.ptest_jobs j
                      where j.batch_id = sb.batch_id and j.status in ('queued', 'running'));
  get diagnostics v_partial = row_count;

  -- finished, clean => complete
  update public.ptest_batches sb
     set status = 'complete'
   where sb.status = 'running'
     and exists (select 1 from public.ptest_jobs j where j.batch_id = sb.batch_id)
     and not exists (
       select 1 from public.ptest_jobs j
        where j.batch_id = sb.batch_id and j.status in ('queued', 'running', 'failed', 'cancelled'));
  get diagnostics v_closed = row_count;

  return jsonb_build_object('failed', v_failed, 'nudged', v_nudged, 'closed', v_closed, 'partial', v_partial);
end;
$$;

REVOKE ALL ON FUNCTION public.ptest_reap() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ptest_reap() TO service_role;