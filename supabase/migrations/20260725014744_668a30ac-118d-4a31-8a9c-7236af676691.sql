DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delivery-sentinel-sweep') THEN
    PERFORM cron.unschedule('delivery-sentinel-sweep');
  END IF;
END $$;

SELECT cron.schedule(
  'delivery-sentinel-sweep',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/delivery-sentinel',
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
    body := '{"source":"pg_cron"}'::jsonb,
    timeout_milliseconds := 45000
  ) as request_id;
  $cron$
);