
create table public.quality_loop2_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'running',
  phase text not null default 'kickoff',
  products jsonb not null default '[]'::jsonb,
  stress_batch_id uuid,
  cancel_requested boolean not null default false,
  last_error text,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  completed_at timestamptz,
  run_by uuid
);
grant select, insert, update, delete on public.quality_loop2_runs to authenticated;
grant all on public.quality_loop2_runs to service_role;
alter table public.quality_loop2_runs enable row level security;
create policy "Admin quality_loop2_runs" on public.quality_loop2_runs for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.quality_loop2_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_loop2_runs(id) on delete cascade,
  ts timestamptz not null default now(),
  level text not null default 'info',
  product text,
  message text not null
);
create index quality_loop2_log_run_ts on public.quality_loop2_log (run_id, ts desc);
grant select, insert, update, delete on public.quality_loop2_log to authenticated;
grant all on public.quality_loop2_log to service_role;
alter table public.quality_loop2_log enable row level security;
create policy "Admin quality_loop2_log" on public.quality_loop2_log for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.quality_loop2_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_loop2_runs(id) on delete cascade,
  product text not null,
  claude_score numeric,
  openai_score numeric,
  avg_score numeric,
  recommendation text,
  fix_location text,
  check_result_id uuid,
  quality_run_id uuid,
  updatable boolean not null default true,
  applied boolean not null default false,
  applied_branch text,
  commit_url text,
  created_at timestamptz not null default now(),
  unique(run_id, product)
);
grant select, insert, update, delete on public.quality_loop2_results to authenticated;
grant all on public.quality_loop2_results to service_role;
alter table public.quality_loop2_results enable row level security;
create policy "Admin quality_loop2_results" on public.quality_loop2_results for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

select cron.schedule(
  'ql2-watchdog-5min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://tvksbtrelpzhbyeutzgp.supabase.co/functions/v1/ql2-watchdog',
    headers := jsonb_build_object('Content-Type','application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
