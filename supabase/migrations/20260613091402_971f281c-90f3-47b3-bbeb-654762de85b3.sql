alter table public.static_stress_jobs
  add column if not exists retry_count integer not null default 0;

create index if not exists static_stress_jobs_running_started
  on public.static_stress_jobs(batch_id, status, started_at)
  where status = 'running';

alter table public.static_stress_batches
  add column if not exists error_log text;