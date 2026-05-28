SELECT cron.unschedule('track3-extract-aepd-batch1-pinned');

SELECT cron.schedule(
  'track3-extract-aepd-test5',
  '45 6 28 5 *',
  $cron$
    SELECT net.http_post(
      url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/track3-extract-orchestrator',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2a3NidHJlbHB6aGJ5ZXV0emdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxOTY3NTYsImV4cCI6MjA4ODc3Mjc1Nn0.GdklrUDyQ5g3xPw1qpxGFGJc2ICfwynP2nVegnDNZMs',
        'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ADMIN_SECRET_TOKEN' LIMIT 1)
      ),
      body := jsonb_build_object('regulator_canonical','aepd','max_rows',5),
      timeout_milliseconds := 600000
    );
  $cron$
);