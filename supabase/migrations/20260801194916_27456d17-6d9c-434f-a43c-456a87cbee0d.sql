select cron.schedule(
  'item349-smoke-kick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/run-stress-job',
    headers := jsonb_build_object('Content-Type','application/json','x-admin-token',(select decrypted_secret from vault.decrypted_secrets where name='ADMIN_SECRET_TOKEN')),
    body := jsonb_build_object('batch_id','a3490000-0000-4000-8000-000000000349')
  );
  $$
);