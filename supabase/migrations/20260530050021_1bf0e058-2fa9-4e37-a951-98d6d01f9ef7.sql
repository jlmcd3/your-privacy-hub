-- Unschedule if pre-existing
DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('batch-fetch-primary-sources-monday'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('enrich-enforcement-monday'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

SELECT cron.schedule(
  'batch-fetch-primary-sources-monday',
  '45 5 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/batch-fetch-primary-sources?limit=30',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets
                        WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'enrich-enforcement-monday',
  '15 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/enrich-enforcement?limit=50',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $$
);