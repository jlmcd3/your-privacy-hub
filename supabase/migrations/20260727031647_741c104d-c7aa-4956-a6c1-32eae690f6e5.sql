UPDATE public.quality_batch_runs
SET status = 'cancelled',
    phase = 'done',
    cancel_requested = true,
    last_error = '[wave-c-relaunch 2026-07-27T03:20Z: never entered orchestrator loop (queued/starting >60min, current_quality_run_id NULL, 0 quality_batch_log rows); superseded by fresh Wave C launch under same spec per LTP §17 cancel-any-pre-execution rule]',
    completed_at = now()
WHERE id = '2a3c07a2-7bd3-4250-a73e-ce19ea725633'
  AND status NOT IN ('complete','failed','cancelled');

INSERT INTO public.quality_batch_runs
  (id, tools, batch_size, status, phase, instrument_version, campaign_id, created_by, concurrency)
VALUES
  ('a1b2c3d4-e5f6-4890-abcd-ef0123456789',
   ARRAY['cppa-risk']::text[],
   6,
   'running',
   'kickoff',
   'gc-2026-07-27-s6-eu-uk-ca-au-sg',
   NULL,
   '02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122',
   1);