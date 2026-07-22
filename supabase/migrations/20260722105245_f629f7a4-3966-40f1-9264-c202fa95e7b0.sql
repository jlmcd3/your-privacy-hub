CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'quality-campaign-tick') THEN
    PERFORM cron.unschedule('quality-campaign-tick');
  END IF;
END $$;

SELECT cron.schedule(
  'quality-campaign-tick',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/quality-batch-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'ADMIN_SECRET_TOKEN'
        LIMIT 1
      )
    ),
    body := '{"action":"campaign_tick"}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $cron$
);