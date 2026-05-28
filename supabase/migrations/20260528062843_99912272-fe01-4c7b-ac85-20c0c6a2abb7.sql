SELECT cron.schedule(
  'track3-extract-aepd-batch1-pinned',
  '30 6 28 5 *',
  $cron$
    SELECT net.http_post(
      url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/track3-extract-orchestrator',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-admin-token', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='ADMIN_SECRET_TOKEN' LIMIT 1)
      ),
      body := jsonb_build_object('regulator_canonical','aepd','max_rows',355),
      timeout_milliseconds := 600000
    );
  $cron$
);