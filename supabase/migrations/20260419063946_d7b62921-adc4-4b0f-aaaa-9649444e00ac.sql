-- Schedule weekly Regulatory Horizon regeneration
-- Runs every Monday at 06:00 UTC, after the weekend's ingestion has settled

SELECT cron.schedule(
  'generate-horizon-intelligence-weekly',
  '0 6 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/generate-horizon-intelligence',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('admin_token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1))
  ) AS request_id;
  $$
);