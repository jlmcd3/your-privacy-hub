-- lovable-cron-fallback-reviewed: 2 runs/day total; both are bounded, idempotent
-- passes over an existing corpus (screen = 300 newest rows; sync = upsert of
-- quote-verified LIA profiles).
SELECT cron.unschedule('li-tracker-ingest-screen') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'li-tracker-ingest-screen');
SELECT cron.unschedule('li-tracker-sync') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'li-tracker-sync');

SELECT cron.schedule(
  'li-tracker-ingest-screen',
  '20 5 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/sync-li-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'x-driver-token', (SELECT token FROM public.internal_driver_tokens WHERE name = 'sync-li-tracker' LIMIT 1),
      'Authorization', 'Bearer internal-driver'
    ),
    body := jsonb_build_object('action', 'screen', 'limit', 300),
    timeout_milliseconds := 300000
  ) AS request_id;
  $cron$
);

SELECT cron.schedule(
  'li-tracker-sync',
  '40 5 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/sync-li-tracker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'x-driver-token', (SELECT token FROM public.internal_driver_tokens WHERE name = 'sync-li-tracker' LIMIT 1),
      'Authorization', 'Bearer internal-driver'
    ),
    body := jsonb_build_object('action', 'sync'),
    timeout_milliseconds := 300000
  ) AS request_id;
  $cron$
);