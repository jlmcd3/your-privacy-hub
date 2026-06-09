DO $$ BEGIN PERFORM cron.unschedule('send-cppa-drift-reminders-daily'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'send-cppa-drift-reminders-daily',
  '0 9 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/send-cppa-drift-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  ) AS request_id;
  $job$
);