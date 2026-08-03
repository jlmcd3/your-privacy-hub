SELECT cron.schedule(
  'item355-cached-sweep-driver',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/verification-scan',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-cron', '1',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body := '{"mode":"cached","resume":true,"sweep_id":"item355-cached-sweep","batch_size":12,"budget_cap_usd":250}'::jsonb,
    timeout_milliseconds := 300000
  ) as request_id;
  $$
);