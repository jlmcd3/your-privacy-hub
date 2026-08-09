SELECT net.http_post(
  url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/quality-batch-orchestrator',
  headers := jsonb_build_object(
    'Content-Type','application/json',
    'x-internal-cron','1',
    'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'ADMIN_SECRET_TOKEN' LIMIT 1)
  ),
  body := jsonb_build_object('action','start','tools', jsonb_build_array('cppa-risk'), 'batch_size', 1, 'concurrency', 1, 'variant','perfect'),
  timeout_milliseconds := 60000
) AS request_id;