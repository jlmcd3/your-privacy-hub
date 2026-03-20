
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule fetch-updates to run every 4 hours
SELECT cron.schedule(
  'fetch-updates-every-4h',
  '0 */4 * * *',
  $$
  SELECT
    net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/fetch-updates',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Schedule generate-weekly-brief every Monday at 7am UTC
SELECT cron.schedule(
  'generate-weekly-brief-monday',
  '0 7 * * 1',
  $$
  SELECT
    net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/generate-weekly-brief',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Schedule generate-custom-brief every Monday at 8am UTC (1 hour after weekly brief)
SELECT cron.schedule(
  'generate-custom-brief-monday',
  '0 8 * * 1',
  $$
  SELECT
    net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/generate-custom-brief',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.admin_secret_token')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
