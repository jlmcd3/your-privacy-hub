DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cppa-check-source-updates-weekly') THEN
    PERFORM cron.unschedule('cppa-check-source-updates-weekly');
  END IF;
END $$;

SELECT cron.schedule(
  'cppa-check-source-updates-weekly',
  '30 8 * * 1',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cppa-check-source-updates',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 540000
  );
  $job$
);