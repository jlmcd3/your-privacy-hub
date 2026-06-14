CREATE OR REPLACE FUNCTION public.stress_batch_watchdog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_token text;
  v_batch record;
  v_fired int := 0;
  v_reset int := 0;
  v_last_activity timestamptz;
  v_pending int;
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets
   where name = 'ADMIN_SECRET_TOKEN'
   limit 1;

  if v_token is null or v_token = '' then
    return jsonb_build_object('error','ADMIN_SECRET_TOKEN missing');
  end if;

  for v_batch in
    select id from public.static_stress_batches
     where status = 'running'
  loop
    -- Reset any "running" jobs that have been stuck >5 minutes back to pending
    with reset as (
      update public.static_stress_jobs
         set status = 'pending', started_at = null, error_message = 'reset by watchdog (stuck >5m)'
       where batch_id = v_batch.id
         and status = 'running'
         and started_at < now() - interval '5 minutes'
       returning 1
    )
    select count(*) into v_pending from reset;
    v_reset := v_reset + v_pending;

    select count(*) into v_pending
      from public.static_stress_jobs
     where batch_id = v_batch.id and status = 'pending';

    if v_pending = 0 then
      -- batch is drained; let run-stress-job's finalise logic mark it complete next tick
      continue;
    end if;

    select greatest(
             coalesce(max(started_at),   'epoch'::timestamptz),
             coalesce(max(completed_at), 'epoch'::timestamptz)
           )
      into v_last_activity
      from public.static_stress_jobs
     where batch_id = v_batch.id;

    if v_last_activity is null or v_last_activity < now() - interval '2 minutes' then
      -- Fire 4 parallel workers to drain the backlog faster
      for i in 1..4 loop
        perform net.http_post(
          url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/run-stress-job',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_token,
            'x-admin-token', v_token
          ),
          body := jsonb_build_object('batch_id', v_batch.id),
          timeout_milliseconds := 5000
        );
      end loop;
      v_fired := v_fired + 4;
    end if;
  end loop;

  return jsonb_build_object('fired', v_fired, 'reset', v_reset, 'checked_at', now());
end;
$function$;