-- lovable-cron-fallback-reviewed: 288 runs/day; a stalled /all-ptest run has no other wake-up source once the admin page is closed — the worker process is already dead, so nothing in the database changes to trigger it. A periodic sweep is the only way to notice silence.
-- Server-side recovery for the /all-ptest job queue.

insert into public.internal_driver_tokens (name)
values ('ptest-driver')
on conflict (name) do nothing;

create or replace function public.ptest_reap()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_failed int := 0;
  v_nudged int := 0;
  v_closed int := 0;
  v_token  text;
  b        record;
begin
  -- 1. A worker that died mid-run with no attempts left is a failure, not a
  --    job that is still working. Record it so the batch can finish.
  update public.ptest_jobs
     set status = 'failed',
         finished_at = now(),
         error = coalesce(error, 'worker died mid-run; no result written (attempt cap reached)')
   where status = 'running'
     and heartbeat_at < now() - interval '15 minutes'
     and attempts >= max_attempts;
  get diagnostics v_failed = row_count;

  -- 2. Any batch with work left gets a tick, page open or not. The stale-
  --    heartbeat rule inside claim_ptest_job re-queues a once-dead job.
  select token into v_token from public.internal_driver_tokens where name = 'ptest-driver';
  for b in
    select distinct batch_id
      from public.ptest_jobs
     where status in ('queued', 'running')
  loop
    perform net.http_post(
      url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ptest-run-driver',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-cron', '1',
        'x-driver-token', v_token,
        'Authorization', 'Bearer internal-driver'
      ),
      body := jsonb_build_object('action', 'tick', 'batch_id', b.batch_id),
      timeout_milliseconds := 30000
    );
    v_nudged := v_nudged + 1;
  end loop;

  -- 3. A batch whose jobs have all finished is complete, whatever the page did.
  update public.ptest_batches sb
     set status = 'complete'
   where sb.status = 'running'
     and exists (select 1 from public.ptest_jobs j where j.batch_id = sb.batch_id)
     and not exists (
       select 1 from public.ptest_jobs j
        where j.batch_id = sb.batch_id and j.status in ('queued', 'running'));
  get diagnostics v_closed = row_count;

  return jsonb_build_object('failed', v_failed, 'nudged', v_nudged, 'closed', v_closed);
end;
$$;

revoke all on function public.ptest_reap() from public, anon, authenticated;
grant execute on function public.ptest_reap() to service_role;

select cron.unschedule('ptest-reaper-every-5m')
 where exists (select 1 from cron.job where jobname = 'ptest-reaper-every-5m');

select cron.schedule('ptest-reaper-every-5m', '*/5 * * * *', $$select public.ptest_reap();$$);