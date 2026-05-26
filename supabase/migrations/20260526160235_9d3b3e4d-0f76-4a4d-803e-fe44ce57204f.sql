
-- Trigger function: queue new rows for verification.
CREATE OR REPLACE FUNCTION public.trigger_new_row_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.verification_queue (enforcement_action_id, queued_at, priority)
  VALUES (NEW.id, now(), 'new_row')
  ON CONFLICT (enforcement_action_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforcement_action_new_row_verify ON public.enforcement_actions;
CREATE TRIGGER enforcement_action_new_row_verify
AFTER INSERT ON public.enforcement_actions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_new_row_verification();

-- Hourly cron: drain the verification queue.
-- Uses hardcoded function URL per project memory.
DO $$
DECLARE
  _jobid bigint;
BEGIN
  SELECT jobid INTO _jobid FROM cron.job WHERE jobname = 'verification-queue-drain';
  IF _jobid IS NOT NULL THEN
    PERFORM cron.unschedule(_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'verification-queue-drain',
  '15 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/verification-queue-drain',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );
  $cron$
);
