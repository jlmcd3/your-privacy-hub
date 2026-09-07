-- lovable-cron-fallback-reviewed: 288 runs/day; bounded five-minute batch driver (6 rows/run) over the
-- finite needs_triage queue, stopped as soon as the queue drains.
SELECT cron.unschedule('corpus-triage-driver');

SELECT cron.schedule(
  'corpus-triage-driver',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/corpus-triage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'x-driver-token', (SELECT token FROM public.internal_driver_tokens WHERE name = 'corpus-triage' LIMIT 1),
      'Authorization', 'Bearer internal-driver'
    ),
    body := jsonb_build_object(
      'action', 'triage_batch',
      'run_id', 'corpus-triage-2026-09-07-r1',
      'batch_size', 6
    ),
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);