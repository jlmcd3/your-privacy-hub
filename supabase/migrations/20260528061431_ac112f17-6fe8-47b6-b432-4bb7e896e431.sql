SELECT cron.schedule(
  'track3-extract-aepd-batch1-oneshot',
  '* * * * *',
  $cron$
  DO $body$
  DECLARE v_token text;
  BEGIN
    SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name='ADMIN_SECRET_TOKEN' LIMIT 1;
    PERFORM net.http_post(
      url:='https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/track3-extract-orchestrator',
      headers:=jsonb_build_object('Content-Type','application/json','x-admin-token', v_token),
      body:=jsonb_build_object('regulator_canonical','aepd','max_rows',355),
      timeout_milliseconds:=600000
    );
    PERFORM cron.unschedule('track3-extract-aepd-batch1-oneshot');
  END $body$;
  $cron$
);