SELECT cron.schedule(
  'retry-failed-generations-every-3m',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/retry-failed-generations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);