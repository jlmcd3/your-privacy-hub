select cron.schedule('item-ab-dpia-verify2', '* * * * *', $$
select net.http_post(
  url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/quality-batch-orchestrator',
  headers := jsonb_build_object('Content-Type','application/json','x-internal-cron','1','Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)),
  body := jsonb_build_object('action','start','tools', jsonb_build_array('dpia'), 'batch_size', 1, 'ab_models', true)
);
$$);