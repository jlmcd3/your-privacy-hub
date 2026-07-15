create table public.quality_batch_runs (
  id uuid primary key default gen_random_uuid(),
  tools text[] not null,
  batch_size int not null,
  status text not null default 'running',
  phase text not null default 'kickoff',
  current_tool_index int not null default 0,
  current_quality_run_id uuid,
  tool_results jsonb not null default '[]'::jsonb,
  cancel_requested boolean not null default false,
  last_heartbeat_at timestamptz not null default now(),
  last_error text,
  created_by uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select, insert, update, delete on public.quality_batch_runs to authenticated;
grant all on public.quality_batch_runs to service_role;
alter table public.quality_batch_runs enable row level security;
create policy "Admin quality_batch_runs" on public.quality_batch_runs for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.quality_batch_log (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_batch_runs(id) on delete cascade,
  ts timestamptz not null default now(),
  level text not null default 'info',
  tool text,
  message text not null
);
create index quality_batch_log_run_ts on public.quality_batch_log (run_id, ts);
grant select, insert, update, delete on public.quality_batch_log to authenticated;
grant all on public.quality_batch_log to service_role;
alter table public.quality_batch_log enable row level security;
create policy "Admin quality_batch_log" on public.quality_batch_log for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.quality_batch_baselines (
  tool text primary key,
  claude_score numeric,
  gpt_score numeric,
  avg_score numeric,
  captured_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quality_batch_baselines to authenticated;
grant all on public.quality_batch_baselines to service_role;
alter table public.quality_batch_baselines enable row level security;
create policy "Admin quality_batch_baselines" on public.quality_batch_baselines for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));