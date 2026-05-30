-- Unschedule jobs being modified
DO $$
DECLARE
  job_names TEXT[] := ARRAY[
    'fetch-updates-every-4h',
    'cron-generate-weekly-brief',
    'ingest-gov-enforcement-weekly',
    'process-li-updates-weekly',
    'check-ingestion-health-daily'
  ];
  jn TEXT;
BEGIN
  FOREACH jn IN ARRAY job_names LOOP
    BEGIN PERFORM cron.unschedule(jn); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- fetch-updates shard 1 (odd-indexed sources): 2am, 10am, 6pm UTC
SELECT cron.schedule(
  'fetch-updates-shard1',
  '0 2,10,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-updates?shard=1&shards=2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- fetch-updates shard 2 (even-indexed sources): 6am, 2pm, 10pm UTC
SELECT cron.schedule(
  'fetch-updates-shard2',
  '0 6,14,22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/fetch-updates?shard=2&shards=2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ingest-gov-enforcement: Monday 5:00 UTC (monitor mode, before brief generation)
SELECT cron.schedule(
  'ingest-gov-enforcement-weekly',
  '0 5 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ingest-gov-enforcement?mode=monitor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- process-li-updates: Monday 5:15 UTC (after enforcement ingest, before brief)
SELECT cron.schedule(
  'process-li-updates-weekly',
  '15 5 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/process-li-updates',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- check-ingestion-health: daily at 9:00 UTC (after morning ingestion completes)
SELECT cron.schedule(
  'check-ingestion-health-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/check-ingestion-health',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);