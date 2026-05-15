create or replace function public.get_cron_jobs()
returns table(jobid bigint, jobname text, schedule text, command text, active boolean)
language sql
security definer
set search_path = public, cron
as $$
  select jobid, jobname, schedule, command, active
  from cron.job
  order by jobname;
$$;

revoke all on function public.get_cron_jobs() from public;
grant execute on function public.get_cron_jobs() to service_role;