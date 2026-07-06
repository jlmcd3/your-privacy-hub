SELECT net.http_post(
  url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/cron-generate-briefs?target=weekly',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 540000
) AS catchup_request_id;