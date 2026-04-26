
-- Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove any prior (broken) schedules for these jobs
DO $$
DECLARE j text;
BEGIN
  FOR j IN
    SELECT jobname FROM cron.job
    WHERE jobname IN (
      'generate-weekly-brief-monday',
      'generate-custom-brief-monday',
      'cron-generate-weekly-brief',
      'cron-generate-custom-brief'
    )
  LOOP
    PERFORM cron.unschedule(j);
  END LOOP;
END $$;

-- Schedule weekly brief generation every Monday at 07:00 UTC.
-- Calls the public wrapper function; the wrapper holds ADMIN_SECRET_TOKEN
-- in its env and forwards the call to generate-weekly-brief.
SELECT cron.schedule(
  'cron-generate-weekly-brief',
  '0 7 * * 1',
  $cron$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=weekly',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);

-- Schedule personalised brief generation every Monday at 08:00 UTC
SELECT cron.schedule(
  'cron-generate-custom-brief',
  '0 8 * * 1',
  $cron$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=custom',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);

-- Kick off an immediate generation so the dashboard has a current brief.
SELECT net.http_post(
  url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=weekly',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs'
  ),
  body    := '{}'::jsonb,
  timeout_milliseconds := 540000
);
