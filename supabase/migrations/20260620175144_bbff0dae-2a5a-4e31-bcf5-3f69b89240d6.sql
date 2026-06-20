DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('cron-generate-weekly-brief');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

SELECT cron.schedule(
  'cron-generate-weekly-brief',
  '30 6 * * 1',
  $cron$
  SELECT net.http_post(
    url     := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=weekly',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 540000
  ) AS request_id;
  $cron$
);